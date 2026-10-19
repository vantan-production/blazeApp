# DB の論理バックアップ（pg_dump）を取るスケジュールタスク用イメージ（docs/backup-design.md 5-2・T4）。
# pg_dump はサーバ（RDS PostgreSQL 18）と同じメジャー以上が必要なため postgres:18-alpine を使う。
# 復元検証（backup.sh の verify_restore）でもこのイメージに入っている postgres 本体を使う
FROM postgres:18-alpine

RUN apk add --no-cache aws-cli jq

# RDS の証明書を検証するための AWS 公式 CA バンドル（back/certs/rds-global-bundle.pem と同じもの）
ADD https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem /certs/rds-global-bundle.pem
RUN chmod 644 /certs/rds-global-bundle.pem

COPY backup.sh /usr/local/bin/backup.sh
RUN chmod 755 /usr/local/bin/backup.sh

# initdb / postgres は root では動かないため、postgres ユーザーで実行する
USER postgres
WORKDIR /tmp

ENTRYPOINT ["/usr/local/bin/backup.sh"]
