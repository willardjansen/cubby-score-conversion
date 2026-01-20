#!/bin/bash
# Master build script for CubbyScore Converter
# Builds backend, bundles Audiveris, and creates Electron app

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ELECTRON_DIR="$PROJECT_ROOT/electron-app"

echo "============================================"
echo "  Building CubbyScore Converter"
echo "============================================"
echo ""

# Step 1: Bundle Audiveris
echo "Step 1: Bundling Audiveris..."
bash "$SCRIPT_DIR/bundle-audiveris.sh"
echo ""

# Step 2: Build Python backend
echo "Step 2: Building Python backend..."
bash "$SCRIPT_DIR/build-backend.sh"
echo ""

# Step 3: Build Electron app
echo "Step 3: Building Electron app..."
cd "$ELECTRON_DIR"

# Install dependencies if needed
if [[ ! -d "node_modules" ]]; then
    echo "Installing npm dependencies..."
    npm install
fi

# Build Next.js
echo "Building Next.js frontend..."
npm run build

# Build Electron for macOS (both architectures)
echo "Building Electron app for macOS..."
npm run electron:build:mac

echo ""
echo "============================================"
echo "  Build complete!"
echo "============================================"
echo ""
echo "Installer location: $ELECTRON_DIR/dist/"
ls -la "$ELECTRON_DIR/dist/" | grep -E '\.(dmg|zip)$' || echo "No installers found yet"
