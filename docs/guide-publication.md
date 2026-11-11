# Guide de publication et de maintenance

## Mettre en ligne
1. Sur GitHub : **Settings → Pages → Source : GitHub Actions**.
2. Chaque envoi sur `main` lance le workflow `.github/workflows/deploy.yml` (build Astro puis publication).
3. Domaine : dans **Settings → Pages → Custom domain**, saisir `alexandradegans-kinesiologie.com` (le fichier `public/CNAME` le contient déjà), puis chez le registrar :
   - 4 enregistrements `A` sur `@` : `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - 1 enregistrement `CNAME` sur `www` → `alexandradegans73.github.io`
4. Quand le DNS est propagé, cocher **Enforce HTTPS**. Ne déconnecter le domaine de Wix qu'à ce moment-là.

## Modifier le contenu
- Coordonnées, horaires, tarifs, lien de réservation : `src/data/site.ts`
- Vidéos, photos, son : `src/data/media.ts` + fichiers dans `public/media/`
- Couleurs, typographies, espacements : `src/styles/tokens.css`
- Pages : `src/pages/*.astro`

## Travailler en local
`npm install` · `npm run dev` (aperçu) · `npm run build` (site final dans `dist/`).

## Avant publication — à valider par Alexandra
- Tarifs, horaires, formations et affiliations affichés
- SIRET et date dans les mentions légales
- Photos (portrait, cabinets, animaux) et avis clients autorisés
