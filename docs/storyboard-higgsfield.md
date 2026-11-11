# Le film de l'arbre de vie (Higgsfield)

Le site entier est un seul film, piloté image par image par le scroll : on découvre l'arbre, on entre dans ses branches, on s'arrête sur les feuilles, on descend le tronc jusqu'aux racines, puis jusqu'à l'eau calme.

Modèle : Seedance 2.5, mode `omni_reference`, 16:9, sans son, 10 s par plan. Chaque plan part d'une image clé et finit sur la suivante, ce qui garantit des raccords invisibles.

| Plan | Image de départ → d'arrivée | Chapitre du site |
|---|---|---|
| 1 | L'arbre entier → dans les branches | Ouverture, philosophie, la kinésiologie |
| 2 | Les branches → les feuilles | Les cinq soins |
| 3 | Les feuilles → les racines (descente du tronc) | L'approche, Alexandra |
| 4 | Les racines → l'eau calme | Les lieux, les histoires, le rendez-vous |

Images clés (GPT Image 2.6, photoréalistes, même arbre en référence) : `public/media/scenes/arbre|branches|feuilles|racines|eau.webp`. Elles servent aussi d'ouverture aux pages intérieures.

## Prompts des plans
1. `One single continuous photorealistic cinematic shot, no cuts. Starting on the wide view of the majestic ancient tree at dawn, the camera glides slowly and steadily forward and upward toward the tree, mist drifting over the meadow, then enters the canopy between the great mossy branches, leaves brushing past the lens in soft focus, golden-cream sun rays streaming through the foliage, ending inside the tree among its branches. Slow, calm, meditative drone-like movement, shallow depth of field, muted sage green and warm cream colour grade, fine film grain, no people, no text.`
2. `…Inside the canopy, the camera floats slowly from one great mossy branch to the next, travelling along a branch toward its tip, leaves swaying gently, sun rays flickering, then settles in a close macro view of delicate sage-green leaves covered in dew drops…`
3. `…Starting close on dewy leaves, a single drop of dew falls; the camera follows it down, descending slowly through the foliage and along the thick twisted trunk, down to ground level, ending on a low wide view of the massive mossy roots in the morning mist…`
4. `…Among the mossy roots, the camera glides slowly backward and down, following the roots as they reach a perfectly calm, clear spring pool, still as a mirror, a single leaf drifting, ending on the tree reflected in the water…`

## Remplacer le film
1. Assembler les plans en un seul MP4 (ordre 1 → 4).
2. `scripts/film.sh film.mp4` : découpe en images (ordinateur et téléphone) et met à jour `src/data/media.ts`.
3. Les repères `data-film-mark` dans `src/pages/index.astro` calent chaque chapitre sur son plan (0.25, 0.5, 0.75).
