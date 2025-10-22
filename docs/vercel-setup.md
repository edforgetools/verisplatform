# Vercel PR Preview Setup

This document explains how to configure Vercel PR previews for your GitHub repository.

## Required GitHub Secrets

You need to add the following secrets to your GitHub repository:

### 1. VERCEL_TOKEN

- Go to [Vercel Dashboard](https://vercel.com/account/tokens)
- Create a new token with appropriate permissions
- Copy the token value
- Add it to your GitHub repository secrets as `VERCEL_TOKEN`

### 2. VERCEL_ORG_ID

- Go to your [Vercel Team Settings](https://vercel.com/account/team)
- Copy your Organization ID
- Add it to your GitHub repository secrets as `VERCEL_ORG_ID`

### 3. VERCEL_PROJECT_ID

- Go to your project in the Vercel Dashboard
- Go to Settings → General
- Copy the Project ID
- Add it to your GitHub repository secrets as `VERCEL_PROJECT_ID`

## How to Add Secrets to GitHub

1. Go to your GitHub repository
2. Click on **Settings** tab
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret**
5. Add each secret with the name and value from above

## What This Enables

Once configured, every pull request will automatically:

- Deploy a preview version to Vercel
- Comment on the PR with:
  - **Preview URL**: Direct link to the deployed preview
  - **Logs URL**: Link to the Vercel deployment logs

## Troubleshooting

### Common Issues

1. **"Invalid token"**: Make sure your Vercel token has the correct permissions
2. **"Project not found"**: Verify the VERCEL_PROJECT_ID is correct
3. **"Organization not found"**: Check that VERCEL_ORG_ID matches your team

### Testing

To test the setup:

1. Create a new branch
2. Make a small change
3. Open a pull request
4. Check the Actions tab for the Vercel deployment
5. Look for the preview comment on the PR

## Environment Variables

The Vercel preview will use the same environment variables as your production deployment. Make sure your Vercel project has all necessary environment variables configured.
