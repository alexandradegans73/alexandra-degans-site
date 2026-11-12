# Le Journal (blog) : règles de rédaction et de publication

Les articles sont des fichiers Markdown dans `src/content/blog/`. Le nom du fichier donne l’URL :
`src/content/blog/mon-article.md` → `https://alexandradegans-kinesiologie.com/blog/mon-article`.

La liste des sujets prévus est dans `docs/calendrier-editorial.json` (statut « à écrire » ou « publié »).
Un article est publié automatiquement le 1er et le 15 de chaque mois (tâche planifiée), ou à la main
en envoyant le fichier sur la branche `main` : GitHub Actions reconstruit et met le site en ligne.

## En-tête obligatoire

```yaml
---
title: "Titre affiché (90 caractères max)"
seoTitle: "Titre pour Google (60 caractères max ; obligatoire si le titre dépasse 60)"
description: "Résumé pour Google, entre 110 et 158 caractères."
date: 2027-01-15
keyword: "mot-clé principal"
service: /kinesiologie        # page de soin liée : /kinesiologie, /memoires-transgenerationnelles, /kinesiologie-animale, /soins-energetiques, /drainage-lymphatique
scene: feuilles               # image de fond : arbre, branches, feuilles, racines, eau
---
```

Un article dont la date est dans le futur n’apparaît pas tant que le site n’est pas reconstruit après cette date.
`draft: true` le cache.

## Règles de fond (impératives)

1. **Conformité santé.** La kinésiologie, les soins énergétiques et le drainage sont des pratiques de bien-être.
   - On « accompagne », on « favorise le bien-être », on agit « en complément d’un suivi médical ».
   - Jamais : soigner, guérir, traiter une maladie, diagnostic, patient, résultat garanti, minceur, détox.
   - Ne jamais nommer une maladie comme indication. Toujours renvoyer vers le médecin, le psychologue
     ou le vétérinaire quand c’est pertinent.
   - La psychogénéalogie est présentée comme une grille de lecture, pas comme une vérité scientifique.
   - Le script `scripts/conformite.mjs` bloque la mise en ligne s’il trouve un mot interdit.
2. **Rien d’inventé.** Aucun témoignage, chiffre, étude, diplôme, tarif ou affiliation qui ne figure pas
   déjà sur le site. Alexandra n’est plus adhérente d’aucune fédération. Pas d’intervalle imposé entre les séances.
   Les faits utilisables : certification de kinésiologie EKTC (2023), kinésiologie animale EKTC + séminaires
   d’éthologie, Belly Révolution (2023), Facelift Access Bars (2023), Brain Gym, visualisation, modes oculaires ;
   à son compte depuis juillet 2023 ; cabinets de Bassens (Le Cobalt, 17 rue Arthur Haulotte) et Myans
   (17 impasse du Gardeny) ; tarifs de `src/data/site.ts`.
3. **Ton.** Chaleureux, rassurant, professionnel, à la première personne (Alexandra), phrases simples.
   Pas de bourrage de mots-clés : le mot-clé dans le titre, la description, le premier paragraphe et un intertitre suffit.
4. **Forme.** 700 à 1 200 mots, intertitres `##` et `###`, une liste quand elle aide, un dernier paragraphe
   qui invite à réserver en ligne ou à appeler le 06 76 64 79 09. Au moins un lien vers la page de soin liée.
5. **Local.** Citer Bassens, Myans et Chambéry naturellement, une ou deux fois.

## Vérifier avant d’envoyer

```bash
npm run conformite   # vocabulaire et longueurs
npm run build        # construit le site (relance aussi la conformité)
```
