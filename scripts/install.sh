#!/bin/bash
set -e

REPO="shmmsra/byoa"
INSTALL_DIR="$HOME/Applications"
APP_NAME="BYOAssistant.app"

# Ensure install directory exists
mkdir -p "$INSTALL_DIR"

echo "Finding latest release..."
# Get the browser_download_url for the file named byoa-macos-*-app.zip
LATEST_RELEASE_URL=$(curl -s "https://api.github.com/repos/$REPO/releases/latest" | grep "browser_download_url.*byoa-macos-.*zip" | cut -d '"' -f 4)

if [ -z "$LATEST_RELEASE_URL" ]; then
    echo "Error: Could not find a release for macOS."
    exit 1
fi

echo "Found release artifact: $LATEST_RELEASE_URL"
echo "Downloading..."
TEMP_ZIP=$(mktemp -t byoa_install.zip)
curl -L -o "$TEMP_ZIP" "$LATEST_RELEASE_URL"

echo "Installing to $INSTALL_DIR..."
# Remove existing app if present to avoid conflicts
if [ -d "$INSTALL_DIR/$APP_NAME" ]; then
    echo "Removing existing installation..."
    rm -rf "$INSTALL_DIR/$APP_NAME"
fi

# Ensure unzip is available (usually standard on macOS)
if ! command -v unzip &> /dev/null; then
    echo "Error: 'unzip' is not installed."
    rm "$TEMP_ZIP"
    exit 1
fi

# Unzip
echo "Extracting..."
unzip -q "$TEMP_ZIP" -d "$INSTALL_DIR"

# Clean up zip
rm "$TEMP_ZIP"

# Remove quarantine attribute to verify it runs without "damaged" warning
if [ -d "$INSTALL_DIR/$APP_NAME" ]; then
    echo "Removing quarantine attribute..."
    xattr -cr "$INSTALL_DIR/$APP_NAME"
else
    echo "Error: App not found after extraction. Installation failed."
    exit 1
fi

echo "Installation complete! You can find BYOA in your Applications folder."
echo "Open it with: open \"$INSTALL_DIR/$APP_NAME\""
