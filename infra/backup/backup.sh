#!/bin/sh
# DB の論理バックアップを取り、検証してから S3（Object Lock 付き）へ置く。
# ECS のスケジュールタスクとして毎時00分に動く（infra/lib/backend-stack.ts の DbBackup）。
#
# 必要な環境変数:
#   DATABASE_URL   … 対象DB（Secrets Manager から注入）
#   BACKUP_BUCKET  … 書き込み先（東京の blazeapp-db-backups-...。大阪へは S3 レプリケーションで複製される）
#   MIN_DUMP_BYTES … これより小さいダンプは失敗扱い（空DBや接続先違いの検知）
#   VERIFY_RESTORE … always にすると時刻に関係なく復元検証もする（手動実行で確かめたいとき）
#
# 結果は1行の JSON で標準出力に出す。CloudWatch のメトリクスフィルタが
#   type=BACKUP_SUCCEEDED を数え、一定時間 0 件ならアラームを鳴らす
#   type=BACKUP_FAILED    を数え、1件で鳴らす
# ので、type の値を変えるときは backend-stack.ts も合わせること。
set -eu

: "${DATABASE_URL:?DATABASE_URL が未設定です}"
: "${BACKUP_BUCKET:?BACKUP_BUCKET が未設定です}"
MIN_DUMP_BYTES="${MIN_DUMP_BYTES:-10000}"

# URL に sslmode が無ければ RDS の証明書まで検証する（URL 側の指定が優先される）
export PGSSLMODE="${PGSSLMODE:-verify-full}"
export PGSSLROOTCERT="${PGSSLROOTCERT:-/certs/rds-global-bundle.pem}"

NOW_EPOCH=$(date -u +%s)
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
DATE_PATH=$(date -u +%Y/%m/%d)
HOUR=$(date -u +%H)
WEEKDAY=$(date -u +%u) # 1=月 … 7=日
DUMP=/tmp/blazeapp-${STAMP}.dump

log() {
  # $1: type, $2: 追加の JSON（オブジェクト）
  jq -cn --arg type "$1" --arg stamp "$STAMP" --argjson extra "${2:-{\}}" \
    '{type: $type, stamp: $stamp} + $extra'
}

# 失敗のログは標準エラーに出す。upload / verify_restore は $(...) の中で呼ぶため、
# 標準出力に出すと呼び出し側の変数に吸われてログに残らない（ECS は両方とも CloudWatch に送る）
fail() {
  log BACKUP_FAILED "$(jq -cn --arg reason "$1" '{reason: $reason}')" >&2
  exit 1
}

# 期限（UTC, ISO8601）を「今から N 時間後」で返す
until_hours() {
  date -u -d "@$((NOW_EPOCH + $1 * 3600))" +%Y-%m-%dT%H:%M:%SZ
}

upload() {
  # $1: プレフィックス（hourly/daily/weekly）, $2: Object Lock の保持時間
  key="$1/${DATE_PATH}/blazeapp-${STAMP}.dump"
  aws s3api put-object \
    --bucket "$BACKUP_BUCKET" \
    --key "$key" \
    --body "$DUMP" \
    --checksum-algorithm SHA256 \
    --object-lock-mode GOVERNANCE \
    --object-lock-retain-until-date "$(until_hours "$2")" \
    >/dev/null || fail "S3 へのアップロードに失敗しました（$key）"
  echo "$key"
}

# 一時的に postgres を立てて実際に復元し、主要テーブルが読めることを確かめる。
# pg_restore --list だけでは「ファイルが壊れていない」ことしか分からないため、日次で本当に戻せるか試す
verify_restore() {
  PGDATA_TMP=/tmp/verify-pgdata
  rm -rf "$PGDATA_TMP"
  initdb -D "$PGDATA_TMP" -U postgres --auth=trust >/dev/null
  pg_ctl -D "$PGDATA_TMP" -o "-k /tmp -c listen_addresses=''" -w start >/dev/null
  # 復元先の検証用クラスタはローカルのソケットだけで動かすため SSL は使わない
  restore_ok=0
  if PGSSLMODE=disable createdb -h /tmp -U postgres verify \
    && PGSSLMODE=disable pg_restore -h /tmp -U postgres -d verify --no-owner --no-acl --exit-on-error "$DUMP"; then
    tables=$(PGSSLMODE=disable psql -h /tmp -U postgres -d verify -Atc \
      "select count(*) from information_schema.tables where table_schema = 'public'")
    migrations=$(PGSSLMODE=disable psql -h /tmp -U postgres -d verify -Atc \
      "select count(*) from drizzle.__drizzle_migrations" 2>/dev/null || echo 0)
    if [ "${tables:-0}" -gt 0 ] && [ "${migrations:-0}" -gt 0 ]; then
      restore_ok=1
    fi
  fi
  pg_ctl -D "$PGDATA_TMP" -m fast -w stop >/dev/null || true
  rm -rf "$PGDATA_TMP"
  [ "$restore_ok" = 1 ] || fail "復元の検証に失敗しました（tables=${tables:-?} migrations=${migrations:-?}）"
  echo "${tables}"
}

pg_dump --format=custom --no-owner --no-acl --file="$DUMP" "$DATABASE_URL" \
  || fail "pg_dump に失敗しました"

BYTES=$(wc -c <"$DUMP" | tr -d ' ')
[ "$BYTES" -ge "$MIN_DUMP_BYTES" ] \
  || fail "ダンプが小さすぎます（${BYTES} bytes < ${MIN_DUMP_BYTES}）。接続先や中身を確認してください"

# アーカイブとして読めるか（毎回の軽い検証）
pg_restore --list "$DUMP" >/dev/null || fail "ダンプを読み取れません（pg_restore --list）"

RESTORED_TABLES=""
# JST 04:00（UTC 19時）の回だけ、実際に復元して確かめる
if [ "$HOUR" = "19" ] || [ "${VERIFY_RESTORE:-}" = "always" ]; then
  RESTORED_TABLES=$(verify_restore)
fi

KEYS=$(upload hourly 48)
if [ "$HOUR" = "19" ]; then
  KEYS="$KEYS $(upload daily $((30 * 24)))"
  # 日曜（UTC。JST では月曜 04:00）の回は週次も残す
  if [ "$WEEKDAY" = "7" ]; then
    KEYS="$KEYS $(upload weekly $((35 * 24)))"
  fi
fi

rm -f "$DUMP"

log BACKUP_SUCCEEDED "$(jq -cn \
  --argjson bytes "$BYTES" \
  --arg keys "$KEYS" \
  --arg restored "$RESTORED_TABLES" \
  '{bytes: $bytes, keys: ($keys | split(" ")), restoreVerifiedTables: (if $restored == "" then null else ($restored | tonumber) end)}')"
