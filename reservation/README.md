# Réservation en ligne (Cloudflare Worker + D1 + Stripe + Resend)

API : https://reservation.alexandra-degans.workers.dev

- `src/` : code du Worker (catalogue et tarifs dans `src/catalog.js`, horaires et règles comprises).
- `schema.sql` : table `bookings` (base D1 « reservations »).
- `test/run.mjs` : tests (`node test/run.mjs`).

Secrets à définir dans Cloudflare (Workers › reservation › Paramètres › Variables) :
`STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `ICAL_URL` (adresse secrète iCal de Google Agenda), facultatif `ALEXANDRA_EMAIL_2`.

Webhook Stripe : `/api/stripe/webhook` (checkout.session.completed, async_payment_succeeded, expired).
Les événements reçus sont relus directement auprès de Stripe : aucun secret de signature nécessaire.

Purge automatique : cron quotidien `17 2 * * *` (déclencheur en place depuis le 12/11). Supprime les réservations terminées depuis plus de 3 ans et les réservations jamais payées de plus de 30 jours.

Déploiement : `npx esbuild src/index.js --bundle --format=esm --outfile=dist/index.js` puis envoi via l’API Cloudflare ou `wrangler deploy`.
