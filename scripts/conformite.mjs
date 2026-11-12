#!/usr/bin/env node
/**
 * Garde-fou de conformité : bloque la construction du site (et donc la mise en ligne)
 * si un texte promet un résultat thérapeutique ou emploie un vocabulaire médical interdit.
 *
 * La kinésiologie, les soins énergétiques et le drainage sont des pratiques de bien-être :
 * on « accompagne », on ne « soigne », « guérit » ni « traite » pas.
 *
 * Usage : node scripts/conformite.mjs   (lancé automatiquement avant `npm run build`)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const DIRS = ['src/content/blog', 'src/pages', 'src/data', 'src/components'];
const EXT = /\.(md|astro|ts)$/;

/** [motif, explication]. Les motifs sont insensibles à la casse. */
const INTERDITS = [
  [/\bgu[ée]ri(r|t|ssent|ssez|son|sons|e|es)?\b/i, 'promesse de guérison'],
  [/\bsoign(e|es|ent|er|ez|ons)\b/i, '« soigner » : employer « accompagner »'],
  [/\btrait(e|ent|er|ez|ons)\s+(la|le|les|l’|l'|une|un|vos|votre|des|ce|cette|ces|son|sa|ses)\b/i, '« traiter » une affection'],
  [/\bth[ée]rapeutique\b/i, 'vocabulaire thérapeutique'],
  [/\bpatient(e|s|es)?\b/i, 'parler de « personne » ou de « client », pas de « patient »'],
  [/\bdiagnosti(c|que|quer|quons)\b/i, 'aucun diagnostic n’est posé'],
  [/\b(r[ée]sultats?\s+garantis?|garanti(e|s)?\s+(à|a)\s+100|100\s?%\s+efficace|efficacit[ée]\s+prouv[ée]e)\b/i, 'résultat garanti'],
  [/\bmiracle(s|ux|use)?\b/i, 'promesse miraculeuse'],
  [/\b(maigrir|perte\s+de\s+poids|br[ûu]le[rs]?\s+les\s+graisses|anti-?cellulite|d[ée]tox(ifier|ification)?)\b/i, 'promesse minceur ou détox'],
  [/\b(remplace|remplacer)\s+(un|le|votre)\s+(m[ée]decin|traitement|v[ée]t[ée]rinaire|psy\w*)\b/i, 'à vérifier : la phrase doit dire que cela NE remplace PAS'],
  [/\b(cancer|diab[èe]te|d[ée]pression\s+s[ée]v[èe]re|schizophr[ée]nie|autisme|scl[ée]rose|alzheimer|parkinson)\b/i, 'maladie nommée : retirer ou faire valider'],
  [/\b(membre|adh[ée]rente?)\s+de\s+la\s+f[ée]d[ée]ration\b/i, 'affiliation retirée : Alexandra n’est plus adhérente'],
];

/** Phrases explicitement autorisées (avertissements). */
const AUTORISE = [
  /ne\s+(remplace|remplacent|se\s+substitue|se\s+substituent)\b/i,
  /ni\s+un\s+diagnostic/i,
  /ne\s+pose\s+pas\s+de\s+diagnostic/i,
];

function* files(dir) {
  let entries = [];
  try { entries = readdirSync(dir); } catch { return; }
  for (const e of entries) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) yield* files(p);
    else if (EXT.test(e)) yield p;
  }
}

const problems = [];
for (const d of DIRS) {
  for (const f of files(join(ROOT, d))) {
    const lines = readFileSync(f, 'utf8').split('\n');
    lines.forEach((line, i) => {
      // On ignore le code (imports, styles) et les pages légales, qui citent ces mots pour les écarter.
      if (/mentions-legales|confidentialite/.test(f)) return;
      for (const sentence of line.split(/(?<=[.!?])\s+/)) {
        if (AUTORISE.some((r) => r.test(sentence))) continue;
        for (const [re, why] of INTERDITS) {
          const m = sentence.match(re);
          if (m) problems.push(`${relative(ROOT, f)}:${i + 1}  « ${m[0]} »  → ${why}\n    ${sentence.trim().slice(0, 160)}`);
        }
      }
    });
  }
}

/** Contrôles SEO des articles : longueur de la description et du titre. */
for (const f of files(join(ROOT, 'src/content/blog'))) {
  const src = readFileSync(f, 'utf8');
  const fm = src.match(/^---\n([\s\S]*?)\n---/);
  if (!fm) { problems.push(`${relative(ROOT, f)} : en-tête (frontmatter) manquant`); continue; }
  const desc = fm[1].match(/^description:\s*["']?(.*?)["']?\s*$/m)?.[1] ?? '';
  if (desc.length < 110 || desc.length > 158) problems.push(`${relative(ROOT, f)} : description de ${desc.length} caractères (110 à 158 attendus)`);
  const words = src.slice(fm[0].length).split(/\s+/).filter(Boolean).length;
  if (!/draft:\s*true/.test(fm[1]) && words < 600) problems.push(`${relative(ROOT, f)} : article trop court (${words} mots, 600 minimum)`);
}

if (problems.length) {
  console.error(`\n✗ Conformité : ${problems.length} point(s) à corriger avant publication\n`);
  console.error(problems.join('\n\n'));
  console.error('\nVoir docs/blog.md pour les règles de rédaction.\n');
  process.exit(1);
}
console.log('✓ Conformité : aucun vocabulaire interdit, articles conformes.');
