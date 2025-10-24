#!/usr/bin/env bash
set -e

# Step 1: build your app
cd frontend
pnpm install
pnpm run build

# Step 2: upload build output to S3 (requires aws cli and jq)
CREDS_JSON=$(aws sts assume-role-with-web-identity \
  --role-arn "$AWS_ROLE_ARN" \
  --role-session-name vercel-oidc \
  --web-identity-token "$VERCEL_OIDC_TOKEN" \
  --region "$AWS_REGION" \
  --duration-seconds 900)

export AWS_ACCESS_KEY_ID=$(echo "$CREDS_JSON" | jq -r .Credentials.AccessKeyId)
export AWS_SECRET_ACCESS_KEY=$(echo "$CREDS_JSON" | jq -r .Credentials.SecretAccessKey)
export AWS_SESSION_TOKEN=$(echo "$CREDS_JSON" | jq -r .Credentials.SessionToken)

aws s3 cp .next/ s3://veris-registry-prod/ --recursive --region "$AWS_REGION"
