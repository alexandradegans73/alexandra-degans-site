/**
 * Ajoute une politique de sécurité (CSP) et une politique de référent à chaque page générée.
 * GitHub Pages ne permet pas d'envoyer des en-têtes HTTP : on les pose en balises <meta>.
 * Lancé automatiquement après `npm run build` (script « postbuild »).
 *
 * - Scripts : uniquement ceux du site (/_astro) + les scripts internes de la page, autorisés par empreinte SHA-256.
 * - Styles : 'unsafe-inline' reste nécessaire (attributs style="" du gabarit et des animations).
 * - Connexions : le site et l'API de réservation uniquement.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const API = 'https://reservation.alexandra-degans.workers.dev';

const pages = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) pages.push(p);
  }
})(DIST);

let count = 0;
for (const file of pages) {
  let html = readFileSync(file, 'utf8');
  if (html.includes('http-equiv="Content-Security-Policy"')) continue;
  const hashes = new Set();
  for (const m of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1] || '';
    if (/\ssrc=/.test(attrs) || /type="application\/(ld\+)?json"/.test(attrs)) continue;
    if (!m[2]) continue;
    hashes.add(`'sha256-${createHash('sha256').update(m[2], 'utf8').digest('base64')}'`);
  }
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${[...hashes].join(' ')}`.trim(),
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self'",
    `connect-src 'self' ${API}`,
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
  const tags = `<meta http-equiv="Content-Security-Policy" content="${csp}"><meta name="referrer" content="strict-origin-when-cross-origin">`;
  let at = html.search(/<meta charset[^>]*>/i);
  if (at < 0) at = html.search(/<head[^>]*>/i);
  if (at < 0) continue;
  const close = html.indexOf('>', at) + 1;
  html = html.slice(0, close) + tags + html.slice(close);
  writeFileSync(file, html);
  count++;
}
console.log(`CSP ajoutée à ${count} page(s).`);
