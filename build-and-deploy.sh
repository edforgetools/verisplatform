#!/bin/bash
set -e

echo "🚀 Starting Veris build and deploy process..."

# Navigate to frontend directory
cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application directly (skip validation)
echo "🏗️ Building application..."
npx next build

echo "✅ Build completed successfully!"
