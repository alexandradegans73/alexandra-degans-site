# La lettre d'Alexandra — charte de rédaction

Ce document est la règle à respecter pour **chaque** lettre. L'agent qui rédige la relit en entier avant d'écrire.

## Ce qu'est la lettre
- 6 envois par an au maximum (début janvier, mars, mai, juillet, septembre, novembre).
- Écrite **à la première personne, par Alexandra**, vouvoiement, ton chaleureux, simple, posé. Signature : « Alexandra ».
- Courte : 250 à 400 mots. Une seule idée principale, bien développée.
- Toujours en rapport avec **la kinésiologie et les accompagnements réellement proposés par Alexandra** : kinésiologie, mémoires transgénérationnelles, kinésiologie animale, soins énergétiques visage et corps, drainage lymphatique. Rien d'autre (pas d'actualité, pas de politique, pas de recettes, pas de produits).

## Sujets possibles (à varier)
- Une notion expliquée simplement (le test musculaire, l'équilibrage, le lien corps-émotions, le stress, les transitions de vie…).
- Le déroulé d'une séance, à quoi s'attendre, comment se préparer, l'après-séance.
- Un accompagnement présenté (animaux, mémoires familiales, soins, drainage) — informations tirées **uniquement** des pages du site.
- Un thème de saison relié à la kinésiologie (rentrée, fin d'année, changement de saison, examens…).
- Une information pratique vraie : cabinets de Bassens et Myans, réservation en ligne, horaires (9 h–19 h en semaine, samedi matin à Bassens).

## Interdits absolus
- **Aucune promesse de guérison ni de résultat**, aucun diagnostic, aucun conseil médical. Ne jamais dire que la kinésiologie soigne, guérit ou traite une maladie. Formules permises : « accompagner », « favoriser un mieux-être », « peut aider à prendre du recul ».
- Toujours rappeler, si le sujet touche au corps ou à la santé : « La kinésiologie ne remplace pas un suivi médical. »
- Ne rien inventer : pas de témoignage, de chiffre, d'étude, de diplôme, de tarif, de date, d'événement ou d'offre qui ne figure pas sur le site (`src/pages`, `src/content/blog`, `src/data/site.ts`). En cas de doute, ne pas l'écrire.
- Les mémoires transgénérationnelles et la psychogénéalogie sont présentées comme une **approche**, jamais comme des faits scientifiques.
- Pas de promotion agressive, pas de réduction, pas d'urgence artificielle, pas d'emoji en série. Un seul appel à l'action discret vers https://alexandradegans-kinesiologie.com/reserver
- Pas de doublon : le sujet et l'angle doivent être **différents** de toutes les lettres listées dans `historique.md` (et des envois visibles dans Resend). Ne pas réutiliser un titre ni un paragraphe.

## Forme (HTML e-mail)
- Fond crème `#f3ede2`, texte `#3b4434`, accents vert sauge `#627056`, police serif pour le titre (Georgia), sans-serif pour le texte (Arial). Largeur 600 px max, compatible mobile.
- En-tête : logo horizontal `https://alexandradegans-kinesiologie.com/brand/logo-horizontal.svg` n'est pas affiché par Gmail : utiliser `https://alexandradegans-kinesiologie.com/og-image.png` (largeur 520) ou un titre texte.
- Bas de lettre obligatoire : coordonnées (06 76 64 79 09 · alexandradegans@outlook.fr · Bassens et Myans), phrase « Vous recevez cette lettre car vous êtes client·e ou vous l'avez demandée. » et le lien de désinscription `{{{RESEND_UNSUBSCRIBE_URL}}}` (« Se désinscrire »).
- Objet : 6 à 10 mots, sans majuscules criardes ni point d'exclamation multiple. Préheader (texte d'aperçu) d'une phrase.

## Relecture avant envoi (cocher chaque point)
1. Sujet absent de `historique.md`.
2. Aucune promesse thérapeutique ; mention « ne remplace pas un suivi médical » si pertinent.
3. Chaque fait vérifiable est présent sur le site.
4. Orthographe et accents relus ; vouvoiement partout.
5. Lien de réservation et lien de désinscription présents et corrects.
