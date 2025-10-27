# 🚀 Quick Setup Guide - Command Line Configuration

## ✅ **What I've Set Up For You**

I've created everything you need to configure all services from the command line:

### **📋 Files Created**

- **`SERVICE_AUTHENTICATION_GUIDE.md`** - Detailed step-by-step guide
- **`scripts/configure-services.sh`** - Interactive script to configure everything
- **CLI tools installed**: AWS CLI, Vercel CLI, Supabase CLI

## 🎯 **What You Need to Do**

### **Step 1: Get Your Credentials**

You need to get these from your service dashboards:

#### **Supabase**

1. Go to https://supabase.com/dashboard
2. Profile > Access Tokens > Generate new token
3. Copy the token

#### **Stripe**

1. Go to https://dashboard.stripe.com
2. Developers > API keys
3. Copy secret keys (sk*test*... and sk*live*...)
4. Create webhook endpoints and get webhook secrets (whsec\_...)

#### **AWS**

1. Go to https://console.aws.amazon.com/iam
2. Users > Create user > Attach S3 policies
3. Create access key and copy credentials

#### **Vercel**

1. Go to https://vercel.com/account/tokens
2. Create token
3. Get project ID and org ID from project settings

### **Step 2: Run the Configuration Script**

```bash
cd /Users/edbrooks/veris
./scripts/configure-services.sh
```

This script will:

- ✅ Prompt you for all credentials
- ✅ Test connections to all services
- ✅ Create S3 buckets automatically
- ✅ Generate cryptographic keys
- ✅ Create GitHub secrets summary file
- ✅ Create local environment file
- ✅ Test all configurations

### **Step 3: Add GitHub Secrets**

The script will create `github-secrets-summary.txt` with all the secrets you need to add to GitHub.

## 🔧 **What I Can Do From CLI**

Once you have the credentials, I can:

### **✅ Automatically Configure**

- **Supabase**: Login, list projects, test connections
- **AWS**: Configure CLI, create S3 buckets, test access
- **Vercel**: Login, link project, test deployment
- **Stripe**: Test API connections
- **Keys**: Generate cryptographic keys
- **Environment**: Create all config files

### **✅ Test Everything**

- Run all validation scripts
- Test external service connections
- Verify environment configuration
- Check pilot readiness

### **✅ Deploy**

- Push changes to trigger workflows
- Monitor deployment status
- Test deployed endpoints

## 🎯 **Quick Start**

1. **Get your credentials** (5-10 minutes)
2. **Run the script**: `./scripts/configure-services.sh`
3. **Add GitHub secrets** from the generated file
4. **Test deployment** by pushing to develop branch

## 📞 **Need Help?**

The script is interactive and will guide you through each step. If you get stuck:

1. **Check the guide**: `SERVICE_AUTHENTICATION_GUIDE.md`
2. **Run validation**: `cd frontend && pnpm run validate-services`
3. **Check logs**: The script shows detailed output for each step

**Once you have the credentials, I can configure everything automatically from the command line!** 🚀
