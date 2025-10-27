#!/bin/bash
# Build and deploy script for Veris MVP

set -e

echo "🚀 Building Veris frontend..."

cd frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build Next.js app
echo "🔨 Building Next.js application..."
npm run build

echo "✅ Build complete!"

