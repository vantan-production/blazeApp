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
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as iam from "aws-cdk-lib/aws-iam";
import * as kms from "aws-cdk-lib/aws-kms";
import * as rds from "aws-cdk-lib/aws-rds";
import * as events from "aws-cdk-lib/aws-events";
import * as eventsTargets from "aws-cdk-lib/aws-events-targets";

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
 *
 * 段階的に有効にする設定（-c で渡したときだけ効く。未指定なら従来どおりの構成のまま）:
 * - certificateArn / apiDomainName: ALB を HTTPS にし、80番は443へリダイレクトする
 * - storageBucket: S3 をアクセスキーではなく ECS タスクロールで使う
 * - backupBucket: pg_dump の毎時バックアップ（復元検証つき）を動かす
 * - manageDatabase: この VPC 内に非公開の RDS を stage ごとに作る（prod/dev の分離）
 * 詳しい切り替え手順は docs/infra-hardening.md を参照。
 */
export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: BackendStackProps) {
    super(scope, id, props);
    const { stage } = props;

    // back/src が process.env から読む値のうち、機微情報として扱うキー
    // （Secrets Manager 側にこの名前のキーを用意しておく）
    // storageBucket を指定したら S3 はタスクロールで使うため、アクセスキーとバケット名はシークレットから読まない
    // （キーが入ったままでも読まなければ使われない。切り替えが済んだらシークレットからも消し、IAM のキーを無効化する）
    const storageBucketName = this.node.tryGetContext("storageBucket") as
      | string
      | undefined;
    const SECRET_ENV_KEYS = [
      "DATABASE_URL",
      "REDIS_URL",
      ...(storageBucketName
        ? []
        : (["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_S3_BUCKET"] as const)),
      "RESEND_API_KEY",
    ];
    if (!storageBucketName) {
      cdk.Annotations.of(this).addWarningV2(
        "blazeapp:storageBucket",
        "-c storageBucket=... が未指定です。S3 はシークレットのアクセスキーで使われます（タスクロールへの移行が未了）。",
      );
    }

    // HTTPS（ALB に ACM 証明書を付ける）。証明書は ALB と同じリージョン（ap-northeast-1）で発行しておくこと。
    // 本番はログインの Cookie（Secure 属性）が HTTPS でしか送られないため、未設定だとログインできない
    const certificateArn = this.node.tryGetContext("certificateArn") as
      | string
      | undefined;
    const apiDomainName = this.node.tryGetContext("apiDomainName") as
      | string
      | undefined;
    // Route 53 で管理しているドメインなら、API のレコード（ALB へのエイリアス）も作る。
    // 他社の DNS を使う場合は省略し、出力の LoadBalancerDNS へ CNAME を手で向ける
    const hostedZoneId = this.node.tryGetContext("hostedZoneId") as
      | string
      | undefined;
    const hostedZoneName = this.node.tryGetContext("hostedZoneName") as
      | string
      | undefined;
    if (certificateArn && !apiDomainName) {
      throw new Error(
        "-c certificateArn を指定するときは -c apiDomainName=api.example.com も指定してください（証明書のドメインと合わせる）",
      );
    }
    if (!certificateArn) {
      cdk.Annotations.of(this).addWarningV2(
        "blazeapp:certificateArn",
        "-c certificateArn=... が未指定です。ALB は HTTP（80番）のみで、本番ではログイン Cookie が送られません。",
      );
    }

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

    // この VPC 内に RDS を作るか（docs/backup-design.md 9-1・9-2）。
    // 作ると DB はインターネットから到達できず、ECS タスクと pg_dump タスクの SG からだけ繋がる
    const manageDatabase = this.node.tryGetContext("manageDatabase") === "true";

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        // DB 用。インターネットへの経路を持たないサブネット（NAT 不要）。
        // 後ろに足すだけなので、既存の public サブネットの CIDR は変わらない
        ...(manageDatabase
          ? [
              {
                name: "database",
                subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                cidrMask: 24,
              },
            ]
          : []),
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
        ...(certificateArn
          ? {
              protocol: elbv2.ApplicationProtocol.HTTPS,
              listenerPort: 443,
              certificate: acm.Certificate.fromCertificateArn(
                this,
                "ApiCertificate",
                certificateArn,
              ),
              sslPolicy: elbv2.SslPolicy.RECOMMENDED_TLS,
              // 80番に来たものは443へ恒久リダイレクトする
              redirectHTTP: true,
              // domainName は Route 53 のゾーンとセットでしか渡せない（パターンがレコードを作るため）
              ...(apiDomainName && hostedZoneId && hostedZoneName
                ? {
                    domainName: apiDomainName,
                    domainZone: route53.HostedZone.fromHostedZoneAttributes(
                      this,
                      "HostedZone",
                      { hostedZoneId, zoneName: hostedZoneName },
                    ),
                  }
                : {}),
            }
          : { listenerPort: 80 }),
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
            ...(storageBucketName ? { AWS_S3_BUCKET: storageBucketName } : {}),
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

    // --- S3（画像・動画・ファイル）をタスクロールで使う ---
    // back/src/db/s3.ts はアクセスキーの環境変数が無ければ既定の認証情報チェーン（＝このロール）を使う。
    // 一時認証情報は自動で更新されるため、漏れても長くは使えない
    if (storageBucketName) {
      // アップロード・取得（署名付きURL）・削除だけ。バケット設定の変更や一覧、
      // バージョン指定の削除（＝バージョニングによる救済を消す操作）は許さない
      service.taskDefinition.taskRole.addToPrincipalPolicy(
        new iam.PolicyStatement({
          actions: ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
          resources: [`arn:aws:s3:::${storageBucketName}/*`],
        }),
      );
    }

    // --- DB（この VPC 内の非公開 RDS） ---
    // 暗号化キー（CMK）は DB より先に用意できるよう別のフラグでも作れるようにする。
    // 既存 DB を移すときは「キーだけ作る → スナップショットをこのキーでコピー → そのコピーから DB を作る」の順になるため
    // （スナップショットから作る DB の暗号化キーはスナップショットのものを引き継ぎ、後から変えられない）
    const databaseKey =
      manageDatabase || this.node.tryGetContext("databaseKey") === "true"
        ? this.createDatabaseKey(stage)
        : undefined;
    let database: rds.DatabaseInstance | rds.DatabaseInstanceFromSnapshot | undefined;
    if (manageDatabase && databaseKey) {
      database = this.createDatabase(
        stage,
        vpc,
        databaseKey,
        service.service.connections,
      );
    }

    // --- DB の論理バックアップ（pg_dump を毎時。docs/backup-design.md 5-2・T4） ---
    const backupBucketName = this.node.tryGetContext("backupBucket") as
      | string
      | undefined;
    if (backupBucketName) {
      this.createDbBackup({
        stage,
        cluster,
        appSecret,
        backupBucketName,
        alertTopic,
        database,
        metricNamespace: METRIC_NAMESPACE,
      });
    } else if (stage === "prod") {
      cdk.Annotations.of(this).addWarningV2(
        "blazeapp:backupBucket",
        "-c backupBucket=... が未指定です。DB の定期バックアップ（pg_dump）は動きません。",
      );
    }

    if (databaseKey) {
      new cdk.CfnOutput(this, "DatabaseKeyArn", {
        value: databaseKey.keyArn,
        description:
          "RDS の暗号化キー。既存 DB のスナップショットを aws rds copy-db-snapshot --kms-key-id <この値> で再暗号化してから dbSnapshotId に渡す",
      });
    }

    if (database) {
      new cdk.CfnOutput(this, "DatabaseEndpoint", {
        value: database.dbInstanceEndpointAddress,
        description:
          "CDK が管理する RDS のエンドポイント。データを移したら blazeapp/backend-{stage} の DATABASE_URL をこのホストに書き換える",
      });
      if (database.secret) {
        new cdk.CfnOutput(this, "DatabaseSecretName", {
          value: database.secret.secretName,
          description: "RDS のマスターユーザーの認証情報（自動生成）",
        });
      }
    }

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

    if (apiDomainName && certificateArn) {
      new cdk.CfnOutput(this, "ApiUrl", {
        value: `https://${apiDomainName}`,
        description:
          "front の NEXT_PUBLIC_API_BASE_URL に設定する値。Route 53 以外の DNS なら、このホスト名を LoadBalancerDNS へ CNAME で向けること",
      });
    }
  }

  /**
   * stage 専用の RDS PostgreSQL を作る（docs/backup-design.md 9-1・9-2）。
   * - VPC の isolated サブネットに置き、パブリックアクセスは不可
   * - ECS サービスからだけ 5432 を許可する（pg_dump タスクは createDbBackup で許可を足す）
   * - カスタマー管理キー（CMK）で暗号化する。スナップショットを別アカウント・別リージョンへ
   *   持ち出せるようにするため（AWS マネージドキーでは共有できない。設計書 4-3）
   * - -c dbSnapshotId=... を渡すと、そのスナップショット（既存 DB を DatabaseKey で再暗号化したコピー）から作る
   */
  private createDatabaseKey(stage: string): kms.Key {
    return new kms.Key(this, "DatabaseKey", {
      alias: `alias/blazeapp-db-${stage}`,
      description: `blazeapp ${stage} の RDS 暗号化キー`,
      enableKeyRotation: true,
      // キーを消すとスナップショットも読めなくなるため、スタックを消しても残す
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }

  private createDatabase(
    stage: string,
    vpc: ec2.IVpc,
    key: kms.IKey,
    appConnections: ec2.Connections,
  ): rds.DatabaseInstance | rds.DatabaseInstanceFromSnapshot {
    const isProd = stage === "prod";

    const securityGroup = new ec2.SecurityGroup(this, "DatabaseSecurityGroup", {
      vpc,
      description: `blazeapp ${stage} RDS（ECS タスクからのみ接続可）`,
      allowAllOutbound: false,
    });

    const common = {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_18,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO,
      ),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [securityGroup],
      publiclyAccessible: false,
      multiAz: false,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      // 設計書 5-1: prod は7日（PITR）、dev は最低限の1日
      backupRetention: cdk.Duration.days(isProd ? 7 : 1),
      preferredBackupWindow: "19:00-19:30", // JST 04:00-04:30
      preferredMaintenanceWindow: "thu:20:00-thu:20:30", // JST 木 05:00-05:30
      copyTagsToSnapshot: true,
      deletionProtection: isProd,
      // スタックから外れたり置き換わったりしても、最後のスナップショットは残す
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
      autoMinorVersionUpgrade: true,
      // RDS 側でも TLS 以外の接続を拒否する（アプリは証明書検証つきで接続する。back/src/db/ssl.ts）
      parameterGroup: new rds.ParameterGroup(this, "DatabaseParameters", {
        engine: rds.DatabaseInstanceEngine.postgres({
          version: rds.PostgresEngineVersion.VER_18,
        }),
        parameters: { "rds.force_ssl": "1" },
      }),
    };

    const snapshotId = this.node.tryGetContext("dbSnapshotId") as
      | string
      | undefined;
    const database = snapshotId
      ? new rds.DatabaseInstanceFromSnapshot(this, "Database", {
          ...common,
          // 暗号化はスナップショットのキーを引き継ぐ。必ず DatabaseKey で再暗号化したコピーを渡すこと
          snapshotIdentifier: snapshotId,
          // スナップショットのマスターパスワードは引き継がず、新しく生成して Secrets Manager に置く
          credentials: rds.SnapshotCredentials.fromGeneratedSecret("postgres"),
        })
      : new rds.DatabaseInstance(this, "Database", {
          ...common,
          databaseName: "blazeapp",
          storageEncrypted: true,
          storageEncryptionKey: key,
          credentials: rds.Credentials.fromGeneratedSecret("postgres", {
            secretName: `blazeapp/db-${stage}`,
          }),
        });

    database.connections.allowDefaultPortFrom(
      appConnections,
      "ECS のバックエンドから",
    );
    return database;
  }

  /**
   * pg_dump を毎時動かす ECS スケジュールタスクと、その監視を作る。
   * 中身は infra/backup/backup.sh。ダンプ → サイズと形式の検証 →（日次）実際に復元して検証 →
   * Object Lock（Governance）付きで東京のバケットへ置く。大阪へは S3 レプリケーションで複製される（T5 で設定済み）
   */
  private createDbBackup(props: {
    stage: string;
    cluster: ecs.ICluster;
    appSecret: secretsmanager.ISecret;
    backupBucketName: string;
    alertTopic: sns.ITopic;
    database?: rds.DatabaseInstance | rds.DatabaseInstanceFromSnapshot;
    metricNamespace: string;
  }): void {
    const { stage, cluster, appSecret, backupBucketName, alertTopic } = props;

    const logGroup = new logs.LogGroup(this, "DbBackupLogGroup", {
      logGroupName: `/blazeapp/db-backup-${stage}`,
      retention: logs.RetentionDays.THREE_MONTHS,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const taskDefinition = new ecs.FargateTaskDefinition(this, "DbBackupTask", {
      cpu: 256,
      memoryLimitMiB: 1024,
      // 復元検証で一時的にダンプと検証用DBの両方を置くため、既定（20GiB）より少し多めにする
      ephemeralStorageGiB: 30,
      runtimePlatform: {
        cpuArchitecture: ecs.CpuArchitecture.X86_64,
        operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
      },
    });
    taskDefinition.addContainer("backup", {
      image: ecs.ContainerImage.fromAsset(path.join(__dirname, "../backup")),
      environment: {
        BACKUP_BUCKET: backupBucketName,
        AWS_REGION: this.region,
        MIN_DUMP_BYTES: "10000",
      },
      secrets: {
        DATABASE_URL: ecs.Secret.fromSecretsManager(appSecret, "DATABASE_URL"),
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: "db-backup", logGroup }),
    });

    // 書き込みと保持期間の指定だけ。削除・保持期間の短縮（Governance の解除）は許さない
    taskDefinition.taskRole.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject", "s3:PutObjectRetention"],
        resources: [`arn:aws:s3:::${backupBucketName}/*`],
      }),
    );

    const securityGroup = new ec2.SecurityGroup(this, "DbBackupSecurityGroup", {
      vpc: cluster.vpc,
      description: `blazeapp ${stage} pg_dump タスク`,
    });
    props.database?.connections.allowDefaultPortFrom(
      securityGroup,
      "pg_dump タスクから",
    );

    // 毎時00分（UTC）。backup.sh は UTC 19時（JST 04:00）の回に日次・週次も残し、復元検証もする
    new events.Rule(this, "DbBackupSchedule", {
      ruleName: `blazeapp-${stage}-db-backup`,
      schedule: events.Schedule.cron({ minute: "0" }),
      targets: [
        new eventsTargets.EcsTask({
          cluster,
          taskDefinition,
          // NAT が無いため、バックエンドと同じくパブリックサブネットにパブリックIPつきで置き、
          // ECR・Secrets Manager・S3 へ出られるようにする（インバウンドは SG で全て閉じている）
          subnetSelection: { subnetType: ec2.SubnetType.PUBLIC },
          assignPublicIp: true,
          securityGroups: [securityGroup],
          platformVersion: ecs.FargatePlatformVersion.LATEST,
        }),
      ],
    });

    // --- 監視 ---
    // backup.sh が出す1行 JSON（type=BACKUP_SUCCEEDED / BACKUP_FAILED）を数える。
    // 名前を変えるときは backup.sh も合わせること
    const backupMetric = (id: string, type: string, metricName: string) => {
      new logs.MetricFilter(this, id, {
        logGroup,
        filterPattern: logs.FilterPattern.stringValue("$.type", "=", type),
        metricNamespace: props.metricNamespace,
        metricName,
        metricValue: "1",
        defaultValue: 0,
      });
      return new cloudwatch.Metric({
        namespace: props.metricNamespace,
        metricName,
        statistic: "Sum",
        period: cdk.Duration.hours(1),
      });
    };

    const failed = new cloudwatch.Alarm(this, "DbBackupFailedAlarm", {
      alarmName: `blazeapp-${stage}-DbBackupFailedAlarm`,
      alarmDescription: `DB のバックアップ（pg_dump）が失敗した。ロググループ /blazeapp/db-backup-${stage} の reason を確認すること`,
      metric: backupMetric("DbBackupFailedFilter", "BACKUP_FAILED", "DbBackupFailed"),
      threshold: 1,
      evaluationPeriods: 1,
      comparisonOperator:
        cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });
    failed.addAlarmAction(new cwActions.SnsAction(alertTopic));

    // 成功が3時間続けて0件 = タスクが起動していない（イメージ取得失敗・スケジュール停止など）。
    // 失敗ログすら出ない止まり方はこちらで拾う。データが無いことも「止まっている」とみなす
    const missing = new cloudwatch.Alarm(this, "DbBackupMissingAlarm", {
      alarmName: `blazeapp-${stage}-DbBackupMissingAlarm`,
      alarmDescription:
        "DB のバックアップが3時間成功していない。スケジュール（EventBridge）とタスクの停止理由を確認すること",
      metric: backupMetric(
        "DbBackupSucceededFilter",
        "BACKUP_SUCCEEDED",
        "DbBackupSucceeded",
      ),
      threshold: 1,
      evaluationPeriods: 3,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.BREACHING,
    });
    missing.addAlarmAction(new cwActions.SnsAction(alertTopic));
    missing.addOkAction(new cwActions.SnsAction(alertTopic));
  }
}
