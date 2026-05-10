#!/usr/bin/env node
// Syncs CFBundleShortVersionString and CFBundleVersion in Info.plist from app.json.
// Uses PlistBuddy on macOS; falls back to regex on other platforms (e.g. Linux CI).
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));

const version = appJson.expo?.version;
const buildNumber = appJson.expo?.ios?.buildNumber;

if (!version) {
  console.error('sync-ios-version: expo.version missing in app.json');
  process.exit(1);
}
if (!buildNumber) {
  console.error('sync-ios-version: expo.ios.buildNumber missing in app.json');
  process.exit(1);
}

const plistPath = path.join(root, 'ios', 'Mawaqit', 'Info.plist');
const PLIST_BUDDY = '/usr/libexec/PlistBuddy';

if (fs.existsSync(PLIST_BUDDY)) {
  execSync(`"${PLIST_BUDDY}" -c "Set :CFBundleShortVersionString ${version}" "${plistPath}"`);
  execSync(`"${PLIST_BUDDY}" -c "Set :CFBundleVersion ${buildNumber}" "${plistPath}"`);
  console.log(`sync-ios-version: Info.plist updated via PlistBuddy → ${version} (build ${buildNumber})`);
} else {
  // Fallback for non-macOS environments
  const original = fs.readFileSync(plistPath, 'utf8');

  function replacePlistValue(xml, key, value) {
    return xml.replace(
      new RegExp(`(<key>${key}<\\/key>\\s*<string>)[^<]*(<\\/string>)`),
      `$1${value}$2`
    );
  }

  const updated = [
    ['CFBundleShortVersionString', version],
    ['CFBundleVersion', String(buildNumber)],
  ].reduce((xml, [key, val]) => replacePlistValue(xml, key, val), original);

  if (updated === original) {
    console.log(`sync-ios-version: already up to date (${version} / build ${buildNumber})`);
  } else {
    fs.writeFileSync(plistPath, updated, 'utf8');
    console.log(`sync-ios-version: Info.plist updated via regex → ${version} (build ${buildNumber})`);
  }
}
