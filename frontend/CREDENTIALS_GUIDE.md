# 🔐 Credentials Setup Guide

This guide will help you get the required credentials from your Supabase and Stripe accounts.

## 📋 Required Credentials

### 🔗 Supabase Credentials

1. **Project URL**: `https://your-project.supabase.co`
2. **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (public key)
3. **Service Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (secret key)

### 💳 Stripe Credentials

1. **Secret Key**: `sk_test_...` or `sk_live_...`
2. **Publishable Key**: `pk_test_...` or `pk_live_...`
3. **Webhook Secret**: `whsec_...`

## 🚀 Quick Setup Steps

### Step 1: Get Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (from "Project URL" section)
   - **anon public** key (from "Project API keys" section)
   - **service_role secret** key (from "Project API keys" section)

### Step 2: Get Stripe Credentials

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)
3. Go to [Webhooks](https://dashboard.stripe.com/webhooks)
4. Create a new endpoint:
   - **Endpoint URL**: `https://your-vercel-app.vercel.app/api/stripe/webhook`
   - **Events**: Select all events or at least: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
5. Copy the **Signing secret** (starts with `whsec_`)

### Step 3: Run the Setup Script

```bash
cd frontend
./setup-real-credentials.sh
```

The script will:

- ✅ Prompt you for all credentials
- ✅ Validate the format of your keys
- ✅ Update your local `.env.local` file
- ✅ Update Vercel environment variables
- ✅ Generate additional security keys
- ✅ Create backups of existing files

## 🔒 Security Notes

- **Never commit** `.env.local` to git
- **Keep your API keys** secure and private
- **Use test keys** for development
- **Use live keys** only for production
- **Rotate keys** regularly for security

## 🧪 Testing

After setup, test your configuration:

```bash
# Test locally
npm run dev

# Test build
npm run build

# Deploy to Vercel
vercel --prod
```

## 🆘 Troubleshooting

### Common Issues:

1. **Invalid Supabase URL**: Make sure it's `https://your-project.supabase.co`
2. **Invalid Stripe Key**: Make sure it starts with `sk_test_` or `sk_live_`
3. **Webhook Issues**: Make sure the webhook URL is correct and accessible
4. **Permission Issues**: Make sure your Supabase service key has the right permissions

### Getting Help:

- Check the [Supabase Docs](https://supabase.com/docs)
- Check the [Stripe Docs](https://stripe.com/docs)
- Review the application logs for specific error messages
