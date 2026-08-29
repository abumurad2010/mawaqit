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

// Guard: the JS_BUILD_MARKER literal in app/about.tsx must match app.json version.
// If it drifts, a stale Metro bundle shipped against a fresh native binary will render
// as "1.3.8 · JS:1.3.7" on the About screen — this check fails loud before that ships.
const aboutPath = path.join(root, 'app', 'about.tsx');
const aboutSrc = fs.readFileSync(aboutPath, 'utf8');
const markerMatch = aboutSrc.match(/const\s+JS_BUILD_MARKER\s*:\s*string\s*=\s*'([^']+)'/);
if (!markerMatch) {
  console.error('sync-ios-version: JS_BUILD_MARKER literal not found in app/about.tsx');
  process.exit(1);
}
if (markerMatch[1] !== version) {
  console.error(
    `sync-ios-version: JS_BUILD_MARKER mismatch — app.json version="${version}" ` +
    `but app/about.tsx JS_BUILD_MARKER="${markerMatch[1]}". Update the literal.`
  );
  process.exit(1);
}

// Both plists must move together. Apple rejects an app extension whose
// CFBundleVersion differs from its containing app's (App Store Connect
// error ITMS-90478 or similar), so drift between these two is a submission
// blocker. Writing both from the same source (app.json) here means the two
// physically cannot fall out of sync unless someone edits one by hand.
const PLIST_TARGETS = [
  { name: 'main app', path: path.join(root, 'ios', 'Mawaqit',       'Info.plist') },
  { name: 'widget',   path: path.join(root, 'ios', 'MawaqitWidget', 'Info.plist') },
];
const PLIST_BUDDY = '/usr/libexec/PlistBuddy';

function replacePlistValue(xml, key, value) {
  return xml.replace(
    new RegExp(`(<key>${key}<\\/key>\\s*<string>)[^<]*(<\\/string>)`),
    `$1${value}$2`
  );
}

for (const target of PLIST_TARGETS) {
  if (!fs.existsSync(target.path)) {
    console.error(`sync-ios-version: missing ${target.name} plist at ${target.path}`);
    process.exit(1);
  }
  if (fs.existsSync(PLIST_BUDDY)) {
    execSync(`"${PLIST_BUDDY}" -c "Set :CFBundleShortVersionString ${version}" "${target.path}"`);
    execSync(`"${PLIST_BUDDY}" -c "Set :CFBundleVersion ${buildNumber}" "${target.path}"`);
    console.log(`sync-ios-version: ${target.name} Info.plist updated via PlistBuddy → ${version} (build ${buildNumber}) [${target.path}]`);
  } else {
    // Fallback for non-macOS environments
    const original = fs.readFileSync(target.path, 'utf8');
    const updated = [
      ['CFBundleShortVersionString', version],
      ['CFBundleVersion', String(buildNumber)],
    ].reduce((xml, [key, val]) => replacePlistValue(xml, key, val), original);
    if (updated === original) {
      console.log(`sync-ios-version: ${target.name} Info.plist already up to date (${version} / build ${buildNumber})`);
    } else {
      fs.writeFileSync(target.path, updated, 'utf8');
      console.log(`sync-ios-version: ${target.name} Info.plist updated via regex → ${version} (build ${buildNumber}) [${target.path}]`);
    }
  }
}
