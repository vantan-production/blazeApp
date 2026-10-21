# インフラの本番化（HTTPS・S3 タスクロール・DB バックアップ・RDS 分離）

対象: `infra/lib/backend-stack.ts` / `infra/backup/` / `.github/workflows/deploy.yml`

どの項目も **GitHub の Actions Variables を設定したときだけ有効になる**。未設定のままなら、これまでと同じテンプレートがデプロイされる（変わるのはバックエンドのイメージだけ）。
変数名は他と同じく `PROD_` / `DEV_` を頭に付ける（例: `PROD_CERTIFICATE_ARN`）。

おすすめの順番: 1 → 2 → 3 → 4 → 5（4 は停止を伴うので、利用の少ない時間に行う）。

---

## 1. HTTPS・独自ドメイン

本番はログインの Cookie に `Secure` が付くため、API が HTTP のままだとログインできない。

1. API 用のドメインを決める（例: `api.example.jp`）。
2. ACM で **ap-northeast-1（東京）** に証明書を発行する（DNS 検証）。
   ```bash
   aws acm request-certificate --domain-name api.example.jp --validation-method DNS --region ap-northeast-1
   ```
   出力された CNAME を DNS に登録し、状態が `ISSUED` になるまで待つ。
3. Variables を設定する。

   | 変数 | 値 |
   |---|---|
   | `PROD_CERTIFICATE_ARN` | 発行した証明書の ARN |
   | `PROD_API_DOMAIN_NAME` | `api.example.jp` |
   | `PROD_HOSTED_ZONE_ID` / `PROD_HOSTED_ZONE_NAME` | Route 53 で管理しているときだけ。設定すると ALB へのエイリアスレコードも作る |

4. main にマージしてデプロイする。ALB は 443（HTTPS）で受け、80 番は 443 へリダイレクトする。
5. Route 53 以外の DNS なら、`api.example.jp` を出力 `LoadBalancerDNS` へ CNAME で向ける。
6. フロント（Vercel）の `NEXT_PUBLIC_API_BASE_URL` を `https://api.example.jp` に変え、再デプロイする。
   バックエンドの `PROD_CORS_ORIGIN` / `PROD_FRONTEND_URL` もフロントの本番ドメインになっているか確認する。

## 2. S3 をタスクロールで使う（アクセスキーの廃止）

`back/src/db/s3.ts` は `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` が無ければ ECS タスクロールで S3 を使う（ローカル開発・テストはこれまでどおりキーで動く）。

1. `PROD_STORAGE_BUCKET` に本番バケット名（`blaze-app-storages-910972977659-ap-northeast-1-an`）を、`DEV_STORAGE_BUCKET` に dev のバケット名を設定してデプロイする。
   - タスクロールに、そのバケットの `PutObject` / `GetObject` / `DeleteObject` だけが付く。
   - シークレットのアクセスキーとバケット名はコンテナに渡らなくなる。
2. 管理画面で画像付きの投稿・表示・削除ができることを確かめる。
3. 問題なければ、シークレット `blazeapp/backend-{stage}` から `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET` を消し、そのアクセスキーを IAM で無効化 → 削除する。

## 3. DB の定期バックアップ（pg_dump）

`infra/backup/backup.sh` を ECS のスケジュールタスクとして **毎時00分** に動かす。

- 毎時: `pg_dump -Fc` → サイズ確認（`MIN_DUMP_BYTES` 未満は失敗）→ `pg_restore --list` で読めるか確認 → `hourly/` に置く（Object Lock 48時間）
- UTC 19時（JST 04:00）の回: 上に加えて **一時的な Postgres に実際に復元し、テーブルとマイグレーション履歴が読めるか確認**してから `daily/`（30日）にも置く。日曜は `weekly/`（35日）にも置く
- 大阪への複製は既存の S3 レプリケーション（backup-design.md T5）が行う

手順:

1. `PROD_BACKUP_BUCKET` に `blazeapp-db-backups-910972977659-ap-northeast-1` を設定してデプロイする。
2. 初回は手動で1回動かして確かめる（`VERIFY_RESTORE=always` で復元検証も行う）。
   ```bash
   aws ecs run-task --cluster <Cluster> --task-definition <DbBackupTask> --launch-type FARGATE \
     --network-configuration 'awsvpcConfiguration={subnets=[<public subnet>],securityGroups=[<DbBackupSecurityGroup>],assignPublicIp=ENABLED}' \
     --overrides '{"containerOverrides":[{"name":"backup","environment":[{"name":"VERIFY_RESTORE","value":"always"}]}]}'
   ```
   ロググループ `/blazeapp/db-backup-prod` に `{"type":"BACKUP_SUCCEEDED",...}` が出て、バケットにオブジェクトが増えていれば成功。
3. 監視（通知先は既存の `blazeapp-alerts-prod`）
   - `DbBackupFailedAlarm`: 失敗（`BACKUP_FAILED`）が1件でも出たら鳴る。ログの `reason` を見る
   - `DbBackupMissingAlarm`: 3時間成功が無ければ鳴る（タスクが起動していない止まり方を拾う）

**DB が今の公開 RDS のままでも動く**（タスクはパブリック IP で外に出る）。4 で RDS を移したら、DB の SG にこのタスクからの接続も自動で許可される。

ローカルでの確認: テスト用 DB（`back/docker-compose.test.yml`）に対して
```bash
docker build -t blazeapp-backup infra/backup
docker run --rm -e DATABASE_URL='postgres://test:test@host.docker.internal:5433/test_db?sslmode=disable' \
  -e BACKUP_BUCKET=dummy -e VERIFY_RESTORE=always blazeapp-backup
```
（S3 へのアップロードで失敗するのは想定どおり。アップロードまで試すときは `aws` を差し替える）

## 4. RDS の非公開化・prod/dev 分離（backup-design.md 9-1・9-2）

stage ごとに、CDK の VPC 内の **インターネットから届かない** サブネットへ RDS を作り、ECS のバックエンドと pg_dump タスクからだけ接続を許す。CMK（カスタマー管理キー）で暗号化し、`rds.force_ssl=1` で TLS 以外を拒否する。

| 設定 | prod | dev |
|---|---|---|
| 自動バックアップ（PITR） | 7日 | 1日 |
| 削除保護 | 有効 | 無効 |
| バックアップウィンドウ | JST 04:00-04:30 | 同左 |

### prod（既存データを移す）

1. `PROD_DATABASE_KEY=true` でデプロイし、暗号化キーだけ作る（出力 `DatabaseKeyArn`）。
2. 書き込みを止める時間を告知し、現行 DB のスナップショットを取って、そのキーで再暗号化コピーする。
   ```bash
   aws rds create-db-snapshot --db-instance-identifier blaze-app-db --db-snapshot-identifier blazeapp-migrate-YYYYMMDD
   aws rds copy-db-snapshot --source-db-snapshot-identifier blazeapp-migrate-YYYYMMDD \
     --target-db-snapshot-identifier blazeapp-migrate-YYYYMMDD-cmk --kms-key-id <DatabaseKeyArn>
   ```
3. `PROD_MANAGE_DATABASE=true` と `PROD_DB_SNAPSHOT_ID=blazeapp-migrate-YYYYMMDD-cmk` を設定してデプロイする（出力 `DatabaseEndpoint` / `DatabaseSecretName`）。
4. シークレット `blazeapp/backend-prod` の `DATABASE_URL` を新しいホストとパスワード（`DatabaseSecretName` の値）に書き換え、ECS サービスを再デプロイする。
   既定の DB 名は現行と同じ `postgres`（スナップショットから作るため）。
5. 動作確認後、**`PROD_DB_SNAPSHOT_ID` はそのまま残す**（消すと別の DB を作り直そうとする）。
6. 旧 `blaze-app-db` は1週間ほど残してから削除する（削除保護を外してから、最終スナップショット付きで）。

### dev（新しく作る）

1. `DEV_MANAGE_DATABASE=true` でデプロイする（空の DB `blazeapp` ができる）。
2. 旧 DB の `blazeapp_dev` を移したい場合は `pg_dump` → `pg_restore` で流し込む（新 DB は VPC 外から届かないため、ECS Exec か一時タスクから行う）。不要ならそのまま使えば、バックエンドの起動時にマイグレーションが走る。
3. `blazeapp/backend-dev` の `DATABASE_URL` を書き換え、再デプロイする。

## 5. root アクセスキーの廃止（backup-design.md 9-3）

コードでは対応できないため、コンソールで行う。

1. IAM Identity Center（または IAM ユーザー + MFA）で作業用の管理者を用意し、ローカルの AWS CLI をそちらに切り替える（`aws sts get-caller-identity` の Arn が `:root` でないこと）。
2. root ユーザーでサインインし、「セキュリティ認証情報」からアクセスキーを **無効化** → 数日問題が無ければ **削除** する。root には MFA を付ける。
