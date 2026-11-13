# Procédure de l'agent newsletter (tâche programmée)

Exécutée 6 fois par an. Tout se fait sans intervention ; l'envoi est automatique (choix validé par le client le 13/11/2026).

## 1. Préparer
- Cloner `alexandradegans73/alexandra-degans-site` (branche `main`) et lire `newsletter/CHARTE.md`, `newsletter/historique.md`, puis les pages du site (`src/pages/*.astro`, `src/content/blog/*.md`, `src/data/site.ts`) pour s'appuyer uniquement sur des informations vraies.

## 2. Mettre à jour la liste d'envoi (Cloudflare D1 → Resend)
Base D1 `reservations` (id `ec58f273-e46b-4233-ac4c-5b24176a26a3`, compte `a9b29b01c37c9fea8152a4feeeca3d72`).
- Contacts à ajouter :
  - `SELECT email, name FROM newsletter_contacts WHERE synced = 0`
  - `SELECT email, name, id FROM bookings WHERE newsletter = 1 AND newsletter_synced = 0 AND status IN ('confirmed','cancelled')`
- Dans Resend, segment (ou audience) nommé **« Lettre d'Alexandra »** : le créer s'il n'existe pas.
- Pour chaque adresse : si le contact existe déjà dans Resend (même désinscrit), **ne rien changer** — ne jamais réabonner quelqu'un qui s'est désinscrit. Sinon le créer (prénom = premier mot du nom) et l'ajouter au segment.
- Puis marquer : `UPDATE newsletter_contacts SET synced = 1 WHERE email = ?` et `UPDATE bookings SET newsletter_synced = 1 WHERE id = ?`.
- Alexandra (alexandradegans@outlook.fr) fait partie de la liste et reçoit chaque lettre.

## 3. Rédiger
- Choisir un sujet absent de `historique.md`, adapté à la saison, conforme à la charte.
- Écrire l'objet, le préheader et le HTML selon la charte. Faire la relecture en 5 points de la charte ; corriger jusqu'à ce que tout soit validé.

## 4. Envoyer
- Créer une diffusion (broadcast) Resend vers le segment « Lettre d'Alexandra » :
  - expéditeur `Alexandra Degans <lettre@alexandradegans-kinesiologie.com>`, réponse `alexandradegans@outlook.fr` ;
  - nom interne : `Lettre AAAA-MM — <sujet>`.
- Vérifier qu'aucune diffusion n'a déjà été envoyée ce mois-ci (pas de double envoi), puis l'envoyer.

## 5. Garder la trace
- Ajouter une ligne à `newsletter/historique.md` (date, objet, sujet/angle, mots-clés), commit « Newsletter AAAA-MM : <objet> », `git fetch && git rebase origin/main && git push`.
- Ne jamais committer d'adresse e-mail de client dans le dépôt.

## En cas de problème
- Si Resend ou Cloudflare ne répondent pas, ne rien envoyer et le signaler dans le compte rendu.
- Compte rendu final court : objet envoyé, nombre de destinataires, contacts ajoutés.
