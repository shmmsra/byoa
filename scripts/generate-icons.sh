#!/bin/bash
# ===========================================================
# generate-icons.sh
# Generate macOS AppIcon and MenuBarIcon from an SVG source.
# Requires: Inkscape (brew install inkscape)
# Usage: ./generate-icons.sh icon.svg
# ===========================================================

set -e

SRC_ICON="$1"
if [ -z "$SRC_ICON" ]; then
  echo "Usage: ./generate-icons.sh <icon.svg>"
  exit 1
fi

if ! command -v inkscape &> /dev/null; then
  echo "Error: Inkscape not found. Install via 'brew install inkscape'"
  exit 1
fi

ASSETS_DIR="app-icons.xcassets"
APPICON_DIR="$ASSETS_DIR/AppIcon.appiconset"
MENUBAR_DIR="$ASSETS_DIR/MenuBarIcon.imageset"

echo "🧩 Generating macOS app-icons.xcassets structure..."

mkdir -p "$APPICON_DIR"
mkdir -p "$MENUBAR_DIR"

# --- App Icon Sizes (macOS standard) ---
# Ref: https://developer.apple.com/design/human-interface-guidelines/app-icons
declare -a APP_SIZES=("16" "32" "64" "128" "256" "512" "1024")

echo "🎨 Generating App Icon PNGs..."
for size in "${APP_SIZES[@]}"; do
  inkscape -w "$size" -h "$size" "$SRC_ICON" -o "$APPICON_DIR/icon_${size}x${size}.png"
done

# Contents.json for AppIcon
cat > "$APPICON_DIR/Contents.json" <<EOF
{
  "images": [
    $(for size in "${APP_SIZES[@]}"; do
      scale=$( [ "$size" -ge 512 ] && echo "2x" || echo "1x" )
      echo "    { \"filename\": \"icon_${size}x${size}.png\", \"idiom\": \"mac\", \"scale\": \"$scale\" },"
    done | sed '$ s/,$//')
  ],
  "info": { "version": 1, "author": "xcode" }
}
EOF

# --- Menu Bar Icon (Monochrome Template) ---
echo "⚙️  Generating Menu Bar Icon PNGs (1x, 2x, 3x)..."
inkscape -w 16 -h 16 "$SRC_ICON" -o "$MENUBAR_DIR/MenuBarIcon.png"
inkscape -w 32 -h 32 "$SRC_ICON" -o "$MENUBAR_DIR/MenuBarIcon@2x.png"
inkscape -w 48 -h 48 "$SRC_ICON" -o "$MENUBAR_DIR/MenuBarIcon@3x.png"

cat > "$MENUBAR_DIR/Contents.json" <<EOF
{
  "images": [
    { "filename": "MenuBarIcon.png", "idiom": "universal", "scale": "1x" },
    { "filename": "MenuBarIcon@2x.png", "idiom": "universal", "scale": "2x" },
    { "filename": "MenuBarIcon@3x.png", "idiom": "universal", "scale": "3x" }
  ],
  "info": { "version": 1, "author": "xcode" },
  "properties": { "template-rendering-intent": "template" }
}
EOF

echo "✅ app-icons.xcassets generated successfully!"
echo "   - AppIcon: $APPICON_DIR"
echo "   - MenuBarIcon: $MENUBAR_DIR"
