#!/usr/bin/env bash
#
# Creates (or re-applies settings to) a private S3 bucket for database backups.
# Run once per app from an admin machine, not from the app server.
# See docs/DB_BACKUPS.md.
#
# Settings: Block Public Access, SSE-S3 default encryption, versioning,
# BucketOwnerEnforced, HTTPS-only bucket policy, and lifecycle:
#   weekly/  current objects expire after BACKUP_RETENTION_DAYS (default 84),
#            overwritten/deleted versions after 7 days
#   latest/  current object never expires; prior versions after 30 days
#   all      incomplete multipart uploads aborted after 7 days
#
# AWS credentials come from the normal AWS CLI chain (env vars, profile), or
# from AWS_* keys in --env-file.
#
# --uploader-user creates IAM user <bucket>-uploader that may only upload to
# weekly/ and latest/, and prints its access key once. Put that key on the app
# server instead of an admin key.
#
# Usage:
#   ./scripts/backup/create-bucket.sh <bucket> [--region us-east-1] [--env-file .env.local] [--uploader-user]
#
set -euo pipefail

main() {
  local BUCKET="" REGION="" ENV_FILE="" UPLOADER=0
  while [ $# -gt 0 ]; do
    case "$1" in
      --region) REGION="${2:?--region needs a value}"; shift ;;
      --env-file) ENV_FILE="${2:?--env-file needs a value}"; shift ;;
      --uploader-user) UPLOADER=1 ;;
      -*) echo "Unknown option: $1" >&2; exit 2 ;;
      *) [ -z "$BUCKET" ] || die "Only one bucket name allowed."; BUCKET="$1" ;;
    esac
    shift
  done
  [ -n "$BUCKET" ] || die "Usage: $0 <bucket> [--region R] [--env-file F] [--uploader-user]"
  command -v aws >/dev/null 2>&1 || die "aws CLI is not on PATH."

  if [ -n "$ENV_FILE" ]; then
    [ -f "$ENV_FILE" ] || die "No such file: $ENV_FILE"
    local key value
    for key in AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION; do
      value="$(read_env_value "$ENV_FILE" "$key")"
      if [ -n "$value" ]; then export "$key=$value"; fi
    done
  fi
  REGION="${REGION:-${AWS_REGION:-us-east-1}}"
  export AWS_DEFAULT_REGION="$REGION" AWS_PAGER=""
  local RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-84}"

  echo "AWS identity: $(aws sts get-caller-identity --query Arn --output text)"

  local head_err
  if head_err="$(aws s3api head-bucket --bucket "$BUCKET" 2>&1)"; then
    echo "Bucket ${BUCKET} already exists in this account; re-applying settings."
  elif [[ "$head_err" == *"403"* || "$head_err" == *"Forbidden"* ]]; then
    die "Bucket name ${BUCKET} is taken by another AWS account. Pick another name."
  else
    echo "Creating bucket ${BUCKET} in ${REGION}"
    if [ "$REGION" = "us-east-1" ]; then
      aws s3api create-bucket --bucket "$BUCKET" --object-ownership BucketOwnerEnforced >/dev/null
    else
      aws s3api create-bucket --bucket "$BUCKET" --object-ownership BucketOwnerEnforced \
        --create-bucket-configuration "LocationConstraint=${REGION}" >/dev/null
    fi
    aws s3api wait bucket-exists --bucket "$BUCKET"
  fi

  aws s3api put-public-access-block --bucket "$BUCKET" --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
  aws s3api put-bucket-ownership-controls --bucket "$BUCKET" \
    --ownership-controls 'Rules=[{ObjectOwnership=BucketOwnerEnforced}]'
  aws s3api put-bucket-encryption --bucket "$BUCKET" --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"},"BucketKeyEnabled":true}]}'
  aws s3api put-bucket-versioning --bucket "$BUCKET" --versioning-configuration Status=Enabled
  aws s3api put-bucket-policy --bucket "$BUCKET" --policy "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Sid\": \"DenyInsecureTransport\",
      \"Effect\": \"Deny\",
      \"Principal\": \"*\",
      \"Action\": \"s3:*\",
      \"Resource\": [\"arn:aws:s3:::${BUCKET}\", \"arn:aws:s3:::${BUCKET}/*\"],
      \"Condition\": {\"Bool\": {\"aws:SecureTransport\": \"false\"}}
    }]
  }"
  aws s3api put-bucket-lifecycle-configuration --bucket "$BUCKET" --lifecycle-configuration "{
    \"Rules\": [
      {\"ID\": \"weekly-expire\", \"Status\": \"Enabled\", \"Filter\": {\"Prefix\": \"weekly/\"},
       \"Expiration\": {\"Days\": ${RETENTION_DAYS}}, \"NoncurrentVersionExpiration\": {\"NoncurrentDays\": 7}},
      {\"ID\": \"latest-keep-prior-30d\", \"Status\": \"Enabled\", \"Filter\": {\"Prefix\": \"latest/\"},
       \"NoncurrentVersionExpiration\": {\"NoncurrentDays\": 30}},
      {\"ID\": \"abort-incomplete-uploads\", \"Status\": \"Enabled\", \"Filter\": {\"Prefix\": \"\"},
       \"AbortIncompleteMultipartUpload\": {\"DaysAfterInitiation\": 7}}
    ]
  }" >/dev/null
  aws s3api put-bucket-tagging --bucket "$BUCKET" --tagging 'TagSet=[{Key=purpose,Value=db-backups}]'
  echo "Bucket settings applied (weekly/ retention: ${RETENTION_DAYS} days; latest/ kept)."

  if [ "$UPLOADER" -eq 1 ]; then
    create_uploader "$BUCKET"
  fi
}

create_uploader() {
  local bucket="$1" user="${1}-uploader"
  if aws iam get-user --user-name "$user" >/dev/null 2>&1; then
    echo "IAM user ${user} exists; refreshing its policy (no new key created)."
  else
    aws iam create-user --user-name "$user" --tags Key=purpose,Value=db-backups >/dev/null
    echo "Created IAM user ${user}."
  fi
  aws iam put-user-policy --user-name "$user" --policy-name "${bucket}-upload-only" --policy-document "{
    \"Version\": \"2012-10-17\",
    \"Statement\": [{
      \"Effect\": \"Allow\",
      \"Action\": [\"s3:PutObject\", \"s3:AbortMultipartUpload\"],
      \"Resource\": [\"arn:aws:s3:::${bucket}/weekly/*\", \"arn:aws:s3:::${bucket}/latest/*\"]
    }]
  }"
  if [ "$(aws iam list-access-keys --user-name "$user" --query 'length(AccessKeyMetadata)' --output text)" -eq 0 ]; then
    echo
    echo "Access key for ${user} (shown once; put it in the server's env file, never in git):"
    aws iam create-access-key --user-name "$user" \
      --query 'AccessKey.[AccessKeyId,SecretAccessKey]' --output text \
      | awk '{print "AWS_ACCESS_KEY_ID=" $1 "\nAWS_SECRET_ACCESS_KEY=" $2}'
  fi
}

read_env_value() {
  local file="$1" name="$2" line value
  line="$(grep -E "^(export[[:space:]]+)?${name}=" "$file" | tail -n 1 || true)"
  [ -n "$line" ] || return 0
  value="${line#*=}"
  value="${value%$'\r'}"
  if [[ "$value" =~ ^\"(.*)\"$ ]] || [[ "$value" =~ ^\'(.*)\'$ ]]; then
    value="${BASH_REMATCH[1]}"
  fi
  printf '%s' "$value"
}

die() {
  echo "ERROR: $*" >&2
  exit 1
}

main "$@"
