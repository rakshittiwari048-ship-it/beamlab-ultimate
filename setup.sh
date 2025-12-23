#!/bin/bash

# BeamLab Ultimate - Quick Setup Script
# This script automates the setup process for development

set -e  # Exit on error

echo "🏗️  BeamLab Ultimate - Setup Script"
echo "===================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current: $(node -v)"
    exit 1
fi
echo "✅ Node.js $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed."
    exit 1
fi
echo "✅ npm $(npm -v)"

# Check MongoDB
if ! command -v mongod &> /dev/null && ! command -v mongo &> /dev/null; then
    echo "⚠️  MongoDB not found in PATH. Make sure MongoDB is installed and running."
    echo "   You can install it via:"
    echo "   - macOS: brew install mongodb-community"
    echo "   - Linux: apt-get install mongodb-org"
else
    echo "✅ MongoDB found"
fi

echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔨 Building shared packages..."

# Build types package
echo "   Building @beamlab/types..."
cd packages/types
npm run build
cd ../..

# Build analysis engine
echo "   Building @beamlab/analysis-engine..."
cd packages/analysis-engine
npm run build
cd ../..

echo ""
echo "⚙️  Configuring environment..."

# Create backend .env if it doesn't exist
if [ ! -f "apps/backend/.env" ]; then
    echo "   Creating backend .env file..."
    cp apps/backend/.env.example apps/backend/.env
    echo "✅ Created apps/backend/.env (please review and update if needed)"
else
    echo "✅ Backend .env already exists"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Next steps:"
echo "   1. Make sure MongoDB is running:"
echo "      - macOS: brew services start mongodb-community"
echo "      - Linux: sudo systemctl start mongod"
echo "      - Manual: mongod --dbpath /path/to/data"
echo ""
echo "   2. Start the development servers:"
echo "      npm run dev"
echo ""
echo "   3. Open your browser:"
echo "      Frontend: http://localhost:5173"
echo "      Backend:  http://localhost:3000"
echo ""
echo "📖 For detailed documentation, see:"
echo "   - SETUP.md - Installation guide"
echo "   - PROJECT_OVERVIEW.md - Technical documentation"
echo "   - README.md - Quick introduction"
echo ""
echo "Happy coding! 🎉"
