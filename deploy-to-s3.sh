#!/usr/bin/env bash
set -e

# Debug: Check if VERCEL_OIDC_TOKEN is available
if [ -z "$VERCEL_OIDC_TOKEN" ]; then
    echo "❌ VERCEL_OIDC_TOKEN is not set"
    exit 1
else
    echo "✅ VERCEL_OIDC_TOKEN is available (length: ${#VERCEL_OIDC_TOKEN})"
fi

# Use Vercel's OIDC token to get AWS credentials
CREDS_JSON=$(aws sts assume-role-with-web-identity \
  --role-arn "$AWS_ROLE_ARN" \
  --role-session-name vercel-oidc \
  --web-identity-token "$VERCEL_OIDC_TOKEN" \
  --region "$AWS_REGION" \
  --duration-seconds 900)

export AWS_ACCESS_KEY_ID=$(echo "$CREDS_JSON" | jq -r .Credentials.AccessKeyId)
export AWS_SECRET_ACCESS_KEY=$(echo "$CREDS_JSON" | jq -r .Credentials.SecretAccessKey)
export AWS_SESSION_TOKEN=$(echo "$CREDS_JSON" | jq -r .Credentials.SessionToken)

# Now push your build output to S3
aws s3 cp out/ s3://veris-registry-prod/ --recursive --region "$AWS_REGION"
