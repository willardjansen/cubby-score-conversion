#!/bin/bash
# Sign native libraries inside Audiveris JAR files for macOS notarization

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AUDIVERIS_APP_DIR="$SCRIPT_DIR/../electron-app/resources/audiveris/app"

# Identity for signing - use environment variable or default
SIGNING_IDENTITY="${APPLE_IDENTITY:-Developer ID Application: Willard Jansen (9N27LU6UBD)}"

echo "=== Signing native libraries in Audiveris JARs ==="
echo "Using identity: $SIGNING_IDENTITY"

# JAR files that contain native macOS libraries
JAR_FILES=(
    "leptonica-1.85.0-1.5.12-macosx-arm64.jar"
    "tesseract-5.5.1-1.5.12-macosx-arm64.jar"
)

cd "$AUDIVERIS_APP_DIR"

for jar in "${JAR_FILES[@]}"; do
    if [ ! -f "$jar" ]; then
        echo "Warning: $jar not found, skipping..."
        continue
    fi

    echo ""
    echo "Processing $jar..."

    # Create temp directory for extraction
    TEMP_DIR=$(mktemp -d)

    # Extract JAR
    echo "  Extracting..."
    unzip -q "$jar" -d "$TEMP_DIR"

    # Find and sign all dylibs
    echo "  Signing dylibs..."
    find "$TEMP_DIR" -name "*.dylib" -type f | while read dylib; do
        echo "    Signing: $(basename "$dylib")"
        codesign --sign "$SIGNING_IDENTITY" \
                 --force \
                 --timestamp \
                 --options runtime \
                 "$dylib"
    done

    # Find and sign any Mach-O executables (like tesseract binary)
    # Note: Don't rely on execute permission since files extracted from JAR may not have it
    echo "  Signing executables..."
    find "$TEMP_DIR" -type f ! -name "*.dylib" ! -name "*.class" ! -name "*.jar" ! -name "*.txt" ! -name "*.xml" ! -name "*.properties" | while read exe; do
        # Check if it's a Mach-O binary
        if file "$exe" 2>/dev/null | grep -q "Mach-O"; then
            echo "    Signing executable: $(basename "$exe")"
            codesign --sign "$SIGNING_IDENTITY" \
                     --force \
                     --timestamp \
                     --options runtime \
                     "$exe"
        fi
    done

    # Repack JAR (preserving original structure)
    echo "  Repacking JAR..."
    rm "$jar"
    cd "$TEMP_DIR"
    zip -q -r "$AUDIVERIS_APP_DIR/$jar" .
    cd "$AUDIVERIS_APP_DIR"

    # Cleanup
    rm -rf "$TEMP_DIR"

    echo "  Done: $jar"
done

echo ""
echo "=== All JAR files processed ==="
