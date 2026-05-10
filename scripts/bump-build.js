#!/usr/bin/env node
// Increments expo.ios.buildNumber in app.json and syncs Info.plist.
// Usage: npm run bump-build
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const appJsonPath = path.join(root, 'app.json');

const raw = fs.readFileSync(appJsonPath, 'utf8');
const appJson = JSON.parse(raw);

const current = parseInt(appJson.expo?.ios?.buildNumber ?? '0', 10);
if (isNaN(current)) {
  console.error('bump-build: expo.ios.buildNumber is not a number in app.json');
  process.exit(1);
}

const next = current + 1;
appJson.expo.ios.buildNumber = String(next);

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
console.log(`bump-build: buildNumber ${current} → ${next}`);

execSync(`node "${path.join(__dirname, 'sync-ios-version.js')}"`, { stdio: 'inherit' });
