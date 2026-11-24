#!/usr/bin/env node
/**
 * Post-export PWA patcher for Aiserie Tracks.
 *
 * Expo's SPA web export ("web.output": "single") emits index.html without a
 * web app manifest and without the iOS meta set. This script makes the output
 * fully installable:
 *   - creates dist/manifest.webmanifest (name, icons 192/512/maskable, standalone)
 *   - injects <link rel="manifest"> + apple-touch-icon + iOS PWA meta tags
 *   - injects per-device apple-touch-startup-image links (iPhone splash)
 *   - adds viewport-fit=cover for notched iPhones
 *   - registers the service worker (offline shell)
 *
 * Idempotent: guarded by an HTML comment marker.
 *
 * Usage: node scripts/patch-pwa-html.mjs [--dir dist] [--base /aiserie-tracks]
 * The base path defaults to app.json's experiments.baseUrl, then "/".
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---- args ---------------------------------------------------------------
const argv = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};
const distDir = path.resolve(repoRoot, getArg('--dir', 'dist'));

// ---- app config ---------------------------------------------------------
const appJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'app.json'), 'utf8'));
const expo = appJson.expo || {};
const base = (getArg('--base', expo.experiments?.baseUrl || appJson.experiments?.baseUrl || '') || '').replace(/\/$/, '');
const withBase = (p) => `${base}${p}`;

const appName = expo.name || 'Aiserie Tracks';
const shortName = expo.web?.shortName || 'Aiserie';
const themeColor = expo.web?.themeColor || '#0EA5E9';
const bgColor = expo.web?.backgroundColor || '#F2F9FE';
const description = expo.web?.description || 'Personal finance tracker.';
const version = expo.version || '1.0.0';

const indexHtmlPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  console.error(`patch-pwa-html: ${indexHtmlPath} not found — run "expo export --platform web" first.`);
  process.exit(1);
}

// ---- 1. manifest --------------------------------------------------------
const manifestRelative = 'manifest.webmanifest';
const manifestPath = path.join(distDir, manifestRelative);
const manifest = {
  name: appName,
  short_name: shortName,
  description,
  lang: expo.web?.lang || 'en',
  start_url: `${base || ''}/`,
  scope: `${base || ''}/`,
  display: 'standalone',
  orientation: 'portrait',
  background_color: bgColor,
  theme_color: themeColor,
  version,
  icons: [
    { src: withBase('/icons/icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: withBase('/icons/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: withBase('/icons/icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('patch-pwa-html: manifest.webmanifest written (icons 192/512/maskable, standalone).');

// ---- 2. index.html ------------------------------------------------------
let html = fs.readFileSync(indexHtmlPath, 'utf8');
const MARKER = '<!-- aiserie-pwa-patch -->';

if (html.includes(MARKER)) {
  console.log('patch-pwa-html: index.html already patched, refreshing manifest link only.');
} else {
  const startupDevices = [
    [320, 568, 2],
    [375, 667, 2],
    [375, 812, 3],
    [390, 844, 3],
    [393, 852, 3],
    [402, 874, 3],
    [414, 896, 2],
    [414, 896, 3],
    [430, 932, 3],
    [440, 956, 3],
    [768, 1024, 2],
    [820, 1180, 2],
    [834, 1194, 2],
    [1024, 1366, 2],
  ];
  const startupLinks = startupDevices
    .map(
      ([dw, dh, dpr]) =>
        `  <link rel="apple-touch-startup-image" media="screen and (device-width: ${dw}px) and (device-height: ${dh}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)" href="${withBase(`/splash/startup-${dw}x${dh}-${dpr}x.png`)}">`
    )
    .join('\n');

  const inject = [
    MARKER,
    `  <link rel="manifest" href="${withBase(`/${manifestRelative}`)}">`,
    '  <meta name="mobile-web-app-capable" content="yes">',
    '  <meta name="apple-mobile-web-app-capable" content="yes">',
    `  <meta name="apple-mobile-web-app-title" content="${shortName}">`,
    '  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
    `  <meta name="theme-color" media="(prefers-color-scheme: light)" content="${themeColor}">`,
    `  <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#050E18">`,
    `  <link rel="apple-touch-icon" href="${withBase('/apple-touch-icon.png')}">`,
    startupLinks,
  ].join('\n');

  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>\n${inject}`);
  } else {
    html = html.replace(/<meta[^>]*>/, `${inject}\n$&`);
  }

  // Notch-friendly viewport for standalone mode (keep existing width settings).
  html = html.replace(
    /<meta name="viewport" content="([^"]*)"\s*\/>/,
    (m0, content) =>
      content.includes('viewport-fit')
        ? m0
        : `<meta name="viewport" content="${content}, viewport-fit=cover" />`
  );

  const swScript = [
    '<script>',
    "  if ('serviceWorker' in navigator) {",
    "    window.addEventListener('load', function () {",
    "      navigator.serviceWorker.register('./sw.js').catch(function () {});",
    '    });',
    '  }',
    '</script>',
  ].join('\n');
  html = html.replace('</body>', `${swScript}\n</body>`);

  fs.writeFileSync(indexHtmlPath, html);
  console.log('patch-pwa-html: index.html patched (manifest link, iOS meta, startup images, viewport-fit, service worker).');
}
