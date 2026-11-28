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
  // v4.2.0: stable identity so the browser ties installs across updates
  id: `${base || ''}/`,
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

// ---- 1b. service worker cache version -----------------------------------
// The SW only purges old caches when its own bytes change. Sync its cache
// name to the app version on every export so the activate handler always
// clears whatever the previous release cached (v4.2.0 fix — the name had
// been frozen at v3.0.1 for two releases).
const swPath = path.join(distDir, 'sw.js');
if (fs.existsSync(swPath)) {
  const sw = fs.readFileSync(swPath, 'utf8');
  const wanted = `aiserie-v${version}`;
  const patched = sw.replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = '${wanted}';`);
  if (patched !== sw) {
    fs.writeFileSync(swPath, patched);
    console.log(`patch-pwa-html: sw.js CACHE_VERSION synced to ${wanted}.`);
  } else if (sw.includes(wanted)) {
    console.log(`patch-pwa-html: sw.js CACHE_VERSION already ${wanted}.`);
  } else {
    console.warn('patch-pwa-html: sw.js found but CACHE_VERSION pattern not matched — leaving as is.');
  }
} else {
  console.warn('patch-pwa-html: dist/sw.js not found — is public/sw.js present?');
}

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

  // ---- boot splash (v4.5.0) ------------------------------------------------
  // The SPA used to sit on a bare background colour while the JS bundle
  // downloaded — the "loading screen looks shit" report. This paints the
  // Ledger A mark + wordmark immediately (theme-aware, read from the same
  // localStorage key the app persists), then dissolves the moment React
  // mounts. Pure inline CSS/SVG — zero extra network requests.
  const bootCss = `  <style>
#aiserie-boot{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;background:#0B241A;color:#EAF6EE;transition:opacity .45s ease;opacity:1}
#aiserie-boot.light{background:#F4F8F1;color:#12331F}
#aiserie-boot svg{opacity:.95}
#aiserie-boot .ab-word{font:600 11px/1 -apple-system,'Segoe UI',Roboto,'Helvetica Neue',sans-serif;letter-spacing:3.6px;text-transform:uppercase;opacity:.75}
#aiserie-boot .ab-track{width:132px;height:3px;border-radius:2px;background:rgba(127,140,132,.28);overflow:hidden;position:relative}
#aiserie-boot .ab-fill{position:absolute;top:0;bottom:0;width:40%;border-radius:2px;background:#E9C46A;animation:ab-slide 1.15s ease-in-out infinite}
@keyframes ab-slide{0%{left:-40%}100%{left:100%}}
#aiserie-boot.done{opacity:0;pointer-events:none}
  </style>`;
  const bootMarkup = `<div id="aiserie-boot" aria-hidden="true">
    <svg width="66" height="66" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g stroke="currentColor" stroke-width="70" stroke-linecap="round">
        <path d="M512 292 L350 762"/><path d="M512 292 L674 762"/><path d="M436 588 L588 588"/>
      </g>
      <circle cx="512" cy="206" r="28" fill="#E9C46A"/>
    </svg>
    <div class="ab-word">Aiserie Tracks</div>
    <div class="ab-track"><div class="ab-fill"></div></div>
  </div>`;
  const bootScript = [
    '<script>',
    '  (function () {',
    '    try {',
    "      var boot = document.getElementById('aiserie-boot');",
    '      if (!boot) return;',
    "      var mode = null;",
    '      try { mode = localStorage.getItem("aiserie.v1.themeMode"); } catch (e) {}',
    "      if (mode === 'light') boot.classList.add('light');",
    "      else if (mode !== 'dark') {",
    "        if (!window.matchMedia || !window.matchMedia('(prefers-color-scheme: dark)').matches) boot.classList.add('light');",
    '      }',
    '      var finished = false;',
    '      var finish = function () {',
    '        if (finished) return;',
    '        finished = true;',
    "        boot.classList.add('done');",
    '        setTimeout(function () { if (boot.parentNode) boot.parentNode.removeChild(boot); }, 480);',
    '      };',
    "      var root = document.getElementById('root');",
    '      if (root && root.firstElementChild) { finish(); }',
    '      else {',
    '        var obs = new MutationObserver(function () {',
    '          if (root && root.firstElementChild) { obs.disconnect(); finish(); }',
    '        });',
    '        if (root) obs.observe(root, { childList: true });',
    '        setTimeout(finish, 9000);',
    '      }',
    '    } catch (e) {',
    "      var b = document.getElementById('aiserie-boot'); if (b && b.parentNode) b.parentNode.removeChild(b);",
    '    }',
    '  })();',
    '</script>',
  ].join('\n');
  html = html.replace('</head>', `${bootCss}\n</head>`);
  html = html.replace(/<body[^>]*>/, (m0) => `${m0}\n  ${bootMarkup}`);
  html = html.replace('</body>', `${bootScript}\n</body>`);

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
  console.log('patch-pwa-html: index.html patched (manifest link, iOS meta, startup images, boot splash, viewport-fit, service worker).');
}
