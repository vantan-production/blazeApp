#!/usr/bin/env bash
# バックアップ用S3バケットとクロスリージョンレプリケーションを構成する。
# docs/backup-design.md の T2 / T3 / T5 に対応する。
#
# 冪等に作られているため、再実行しても既存の設定を壊さない。
# ただし Object Lock だけはバケット作成時にしか有効化できないため、
# 既存バケットに後から付けることはできない（作り直しが必要）。
#
# 実行例:
#   ./setup-backup-buckets.sh
#
# 注意: 本番のAWSリソースを変更する。実行者の認証情報を必ず確認すること。
#   aws sts get-caller-identity

set -euo pipefail

ACCOUNT="${ACCOUNT:-910972977659}"
PRIMARY_REGION="ap-northeast-1"
OFFSITE_REGION="ap-northeast-3"

# 画像・動画・ファイル（アプリが読み書きする本番バケット）
IMAGES_SRC="blaze-app-storages-${ACCOUNT}-${PRIMARY_REGION}-an"
IMAGES_DST="blaze-app-storages-replica-${ACCOUNT}-${OFFSITE_REGION}"
IMAGES_DEV="blaze-app-storages-dev-${ACCOUNT}-${PRIMARY_REGION}"

# DBダンプ（pg_dump の出力先。東京に書いて大阪へ複製する）
DUMPS_SRC="blazeapp-db-backups-${ACCOUNT}-${PRIMARY_REGION}"
DUMPS_DST="blazeapp-db-backups-${ACCOUNT}-${OFFSITE_REGION}"

REPLICATION_ROLE="blazeapp-s3-replication-role"
ROLE_ARN="arn:aws:iam::${ACCOUNT}:role/${REPLICATION_ROLE}"

echo "== 実行者 =="
aws sts get-caller-identity --output text --query 'Arn'
echo

# ---------------------------------------------------------------------------
# ヘルパー
# ---------------------------------------------------------------------------

bucket_exists() { aws s3api head-bucket --bucket "$1" 2>/dev/null; }

# パブリックアクセスを4項目すべて遮断する。
# 配信は署名付きURLで行っており、公開アクセスは一切不要。
block_public() {
  aws s3api put-public-access-block --bucket "$1" \
    --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
}

# ---------------------------------------------------------------------------
# T2. 画像バケットのバージョニングとライフサイクル
# ---------------------------------------------------------------------------

echo "== T2. 画像バケット =="

for entry in "${IMAGES_SRC}:30" "${IMAGES_DEV}:7"; do
  bucket="${entry%:*}"
  noncurrent_days="${entry#*:}"

  aws s3api put-bucket-versioning --bucket "$bucket" \
    --versioning-configuration Status=Enabled
  block_public "$bucket"

  # 削除・上書きした旧ファイルを一定期間だけ残す。
  # 無期限に残すと保管料が増え続けるため、必ず期限を切る。
  aws s3api put-bucket-lifecycle-configuration --bucket "$bucket" \
    --lifecycle-configuration "$(cat <<EOF
{"Rules":[
  {"ID":"expire-noncurrent-${noncurrent_days}d","Status":"Enabled","Filter":{},
   "NoncurrentVersionExpiration":{"NoncurrentDays":${noncurrent_days}}},
  {"ID":"abort-mpu-7d","Status":"Enabled","Filter":{},
   "AbortIncompleteMultipartUpload":{"DaysAfterInitiation":7}}
]}
EOF
)" >/dev/null
  echo "  ${bucket}: バージョニング有効 / 非現行 ${noncurrent_days}日 / パブリック遮断"
done

# ---------------------------------------------------------------------------
# T3. ダンプ保管バケット（Object Lock 付き）
# ---------------------------------------------------------------------------

echo
echo "== T3. ダンプ保管バケット =="

create_locked_bucket() {
  local bucket="$1" region="$2"

  if bucket_exists "$bucket"; then
    echo "  ${bucket}: 既に存在（Object Lock の設定は変更しない）"
  else
    # Object Lock はバケット作成時にしか有効化できない
    aws s3api create-bucket --bucket "$bucket" --region "$region" \
      --create-bucket-configuration "LocationConstraint=${region}" \
      --object-lock-enabled-for-bucket >/dev/null
    echo "  ${bucket}: 作成（Object Lock 有効）"
  fi

  block_public "$bucket"

  # 既定の保持期間。hourly のダンプに合わせた最短値。
  # daily / weekly はアップロード時に個別に長い保持を指定する（T4 で実装）。
  aws s3api put-object-lock-configuration --bucket "$bucket" \
    --object-lock-configuration \
    '{"ObjectLockEnabled":"Enabled","Rule":{"DefaultRetention":{"Mode":"GOVERNANCE","Days":2}}}' >/dev/null

  # プレフィックスごとの保持期間（docs/backup-design.md 5-2）
  aws s3api put-bucket-lifecycle-configuration --bucket "$bucket" \
    --lifecycle-configuration '{"Rules":[
      {"ID":"hourly-48h","Status":"Enabled","Filter":{"Prefix":"hourly/"},"Expiration":{"Days":2}},
      {"ID":"daily-30d","Status":"Enabled","Filter":{"Prefix":"daily/"},"Expiration":{"Days":30}},
      {"ID":"weekly-35d","Status":"Enabled","Filter":{"Prefix":"weekly/"},"Expiration":{"Days":35}},
      {"ID":"expire-noncurrent-1d","Status":"Enabled","Filter":{},"NoncurrentVersionExpiration":{"NoncurrentDays":1}},
      {"ID":"abort-mpu-7d","Status":"Enabled","Filter":{},"AbortIncompleteMultipartUpload":{"DaysAfterInitiation":7}}
    ]}' >/dev/null
  echo "    保持: hourly 2日 / daily 30日 / weekly 35日"
}

create_locked_bucket "$DUMPS_SRC" "$PRIMARY_REGION"
create_locked_bucket "$DUMPS_DST" "$OFFSITE_REGION"

# ---------------------------------------------------------------------------
# T5. クロスリージョンレプリケーション
# ---------------------------------------------------------------------------

echo
echo "== T5. レプリケーション =="

# 複製先（大阪）を用意する。画像用は Object Lock 無しでよい
if bucket_exists "$IMAGES_DST"; then
  echo "  ${IMAGES_DST}: 既に存在"
else
  aws s3api create-bucket --bucket "$IMAGES_DST" --region "$OFFSITE_REGION" \
    --create-bucket-configuration "LocationConstraint=${OFFSITE_REGION}" >/dev/null
  echo "  ${IMAGES_DST}: 作成"
fi

# レプリケーションは複製元・複製先の両方でバージョニングが必須
aws s3api put-bucket-versioning --bucket "$IMAGES_DST" --versioning-configuration Status=Enabled
block_public "$IMAGES_DST"
aws s3api put-bucket-lifecycle-configuration --bucket "$IMAGES_DST" \
  --lifecycle-configuration '{"Rules":[
    {"ID":"expire-noncurrent-30d","Status":"Enabled","Filter":{},"NoncurrentVersionExpiration":{"NoncurrentDays":30}},
    {"ID":"abort-mpu-7d","Status":"Enabled","Filter":{},"AbortIncompleteMultipartUpload":{"DaysAfterInitiation":7}}
  ]}' >/dev/null

# レプリケーション用ロール
if aws iam get-role --role-name "$REPLICATION_ROLE" >/dev/null 2>&1; then
  echo "  ${REPLICATION_ROLE}: 既に存在"
else
  aws iam create-role --role-name "$REPLICATION_ROLE" \
    --description "S3 cross-region replication for blazeApp (images and DB dumps)" \
    --assume-role-policy-document \
    '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"s3.amazonaws.com"},"Action":"sts:AssumeRole"}]}' >/dev/null
  echo "  ${REPLICATION_ROLE}: 作成"
fi

# GetObjectRetention / PutObjectRetention は、Object Lock 有効なバケットへ
# 複製するために必須。これが無いと複製が FAILED になる。
aws iam put-role-policy --role-name "$REPLICATION_ROLE" \
  --policy-name blazeapp-s3-replication \
  --policy-document "$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetReplicationConfiguration", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::${IMAGES_SRC}",
        "arn:aws:s3:::${DUMPS_SRC}"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObjectVersionForReplication",
        "s3:GetObjectVersionAcl",
        "s3:GetObjectVersionTagging",
        "s3:GetObjectRetention",
        "s3:GetObjectLegalHold"
      ],
      "Resource": [
        "arn:aws:s3:::${IMAGES_SRC}/*",
        "arn:aws:s3:::${DUMPS_SRC}/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ReplicateObject",
        "s3:ReplicateDelete",
        "s3:ReplicateTags",
        "s3:ObjectOwnerOverrideToBucketOwner",
        "s3:PutObjectRetention",
        "s3:PutObjectLegalHold"
      ],
      "Resource": [
        "arn:aws:s3:::${IMAGES_DST}/*",
        "arn:aws:s3:::${DUMPS_DST}/*"
      ]
    }
  ]
}
EOF
)"
echo "  ${REPLICATION_ROLE}: ポリシー更新"

# DeleteMarkerReplication を Disabled にしているのが要点。
# 本番側の削除を複製先へ伝播させないことで、誤削除・悪意ある削除に耐える。
put_replication() {
  local src="$1" dst="$2" rule_id="$3"
  aws s3api put-bucket-replication --bucket "$src" --replication-configuration "$(cat <<EOF
{
  "Role": "${ROLE_ARN}",
  "Rules": [{
    "ID": "${rule_id}",
    "Priority": 0,
    "Status": "Enabled",
    "Filter": {},
    "DeleteMarkerReplication": { "Status": "Disabled" },
    "Destination": { "Bucket": "arn:aws:s3:::${dst}", "StorageClass": "STANDARD" }
  }]
}
EOF
)"
  echo "  ${src} -> ${dst}: 複製設定"
}

put_replication "$IMAGES_SRC" "$IMAGES_DST" "replicate-images-to-osaka"
put_replication "$DUMPS_SRC" "$DUMPS_DST" "replicate-dumps-to-osaka"

echo
echo "完了。複製は非同期のため、反映まで数十秒かかる。"
echo "確認: aws s3api head-object --bucket ${IMAGES_SRC} --key <key> --query ReplicationStatus"
