#!/usr/bin/env node
/**
 * Publishes the freshly built EAS Android APK as a GitHub Release.
 *
 * Called from .github/workflows/eas-build.yml after a successful `eas build`.
 * Steps:
 *  1. read the app version from app.json
 *  2. ask EAS for the newest finished Android build and find its APK URL
 *  3. download the APK
 *  4. create (or reuse) the GitHub Release v<version> and upload the asset
 *
 * Required env:
 *   EXPO_TOKEN  — Expo access token (repo secret, used by the eas CLI)
 *   GH_TOKEN    — GitHub token with contents:write (github.token)
 *   GITHUB_REPOSITORY — owner/name (provided by Actions)
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], ...opts }).trim();
}

function scanForApkUrl(node, depth = 0) {
  if (depth > 8 || node == null) return null;
  if (typeof node === 'string') {
    return /^https:\/\/[^\s']+\.apk(\?[^\s']*)?$/.test(node) ? node : null;
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = scanForApkUrl(item, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof node === 'object') {
    for (const value of Object.values(node)) {
      const hit = scanForApkUrl(value, depth + 1);
      if (hit) return hit;
    }
  }
  return null;
}

async function main() {
  const version = JSON.parse(readFileSync('app.json', 'utf8')).expo.version;
  const tag = `v${version}`;
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error('GITHUB_REPOSITORY is not set');

  console.log(`Publishing release ${tag} for ${repo}`);

  // 1. newest finished Android build from EAS (project context comes from app.json)
  const listJson = sh('eas', ['build:list', '--platform', 'android', '--limit', '10', '--json', '--non-interactive']);
  const builds = JSON.parse(listJson);
  const finished = (Array.isArray(builds) ? builds : []).filter((b) => b && b.status === 'FINISHED');
  if (!finished.length) throw new Error('No finished Android EAS builds found');
  const build = finished[0]; // build:list returns newest first
  const apkUrl = scanForApkUrl(build);
  if (!apkUrl) throw new Error(`No .apk artifact URL on build ${build.id ?? '?'} — got: ${JSON.stringify(build.artifacts ?? {})}`);
  console.log(`EAS build ${build.id}: ${apkUrl}`);

  // 2. download the APK
  const apkName = `AiserieTracks-${tag}.apk`;
  const res = await fetch(apkUrl);
  if (!res.ok) throw new Error(`APK download failed: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(apkName, buf);
  console.log(`Downloaded ${apkName} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);

  // 3. release notes — v4.2.0: read RELEASE_NOTES.md (kept current with each
  // release); RELEASE_NOTES env still wins if a workflow supplies it inline
  let notes = process.env.RELEASE_NOTES || `Aiserie Tracks ${tag}`;
  try {
    const notesFile = process.env.RELEASE_NOTES_FILE || 'RELEASE_NOTES.md';
    if (!process.env.RELEASE_NOTES && existsSync(notesFile)) {
      notes = readFileSync(notesFile, 'utf8').trim();
    }
  } catch {
    /* fall back to the generic note */
  }

  // 4. create or reuse the release, then upload the asset
  const gh = (...args) => sh('gh', args, { env: { ...process.env, GH_TOKEN: process.env.GH_TOKEN } });
  let exists = true;
  try {
    gh('release', 'view', tag, '--repo', repo);
  } catch {
    exists = false;
  }
  if (!exists) {
    gh('release', 'create', tag, '--repo', repo, '--title', `Aiserie Tracks ${tag}`, '--notes', notes);
    console.log(`Created release ${tag}`);
  } else {
    console.log(`Release ${tag} already exists — uploading asset with --clobber`);
  }
  gh('release', 'upload', tag, apkName, '--repo', repo, '--clobber');
  console.log(`Uploaded ${apkName} to ${tag}`);
  try {
    unlinkSync(apkName);
  } catch {}
}

main().catch((err) => {
  console.error('Release publishing failed:', err?.message ?? err);
  process.exit(1);
});
