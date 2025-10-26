# 🔐 Service Authentication Setup Guide

## 📋 **Step-by-Step Authentication Setup**

Since you've already set up accounts with Supabase, Stripe, AWS, and Vercel, here's how to get all the necessary credentials and configure them from the command line.

## 🌐 **1. Supabase Setup**

### **Get Supabase Access Token**

1. Go to https://supabase.com/dashboard
2. Click on your profile (top right)
3. Go to **Access Tokens**
4. Click **Generate new token**
5. Give it a name (e.g., "CLI Token")
6. Copy the token

### **Configure Supabase CLI**

```bash
# Set the access token
export SUPABASE_ACCESS_TOKEN="your-token-here"

# Login to Supabase
npx supabase login --token $SUPABASE_ACCESS_TOKEN

# List your projects
npx supabase projects list
```

### **Get Project Details**

For each project (staging and production):

1. Go to **Settings > API**
2. Copy:
   - **Project URL** (e.g., `https://your-project.supabase.co`)
   - **anon key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)
   - **service_role key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`)

## 💳 **2. Stripe Setup**

### **Get Stripe API Keys**

1. Go to https://dashboard.stripe.com
2. For **staging**: Use test mode (toggle in top left)
3. Go to **Developers > API keys**
4. Copy:
   - **Secret key** (starts with `sk_test_...` for staging, `sk_live_...` for production)
   - **Publishable key** (starts with `pk_test_...` for staging, `pk_live_...` for production)

### **Create Webhook Endpoints**

1. Go to **Developers > Webhooks**
2. Click **Add endpoint**
3. Set URL to: `https://your-app.vercel.app/api/stripe/webhook`
4. Select events: `checkout.session.completed`, `invoice.payment_succeeded`
5. Copy the **webhook secret** (starts with `whsec_...`)

## ☁️ **3. AWS Setup**

### **Create IAM User**

1. Go to https://console.aws.amazon.com/iam
2. Click **Users > Create user**
3. Username: `veris-deployment`
4. Attach policies: `AmazonS3FullAccess`
5. Create access key
6. Copy:
   - **Access Key ID**
   - **Secret Access Key**

### **Configure AWS CLI**

```bash
# Configure AWS CLI
aws configure

# Enter your credentials:
# AWS Access Key ID: [your-access-key]
# AWS Secret Access Key: [your-secret-key]
# Default region name: us-east-1
# Default output format: json
```

### **Create S3 Buckets**

```bash
# Create staging bucket
aws s3 mb s3://veris-registry-staging

# Create production bucket
aws s3 mb s3://veris-registry-prod

# List buckets to verify
aws s3 ls
```

## 🚀 **4. Vercel Setup**

### **Get Vercel Token**

1. Go to https://vercel.com/account/tokens
2. Click **Create Token**
3. Name: `GitHub Actions`
4. Scope: **Full Account**
5. Copy the token

### **Get Project Details**

1. Go to your project dashboard
2. Go to **Settings > General**
3. Copy:
   - **Project ID**
   - **Team ID** (Organization ID)

### **Configure Vercel CLI**

```bash
# Login to Vercel
vercel login

# Link project
vercel link

# Enter:
# - Project name: verisplatform
# - Team: [your-team]
# - Directory: ./frontend
```

## 🔑 **5. Generate Cryptographic Keys**

```bash
# Generate new keys
cd frontend && pnpm run generate-keys

# This will create:
# - frontend/keys/private-key-[timestamp].pem
# - frontend/keys/public-key-[timestamp].pem
```

## 📝 **6. Create Environment Files**

### **Create Local Environment File**

```bash
# Copy example environment file
cp frontend/env.example frontend/.env.local

# Edit with your values
nano frontend/.env.local
```

### **Environment Variables to Set**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# AWS
AWS_REGION=us-east-1
REGISTRY_BUCKET_STAGING=veris-registry-staging
REGISTRY_BUCKET_PROD=veris-registry-prod

# Vercel
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id

# App URLs
APP_BASE_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## 🧪 **7. Test All Services**

### **Test Supabase**

```bash
# Test Supabase connection
npx supabase projects list
```

### **Test AWS**

```bash
# Test AWS connection
aws sts get-caller-identity
aws s3 ls
```

### **Test Vercel**

```bash
# Test Vercel connection
vercel whoami
vercel projects list
```

### **Test Stripe**

```bash
# Test Stripe connection (using Node.js)
node -e "
const Stripe = require('stripe');
const stripe = new Stripe('sk_test_your_key');
stripe.balance.retrieve().then(console.log);
"
```

## 🔐 **8. Set Up GitHub Secrets**

Once you have all the credentials, add them to GitHub:

1. Go to your GitHub repository
2. **Settings > Secrets and variables > Actions**
3. Add each secret with the exact names from the list

## ✅ **9. Validate Everything**

```bash
# Run all validation scripts
cd frontend && pnpm run validate-services
cd frontend && pnpm run validate-env
cd frontend && pnpm run test:pilot-readiness
```

## 🎯 **Quick Start Commands**

Here are the commands you can run once you have the credentials:

```bash
# 1. Set environment variables
export SUPABASE_ACCESS_TOKEN="your-token"
export VERCEL_TOKEN="your-token"

# 2. Login to services
npx supabase login --token $SUPABASE_ACCESS_TOKEN
aws configure  # Enter your AWS credentials
vercel login   # Login to Vercel

# 3. Create AWS resources
aws s3 mb s3://veris-registry-staging
aws s3 mb s3://veris-registry-prod

# 4. Generate keys
cd frontend && pnpm run generate-keys

# 5. Test everything
cd frontend && pnpm run validate-services
```

## 📞 **Need Help?**

If you get stuck on any step:

1. Check the service documentation
2. Run the validation scripts to see what's missing
3. Check the logs for detailed error messages

**Once you have all the credentials, I can help you configure everything from the command line!**
