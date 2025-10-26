#!/bin/bash
# AWS S3 Bucket and OIDC Configuration Script
# Aligned with veris_execution_build_plan_v4.4.md

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${GREEN}[$(date -u +%FT%TZ)]${NC} $1"
}

error() {
    echo -e "${RED}[$(date -u +%FT%TZ)] ERROR:${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[$(date -u +%FT%TZ)] WARNING:${NC} $1"
}

# Check if AWS CLI is installed and configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    log "AWS CLI is installed and configured"
}

# Check required environment variables
check_env_vars() {
    local required_vars=(
        "AWS_REGION"
        "REGISTRY_BUCKET_STAGING"
        "REGISTRY_BUCKET_PROD"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    log "All required environment variables are set"
}

# Create S3 bucket
create_bucket() {
    local bucket_name="$1"
    local region="$2"
    
    log "Creating S3 bucket: $bucket_name in region: $region"
    
    # Check if bucket already exists
    if aws s3api head-bucket --bucket "$bucket_name" 2>/dev/null; then
        warn "Bucket $bucket_name already exists"
        return 0
    fi
    
    # Create bucket
    if [ "$region" = "us-east-1" ]; then
        aws s3api create-bucket --bucket "$bucket_name" --region "$region"
    else
        aws s3api create-bucket --bucket "$bucket_name" --region "$region" \
            --create-bucket-configuration LocationConstraint="$region"
    fi
    
    log "Bucket $bucket_name created successfully"
}

# Configure bucket policy
configure_bucket_policy() {
    local bucket_name="$1"
    
    log "Configuring bucket policy for: $bucket_name"
    
    # Create bucket policy JSON
    local policy_json=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowVercelAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": "${AWS_ROLE_VERCEL_ARN:-arn:aws:iam::*:role/vercel-role}"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::$bucket_name",
                "arn:aws:s3:::$bucket_name/*"
            ]
        },
        {
            "Sid": "AllowGitHubAccess",
            "Effect": "Allow",
            "Principal": {
                "AWS": "${AWS_ROLE_GITHUB_ARN:-arn:aws:iam::*:role/github-role}"
            },
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::$bucket_name",
                "arn:aws:s3:::$bucket_name/*"
            ]
        }
    ]
}
EOF
)
    
    # Apply bucket policy
    echo "$policy_json" | aws s3api put-bucket-policy --bucket "$bucket_name" --policy file:///dev/stdin
    
    log "Bucket policy configured for: $bucket_name"
}

# Configure bucket CORS
configure_bucket_cors() {
    local bucket_name="$1"
    
    log "Configuring CORS for bucket: $bucket_name"
    
    # Create CORS configuration
    local cors_json=$(cat <<EOF
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3000
        }
    ]
}
EOF
)
    
    # Apply CORS configuration
    echo "$cors_json" | aws s3api put-bucket-cors --bucket "$bucket_name" --cors-configuration file:///dev/stdin
    
    log "CORS configured for bucket: $bucket_name"
}

# Configure bucket versioning
configure_bucket_versioning() {
    local bucket_name="$1"
    
    log "Configuring versioning for bucket: $bucket_name"
    
    aws s3api put-bucket-versioning --bucket "$bucket_name" --versioning-configuration Status=Enabled
    
    log "Versioning enabled for bucket: $bucket_name"
}

# Configure bucket lifecycle
configure_bucket_lifecycle() {
    local bucket_name="$1"
    
    log "Configuring lifecycle for bucket: $bucket_name"
    
    # Create lifecycle configuration
    local lifecycle_json=$(cat <<EOF
{
    "Rules": [
        {
            "ID": "DeleteOldVersions",
            "Status": "Enabled",
            "Filter": {
                "Prefix": ""
            },
            "NoncurrentVersionExpiration": {
                "NoncurrentDays": 30
            }
        },
        {
            "ID": "TransitionToIA",
            "Status": "Enabled",
            "Filter": {
                "Prefix": ""
            },
            "Transitions": [
                {
                    "Days": 30,
                    "StorageClass": "STANDARD_IA"
                }
            ]
        }
    ]
}
EOF
)
    
    # Apply lifecycle configuration
    echo "$lifecycle_json" | aws s3api put-bucket-lifecycle-configuration --bucket "$bucket_name" --lifecycle-configuration file:///dev/stdin
    
    log "Lifecycle configured for bucket: $bucket_name"
}

# Create OIDC identity provider
create_oidc_provider() {
    local provider_url="$1"
    local audience="$2"
    
    log "Creating OIDC identity provider: $provider_url"
    
    # Check if OIDC provider already exists
    if aws iam get-open-id-connect-provider --open-id-connect-provider-arn "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):oidc-provider/$provider_url" 2>/dev/null; then
        warn "OIDC provider $provider_url already exists"
        return 0
    fi
    
    # Create OIDC provider
    aws iam create-open-id-connect-provider \
        --url "https://$provider_url" \
        --client-id-list "$audience" \
        --thumbprint-list "6938fd4d98bab03faadb97b34396831e3780aea1" \
        --tags Key=Name,Value=veris-oidc-provider
    
    log "OIDC provider created: $provider_url"
}

# Create IAM role for Vercel
create_vercel_role() {
    local role_name="veris-vercel-role"
    
    log "Creating IAM role for Vercel: $role_name"
    
    # Check if role already exists
    if aws iam get-role --role-name "$role_name" 2>/dev/null; then
        warn "Role $role_name already exists"
        return 0
    fi
    
    # Create trust policy
    local trust_policy=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):oidc-provider/vercel.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "vercel.com:aud": "vercel"
                }
            }
        }
    ]
}
EOF
)
    
    # Create role
    aws iam create-role \
        --role-name "$role_name" \
        --assume-role-policy-document "$trust_policy" \
        --description "Role for Vercel to access Veris S3 buckets"
    
    # Attach S3 policy
    local s3_policy=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::${REGISTRY_BUCKET_STAGING}",
                "arn:aws:s3:::${REGISTRY_BUCKET_STAGING}/*",
                "arn:aws:s3:::${REGISTRY_BUCKET_PROD}",
                "arn:aws:s3:::${REGISTRY_BUCKET_PROD}/*"
            ]
        }
    ]
}
EOF
)
    
    # Create and attach policy
    aws iam put-role-policy \
        --role-name "$role_name" \
        --policy-name "VerisS3Access" \
        --policy-document "$s3_policy"
    
    log "Vercel role created: $role_name"
}

# Create IAM role for GitHub
create_github_role() {
    local role_name="veris-github-role"
    
    log "Creating IAM role for GitHub: $role_name"
    
    # Check if role already exists
    if aws iam get-role --role-name "$role_name" 2>/dev/null; then
        warn "Role $role_name already exists"
        return 0
    fi
    
    # Create trust policy
    local trust_policy=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Federated": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):oidc-provider/token.actions.githubusercontent.com"
            },
            "Action": "sts:AssumeRoleWithWebIdentity",
            "Condition": {
                "StringEquals": {
                    "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
                },
                "StringLike": {
                    "token.actions.githubusercontent.com:sub": "repo:verisplatform/veris:*"
                }
            }
        }
    ]
}
EOF
)
    
    # Create role
    aws iam create-role \
        --role-name "$role_name" \
        --assume-role-policy-document "$trust_policy" \
        --description "Role for GitHub Actions to access Veris S3 buckets"
    
    # Attach S3 policy
    local s3_policy=$(cat <<EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:GetObject",
                "s3:PutObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::${REGISTRY_BUCKET_STAGING}",
                "arn:aws:s3:::${REGISTRY_BUCKET_STAGING}/*",
                "arn:aws:s3:::${REGISTRY_BUCKET_PROD}",
                "arn:aws:s3:::${REGISTRY_BUCKET_PROD}/*"
            ]
        }
    ]
}
EOF
)
    
    # Create and attach policy
    aws iam put-role-policy \
        --role-name "$role_name" \
        --policy-name "VerisS3Access" \
        --policy-document "$s3_policy"
    
    log "GitHub role created: $role_name"
}

# Main execution function
main() {
    log "Starting AWS S3 bucket and OIDC configuration..."
    
    # Pre-flight checks
    check_aws_cli
    check_env_vars
    
    # Create S3 buckets
    create_bucket "$REGISTRY_BUCKET_STAGING" "$AWS_REGION"
    create_bucket "$REGISTRY_BUCKET_PROD" "$AWS_REGION"
    
    # Configure buckets
    for bucket in "$REGISTRY_BUCKET_STAGING" "$REGISTRY_BUCKET_PROD"; do
        configure_bucket_policy "$bucket"
        configure_bucket_cors "$bucket"
        configure_bucket_versioning "$bucket"
        configure_bucket_lifecycle "$bucket"
    done
    
    # Create OIDC providers
    create_oidc_provider "vercel.com" "vercel"
    create_oidc_provider "token.actions.githubusercontent.com" "sts.amazonaws.com"
    
    # Create IAM roles
    create_vercel_role
    create_github_role
    
    log "AWS S3 bucket and OIDC configuration completed successfully"
    
    # Output role ARNs
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    echo ""
    echo "Role ARNs:"
    echo "  Vercel: arn:aws:iam::$account_id:role/veris-vercel-role"
    echo "  GitHub: arn:aws:iam::$account_id:role/veris-github-role"
    echo ""
    echo "Set these in your environment:"
    echo "  export AWS_ROLE_VERCEL_ARN=arn:aws:iam::$account_id:role/veris-vercel-role"
    echo "  export AWS_ROLE_GITHUB_ARN=arn:aws:iam::$account_id:role/veris-github-role"
}

# Run main function
main "$@"
