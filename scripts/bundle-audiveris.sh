#!/bin/bash
# Bundle Audiveris with embedded JRE for CubbyScore
# Downloads JRE and Audiveris for the target platform

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ELECTRON_DIR="$PROJECT_ROOT/electron-app"
RESOURCES_DIR="$ELECTRON_DIR/resources"
AUDIVERIS_DIR="$RESOURCES_DIR/audiveris"

# Detect architecture
ARCH=$(uname -m)
OS=$(uname -s)

echo "=== Bundling Audiveris for $OS $ARCH ==="

# Create directories
mkdir -p "$AUDIVERIS_DIR/bin"
mkdir -p "$AUDIVERIS_DIR/jre"

# For macOS, we can copy from the installed Audiveris.app
if [[ "$OS" == "Darwin" ]]; then
    AUDIVERIS_APP="/Applications/Audiveris.app"

    if [[ -d "$AUDIVERIS_APP" ]]; then
        echo "Copying Audiveris from installed app..."

        # Copy Audiveris application
        cp -r "$AUDIVERIS_APP/Contents/app/" "$AUDIVERIS_DIR/app/"
        cp -r "$AUDIVERIS_APP/Contents/runtime/" "$AUDIVERIS_DIR/jre/"

        # Create launcher script that mimics the jpackage launcher
        cat > "$AUDIVERIS_DIR/bin/Audiveris" << 'EOF'
#!/bin/bash
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
AUDIVERIS_HOME="$(dirname "$SCRIPT_DIR")"
JAVA_HOME="$AUDIVERIS_HOME/jre/Contents/Home"
APP_DIR="$AUDIVERIS_HOME/app"

export JAVA_HOME
export PATH="$JAVA_HOME/bin:$PATH"

# Build classpath from all jars in app directory
CLASSPATH=""
for jar in "$APP_DIR"/*.jar; do
    if [[ -z "$CLASSPATH" ]]; then
        CLASSPATH="$jar"
    else
        CLASSPATH="$CLASSPATH:$jar"
    fi
done

# Run Audiveris with all the necessary options
exec "$JAVA_HOME/bin/java" \
    -Xms512m \
    -Xmx4G \
    -Djpackage.app-version=5.9.0 \
    --add-exports=java.desktop/sun.awt.image=ALL-UNNAMED \
    --enable-native-access=ALL-UNNAMED \
    -Dfile.encoding=UTF-8 \
    -cp "$CLASSPATH" \
    Audiveris \
    "$@"
EOF
        chmod +x "$AUDIVERIS_DIR/bin/Audiveris"

        echo "Audiveris bundled successfully!"
    else
        echo "Warning: Audiveris.app not found at $AUDIVERIS_APP"
        echo "Please install Audiveris first or download manually"
        exit 1
    fi
else
    echo "Platform not yet supported for bundling: $OS"
    echo "Manual setup required for Windows/Linux"
    exit 1
fi

echo "=== Audiveris bundle complete ==="
echo "Output at: $AUDIVERIS_DIR"
ls -la "$AUDIVERIS_DIR"

# Verify it works
echo ""
echo "Testing Audiveris..."
"$AUDIVERIS_DIR/bin/Audiveris" -help 2>&1 | head -5
