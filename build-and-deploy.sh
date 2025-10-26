#!/bin/bash
set -e

echo "🚀 Starting Veris build and deploy process..."

# Install dependencies at root level
echo "📦 Installing dependencies..."
pnpm install

# Navigate to frontend directory
cd frontend

# Run environment validation
echo "🔍 Validating environment..."
npm run build:validate

# Build the application
echo "🏗️ Building application..."
npm run build

echo "✅ Build completed successfully!"
