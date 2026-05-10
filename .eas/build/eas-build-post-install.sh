#!/usr/bin/env bash
set -euo pipefail

echo "==> Syncing iOS Info.plist version from app.json"
node scripts/sync-ios-version.js
