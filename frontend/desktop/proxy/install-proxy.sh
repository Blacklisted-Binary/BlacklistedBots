#!/usr/bin/env sh
# install-proxy.sh — Download and install BlacklistedAIProxy source into proxy/src/
# Run from: frontend/desktop/proxy/
set -e

REPO="crazyrob425/BlacklistedAIProxy"
DEST="$(dirname "$0")"

echo "Installing BlacklistedAIProxy dependencies..."
cd "$DEST"
npm install

echo ""
echo "Fetching proxy source from GitHub..."
TMP=$(mktemp -d)
curl -fsSL "https://github.com/${REPO}/archive/refs/heads/main.tar.gz" | tar -xz -C "$TMP"

SRC_DIR=$(ls "$TMP")
cp -r "$TMP/$SRC_DIR/src" "$DEST/"
cp -r "$TMP/$SRC_DIR/static" "$DEST/" 2>/dev/null || true
rm -rf "$TMP"

echo ""
echo "Setting up configs..."
[ -f "$DEST/configs/config.json" ] || cp "$DEST/configs/config.json.example" "$DEST/configs/config.json"
[ -f "$DEST/configs/provider_pools.json" ] || cp "$DEST/configs/provider_pools.json.example" "$DEST/configs/provider_pools.json"

echo ""
echo "Done! BlacklistedAIProxy is ready."
echo "SwarmForge will start it automatically, or run: npm start"
