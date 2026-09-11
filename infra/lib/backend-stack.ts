import * as path from "path";
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns";
import * as elbv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cloudwatch from "aws-cdk-lib/aws-cloudwatch";
import * as cwActions from "aws-cdk-lib/aws-cloudwatch-actions";
import * as sns from "aws-cdk-lib/aws-sns";
import * as snsSubscriptions from "aws-cdk-lib/aws-sns-subscriptions";

export interface BackendStackProps extends cdk.StackProps {
  // "prod" | "dev" など。スタック名・シークレット名の分離に使う（infra/bin/infra.ts参照）
  stage: string;
}

/**
 * back（Hono API）を ECS Fargate + ALB で常駐起動するスタック。
 * stageごと（prod/dev）に別スタックとしてデプロイされ、VPC・ECSクラスタ・ALB・シークレットは
 * 完全に独立する。dev への変更が prod に影響することはない。
 *
 * 前提・仮の値（実際の運用開始前に見直すこと）:
 * - DB(Postgres)・Redisは本スタックでは作成しない。DATABASE_URL / REDIS_URL で
 *   外部のマネージドサービスに接続する前提（back/src/db の SSL 設定が本番想定）。
 * - VPCは新規作成・NATゲートウェイなし（コスト最小化のため、タスクはパブリックサブネットに
 *   パブリックIPを持たせて配置）。DBがVPC外にある間はこれで動くが、将来RDS等をVPC内に
 *   置く場合はプライベートサブネット + NATゲートウェイに切り替えること。
 * - 機微な環境変数は Secrets Manager のシークレット1つにJSONでまとめて格納する想定。
 *   デプロイ前に stageごとの `blazeapp/backend-{stage}`（例: blazeapp/backend-prod,
 *   blazeapp/backend-dev）という名前のシークレットを手動作成し、下記 SECRET_ENV_KEYS の
 *   キーを持つJSONを値として登録しておくこと。
 */
export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);
    const { stage } = props;

    // back/src が process.env から読む値のうち、機微情報として扱うキー
    // （Secrets Manager 側にこの名前のキーを用意しておく）
    const SECRET_ENV_KEYS = [
      "DATABASE_URL",
      "REDIS_URL",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_S3_BUCKET",
      "RESEND_API_KEY",
    ] as const;

    // 非機微な設定値。CDKデプロイ時に -c corsOrigin=... 等で必ず指定する。
    // 指定し忘れてダミードメインのままデプロイされる（CORSエラーやメール内リンク破損に繋がる）のを防ぐため、
    // 未指定ならここでデプロイを止める。
    const requireContext = (key: string): string => {
      const value = this.node.tryGetContext(key);
      if (typeof value !== "string" || value.length === 0) {
        throw new Error(
          `-c ${key}=... の指定が必要です（例: npx cdk deploy -c ${key}=https://example.com -c stage=${stage}）`,
        );
      }
      return value;
    };
    const corsOrigin = requireContext("corsOrigin");
    const frontendUrl = requireContext("frontendUrl");
    const mailFrom = requireContext("mailFrom");

    // 体験申し込みの管理者通知メールの宛先（カンマ区切りで複数可）。
    // 未指定でもデプロイは通すが、その場合は通知メールが送られないので警告を出す。
    const trialNotificationEmail =
      (this.node.tryGetContext("trialNotificationEmail") as string | undefined) ?? "";
    if (trialNotificationEmail.length === 0) {
      cdk.Annotations.of(this).addWarningV2(
        "blazeapp:trialNotificationEmail",
        "-c trialNotificationEmail=... が未指定です。体験申し込みの管理者通知メールは送信されません。",
      );
    }

    // 監視アラートの通知先（カンマ区切りで複数可）。
    // アプリのメール送信（Resend）は使わない。知らせたい障害の多くは「アプリ自身が動かない障害」で、
    // アプリ経由の通知は同時に沈むため（docs/backup-design.md 13-1 #1 と同じ方針）。
    const alertEmail =
      (this.node.tryGetContext("alertEmail") as string | undefined) ?? "";
    const alertEmails = alertEmail
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    if (alertEmails.length === 0) {
      // 本番は拒否する。通知先の無いアラームは「鳴っているのに誰も知らない」状態を作るだけで、
      // 監視があるという誤った安心だけが残る。CDK の警告はデプロイのログに流れて見落とされるため、
      // ここで止める（開発スタックは通知先無しでも困らないので警告のまま）。
      if (stage === "prod") {
        throw new Error(
          "本番スタックには -c alertEmail=... が必須です。" +
            "通知先が無いとアラームが鳴っても誰にも届きません。" +
            "GitHub の Actions Variables に PROD_ALERT_EMAIL を設定してください（カンマ区切りで複数可）。",
        );
      }
      cdk.Annotations.of(this).addWarningV2(
        "blazeapp:alertEmail",
        "-c alertEmail=... が未指定です。アラームは作成されますが、鳴っても誰にも通知されません。",
      );
    }

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
      ],
    });

    const cluster = new ecs.Cluster(this, "Cluster", { vpc });

    // デプロイ前に手動作成しておく前提のシークレット（stageごとに別シークレット）
    const appSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      "AppSecret",
      `blazeapp/backend-${stage}`,
    );

    // アプリのログ出力先。
    // 以前は logDriver の logRetention に任せていたが、メトリクスフィルタ（＝アラームの元）を
    // 張るにはロググループの参照が要るため明示的に作成する。
    // 保持期間: prod は1ヶ月（不正アクセスの調査は数週間後に始まることがある）、dev は2週間。
    // prod のログは事故調査の一次資料なので、スタックを消しても残す。
    const logGroup = new logs.LogGroup(this, "BackendLogGroup", {
      logGroupName: `/blazeapp/backend-${stage}`,
      retention:
        stage === "prod" ? logs.RetentionDays.ONE_MONTH : logs.RetentionDays.TWO_WEEKS,
      removalPolicy:
        stage === "prod" ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      "BackendService",
      {
        cluster,
        cpu: 512,
        memoryLimitMiB: 1024,
        desiredCount: 1,
        publicLoadBalancer: true,
        assignPublicIp: true,
        taskSubnets: { subnetType: ec2.SubnetType.PUBLIC },
        listenerPort: 80,
        taskImageOptions: {
          // back/Dockerfile からビルド（`cdk deploy` 実行時にDockerビルド＋ECRアセット登録まで行う）
          image: ecs.ContainerImage.fromAsset(path.join(__dirname, "../../back")),
          containerPort: 8080,
          environment: {
            NODE_ENV: "production",
            PORT: "8080",
            AWS_REGION: this.region,
            CORS_ORIGIN: corsOrigin,
            FRONTEND_URL: frontendUrl,
            MAIL_FROM: mailFrom,
            TRIAL_NOTIFICATION_EMAIL: trialNotificationEmail,
          },
          secrets: Object.fromEntries(
            SECRET_ENV_KEYS.map((key) => [
              key,
              ecs.Secret.fromSecretsManager(appSecret, key),
            ]),
          ),
          logDriver: ecs.LogDrivers.awsLogs({
            streamPrefix: "backend",
            logGroup,
          }),
        },
      },
    );

    // ALBのヘルスチェックは /health を見る（back/src/app.ts 参照）
    service.targetGroup.configureHealthCheck({
      path: "/health",
      healthyHttpCodes: "200",
    });

    // -----------------------------------------------------------------------
    // 監視（エラー監視・不正アクセス検知）
    //
    // 仕組みは3段。
    //   1. アプリが構造化ログ（JSON 1行）を stdout に出す      → back/src/utils/monitoring.ts
    //   2. メトリクスフィルタがログを数えてメトリクスにする    → 下の securityMetric()
    //   3. アラームが閾値超えを検知して SNS でメールを飛ばす   → 下の alarm()
    //
    // アラームは「ログ」ではなく「メトリクス（時間あたりの数）」にしか張れない。
    // ログを人間が読んで気づく運用は成立しないため、この変換が監視の要になる。
    // -----------------------------------------------------------------------

    const alertTopic = new sns.Topic(this, "AlertTopic", {
      topicName: `blazeapp-alerts-${stage}`,
      displayName: `blazeapp ${stage} alerts`,
    });
    for (const email of alertEmails) {
      // 登録すると各アドレスに確認メールが届く。受信者が承認するまで通知は届かない
      alertTopic.addSubscription(new snsSubscriptions.EmailSubscription(email));
    }

    const METRIC_NAMESPACE = `BlazeApp/${stage}`;

    /**
     * ログの JSON を数えるメトリクスを作る。
     * filterPattern のフィールド名は back/src/utils/monitoring.ts の出力と対になっている。
     * どちらか片方だけ変えるとアラームが「静かに」鳴らなくなるので、必ず両方を揃えること。
     */
    const logMetric = (
      id: string,
      metricName: string,
      pattern: logs.IFilterPattern,
    ): cloudwatch.Metric => {
      new logs.MetricFilter(this, id, {
        logGroup,
        filterPattern: pattern,
        metricNamespace: METRIC_NAMESPACE,
        metricName,
        metricValue: "1",
        // 該当ログが無い時間帯も 0 として記録する。これが無いと「データ無し」になり、
        // アラームが INSUFFICIENT_DATA のまま評価されない
        defaultValue: 0,
      });

      return new cloudwatch.Metric({
        namespace: METRIC_NAMESPACE,
        metricName,
        statistic: "Sum",
        period: cdk.Duration.minutes(5),
      });
    };

    /** SECURITY_EVENT のうち、指定した kind を数えるパターン */
    const securityEvent = (...kinds: string[]): logs.IFilterPattern =>
      logs.FilterPattern.all(
        logs.FilterPattern.stringValue("$.type", "=", "SECURITY_EVENT"),
        logs.FilterPattern.any(
          ...kinds.map((kind) => logs.FilterPattern.stringValue("$.kind", "=", kind)),
        ),
      );

    const alarm = (
      id: string,
      props: {
        metric: cloudwatch.IMetric;
        threshold: number;
        evaluationPeriods?: number;
        description: string;
      },
    ): cloudwatch.Alarm => {
      const created = new cloudwatch.Alarm(this, id, {
        alarmName: `blazeapp-${stage}-${id}`,
        alarmDescription: props.description,
        metric: props.metric,
        threshold: props.threshold,
        evaluationPeriods: props.evaluationPeriods ?? 1,
        comparisonOperator:
          cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
        // データが無い＝異常が無いとみなす（アクセスの少ない時間帯に誤報を出さないため）
        treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
      });
      created.addAlarmAction(new cwActions.SnsAction(alertTopic));
      return created;
    };

    // --- エラー監視 ---

    const appErrors = logMetric(
      "AppErrorFilter",
      "AppErrors",
      logs.FilterPattern.stringValue("$.type", "=", "APP_ERROR"),
    );
    // 未捕捉例外は「起きてはいけないこと」なので1件で通知する。
    // 鳴りすぎるなら閾値ではなくバグを直すのが正しい対応
    alarm("AppErrorAlarm", {
      metric: appErrors,
      threshold: 1,
      description:
        "アプリ内で未捕捉の例外が発生した。CloudWatch Logs Insights で type=APP_ERROR を requestId で追うこと",
    });

    // --- 不正アクセス検知 ---
    //
    // いずれも「正常な利用では起きない回数」を閾値にしている。
    // 運用開始後1〜2週間の実測値を見て、誤報が出るなら上げ、静かすぎるなら下げること。

    alarm("LoginFailureAlarm", {
      metric: logMetric(
        "LoginFailureFilter",
        "LoginFailures",
        securityEvent("login_failed"),
      ),
      // 人間の打ち間違いは5分で20回に届かない。届くならスクリプトによる総当たり
      threshold: 20,
      description:
        "ログイン失敗が5分間に20件を超えた。パスワード総当たりの疑い。ログの actor（メールのハッシュ）と ip で、単一アカウント狙いか総当たりかを見分けること",
    });

    alarm("InvalidTokenAlarm", {
      metric: logMetric(
        "InvalidTokenFilter",
        "InvalidTokens",
        securityEvent("token_invalid"),
      ),
      // 期限切れによる自然発生もあるが、5分で30件は正常な利用では起きない
      threshold: 30,
      description:
        "無効な認証トークンでのアクセスが5分間に30件を超えた。トークンの推測・使い回しの疑い",
    });

    alarm("ForbiddenAlarm", {
      metric: logMetric(
        "ForbiddenFilter",
        "ForbiddenRequests",
        securityEvent("forbidden", "csrf_rejected"),
      ),
      // 正しく作られたフロントは権限の無いAPIを叩かない。continuous な403は権限昇格の試行
      threshold: 20,
      description:
        "権限不足・CSRF拒否が5分間に20件を超えた。ログイン済みユーザーによる権限昇格の試行、または他サイトからのCSRFの疑い。userId で誰かを特定できる",
    });

    alarm("RateLimitAlarm", {
      metric: logMetric(
        "RateLimitFilter",
        "RateLimited",
        securityEvent("rate_limited"),
      ),
      // レートリミットに当たっている時点で、既に何かが異常な頻度で叩かれている
      threshold: 10,
      description:
        "レートリミットによる拒否が5分間に10件を超えた。総当たりか、フロント側の無限リトライを疑うこと",
    });

    alarm("ProbeAlarm", {
      metric: logMetric("ProbeFilter", "Probes", securityEvent("probe")),
      // 脆弱性スキャナは数百パスを一気に舐める。通常の404は数件で収まる
      threshold: 50,
      description:
        "存在しないパスへのアクセスが5分間に50件を超えた。脆弱性スキャンの疑い。実害が無くても発生源のIPは記録しておくこと",
    });

    // --- 可用性の監視（アプリが返せていない状態の検知） ---

    alarm("Target5xxAlarm", {
      metric: service.targetGroup.metrics.httpCodeTarget(
        elbv2.HttpCodeTarget.TARGET_5XX_COUNT,
        { period: cdk.Duration.minutes(5), statistic: "Sum" },
      ),
      threshold: 5,
      description: "バックエンドが5xxを返している。APP_ERROR のログと突き合わせること",
    });

    alarm("Elb5xxAlarm", {
      metric: service.loadBalancer.metrics.httpCodeElb(
        elbv2.HttpCodeElb.ELB_5XX_COUNT,
        { period: cdk.Duration.minutes(5), statistic: "Sum" },
      ),
      threshold: 5,
      description:
        "ALB自身が5xxを返している。ECSタスクが1つも応答していない可能性が高い（アプリのログには何も残らない）",
    });

    // ヘルスチェックに失敗したタスクの数。アプリが起動できていない状態を検知する最後の砦
    const unhealthyHosts = service.targetGroup.metrics.unhealthyHostCount({
      period: cdk.Duration.minutes(1),
      statistic: "Maximum",
    });
    const unhealthyAlarm = new cloudwatch.Alarm(this, "UnhealthyHostAlarm", {
      alarmName: `blazeapp-${stage}-UnhealthyHostAlarm`,
      alarmDescription:
        "ヘルスチェックに失敗しているタスクがある。マイグレーション失敗やDB接続不能で起動できていない可能性",
      metric: unhealthyHosts,
      threshold: 1,
      // 一時的なデプロイ中の入れ替わりで鳴らないよう、3分続いた場合のみ
      evaluationPeriods: 3,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    unhealthyAlarm.addAlarmAction(new cwActions.SnsAction(alertTopic));
    // 復旧したことも知りたいので、この1件だけはOK通知も送る
    unhealthyAlarm.addOkAction(new cwActions.SnsAction(alertTopic));

    // --- 調査用ダッシュボード ---
    // アラームが鳴ったあと「今どうなっているか」を1画面で見るための場所。
    // 予防的に眺めるものではなく、通知を受けてから開くもの
    new cloudwatch.Dashboard(this, "Dashboard", {
      dashboardName: `blazeapp-${stage}`,
      widgets: [
        [
          new cloudwatch.GraphWidget({
            title: "エラー / 5xx",
            left: [
              appErrors,
              service.targetGroup.metrics.httpCodeTarget(
                elbv2.HttpCodeTarget.TARGET_5XX_COUNT,
                { period: cdk.Duration.minutes(5), statistic: "Sum" },
              ),
            ],
            width: 12,
          }),
          new cloudwatch.GraphWidget({
            title: "不正アクセスの兆候",
            left: [
              new cloudwatch.Metric({
                namespace: METRIC_NAMESPACE,
                metricName: "LoginFailures",
                statistic: "Sum",
                period: cdk.Duration.minutes(5),
              }),
              new cloudwatch.Metric({
                namespace: METRIC_NAMESPACE,
                metricName: "InvalidTokens",
                statistic: "Sum",
                period: cdk.Duration.minutes(5),
              }),
              new cloudwatch.Metric({
                namespace: METRIC_NAMESPACE,
                metricName: "ForbiddenRequests",
                statistic: "Sum",
                period: cdk.Duration.minutes(5),
              }),
              new cloudwatch.Metric({
                namespace: METRIC_NAMESPACE,
                metricName: "Probes",
                statistic: "Sum",
                period: cdk.Duration.minutes(5),
              }),
            ],
            width: 12,
          }),
        ],
        [
          new cloudwatch.GraphWidget({
            title: "応答時間 / リクエスト数",
            left: [
              service.targetGroup.metrics.targetResponseTime({
                period: cdk.Duration.minutes(5),
                statistic: "p95",
              }),
            ],
            right: [
              service.loadBalancer.metrics.requestCount({
                period: cdk.Duration.minutes(5),
              }),
            ],
            width: 12,
          }),
          new cloudwatch.GraphWidget({
            title: "タスクの状態",
            left: [
              service.service.metricCpuUtilization({
                period: cdk.Duration.minutes(5),
              }),
              service.service.metricMemoryUtilization({
                period: cdk.Duration.minutes(5),
              }),
            ],
            right: [unhealthyHosts],
            width: 12,
          }),
        ],
      ],
    });

    // S3クライアントを task role のIAM権限で動かす場合の受け皿（推奨の移行先）。
    // 現状の back/src/db/s3.ts は AWS_ACCESS_KEY_ID/SECRET を明示指定しているため、
    // 移行するまではこの権限は使われないが、切り替え時に困らないよう先に付与しておく。
    // 実際のバケット名が確定したら bucketArn を差し替えること。
    // service.taskDefinition.taskRole.addToPrincipalPolicy(...)

    new cdk.CfnOutput(this, "AlertTopicArn", {
      value: alertTopic.topicArn,
      description:
        "監視アラートのSNSトピック。宛先を後から足す場合は aws sns subscribe --topic-arn <この値> --protocol email --notification-endpoint you@example.com",
    });

    new cdk.CfnOutput(this, "LogGroupName", {
      value: logGroup.logGroupName,
      description: "アプリのログ。CloudWatch Logs Insights で調査するときのロググループ名",
    });

    new cdk.CfnOutput(this, "LoadBalancerDNS", {
      value: service.loadBalancer.loadBalancerDnsName,
      description: "この値を front の NEXT_PUBLIC_API_URL / CORS_ORIGIN の設定に使う",
    });
  }
}
