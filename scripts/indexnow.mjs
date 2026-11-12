/**
 * IndexNow : signale à Bing (et Yandex, Seznam…) les pages modifiées par un push.
 * Usage : node scripts/indexnow.mjs <sha-avant> <sha-après>
 * Lancé par le workflow de déploiement, après la mise en ligne.
 * La clé est publiée dans public/<clé>.txt — ne pas supprimer ce fichier.
 */
import { execSync } from 'node:child_process';

const KEY = '259ddbb203a2642861c5aca0fe85775d';
const HOST = 'alexandradegans-kinesiologie.com';
const SITE = `https://${HOST}`;
const [before, after] = process.argv.slice(2);

let files = [];
try {
  const range = before && !/^0+$/.test(before) ? `${before} ${after}` : `${after}~1 ${after}`;
  files = execSync(`git diff --name-only --diff-filter=AM ${range}`, { encoding: 'utf8' }).split('\n').filter(Boolean);
} catch (e) {
  console.log('IndexNow : impossible de lire les fichiers modifiés, rien à signaler.');
  process.exit(0);
}

const urls = new Set();
for (const f of files) {
  let m;
  if ((m = f.match(/^src\/content\/blog\/(.+)\.md$/))) { urls.add(`${SITE}/blog/${m[1]}`); urls.add(`${SITE}/blog`); }
  else if ((m = f.match(/^src\/pages\/([^\[\]]+)\.astro$/)) && m[1] !== '404') urls.add(m[1] === 'index' ? `${SITE}/` : `${SITE}/${m[1].replace(/\/index$/, '')}`);
}
if (!urls.size) { console.log('IndexNow : aucune page publique modifiée.'); process.exit(0); }

// Attendre que GitHub Pages serve la nouvelle version (clé + pages)
for (let i = 0; i < 20; i++) {
  const r = await fetch(`${SITE}/${KEY}.txt`, { cache: 'no-store' }).catch(() => null);
  if (r && r.ok) break;
  await new Promise((res) => setTimeout(res, 15000));
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: [...urls] }),
});
console.log(`IndexNow : ${res.status} pour ${urls.size} URL`, [...urls]);
if (res.status >= 400 && res.status !== 429) process.exitCode = 0; // ne jamais faire échouer le déploiement
