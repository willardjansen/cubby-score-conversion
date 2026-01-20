#!/bin/bash
# Build script for CubbyScore backend
# Bundles Python backend with PyInstaller for macOS

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/backend"
ELECTRON_DIR="$PROJECT_ROOT/electron-app"
RESOURCES_DIR="$ELECTRON_DIR/resources"

echo "=== Building CubbyScore Backend ==="
echo "Backend dir: $BACKEND_DIR"
echo "Output dir: $RESOURCES_DIR/backend"

# Activate virtual environment
cd "$BACKEND_DIR"
source venv/bin/activate

# Clean previous builds
rm -rf build dist

# Build with PyInstaller
echo "Running PyInstaller..."
pyinstaller cubbyscore-backend.spec --noconfirm

# Copy to Electron resources
echo "Copying to Electron resources..."
mkdir -p "$RESOURCES_DIR/backend"
cp -r dist/cubbyscore-backend/* "$RESOURCES_DIR/backend/"

# Create uploads/outputs directories
mkdir -p "$RESOURCES_DIR/backend/uploads"
mkdir -p "$RESOURCES_DIR/backend/outputs"

echo "=== Backend build complete ==="
echo "Output at: $RESOURCES_DIR/backend"
ls -la "$RESOURCES_DIR/backend"
