/**
 * API de réservation — Alexandra Degans (Cloudflare Worker + D1).
 *
 * GET  /api/catalog                 prestations et lieux
 * GET  /api/slots?item=&place=      créneaux libres (60 jours)
 * POST /api/checkout                bloque le créneau 30 min et ouvre Stripe Checkout
 * GET  /api/booking/:id?s=          état d'une réservation (page de confirmation)
 * GET  /api/cancel/:token           informations d'annulation
 * POST /api/cancel/:token           annulation (remboursée si ≥ 48 h avant)
 * POST /api/stripe/webhook          événements Stripe (re-vérifiés auprès de Stripe)
 *
 * Variables : SITE_URL, ALEXANDRA_EMAIL, ALEXANDRA_EMAIL_2, MAIL_FROM, MAIL_FROM_ADDRESS, REPLY_TO
 * Secrets   : STRIPE_SECRET_KEY, RESEND_API_KEY, ICAL_URL
 * Base D1   : DB (schéma dans schema.sql)
 */
import { CATALOG, PLACES, RULES, resolveItem } from './catalog.js';
import { busyFromIcs } from './ics.js';
import { computeSlots, isFree } from './slots.js';
import { sendConfirmation, sendCancellation, calendarSync } from './mail.js';
import { frLabel } from './time.js';

const MIN = 60000;

// ---------------------------------------------------------------- utilitaires
const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers } });

function cors(req, env) {
  const origin = req.headers.get('Origin') || '';
  const allowed = [env.SITE_URL, 'https://www.alexandradegans-kinesiologie.com', 'http://localhost:4321', 'https://alexandradegans73.github.io'];
  return {
    'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : env.SITE_URL,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

const randomId = (n = 16) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, '0')).join('');

async function stripe(env, method, path, params) {
  const init = { method, headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` } };
  if (params) {
    init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
    init.body = encodeForm(params);
  }
  const r = await fetch(`https://api.stripe.com/v1${path}`, init);
  const data = await r.json();
  if (!r.ok) throw new Error(`Stripe ${path} : ${data?.error?.message || r.status}`);
  return data;
}

function encodeForm(obj, prefix = '', out = []) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') encodeForm(v, key, out);
    else out.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`);
  }
  return out.join('&');
}

// ---------------------------------------------------------------- disponibilités
async function calendarBusy(env, ctx, from, to) {
  if (!env.ICAL_URL) return [];
  const cache = caches.default;
  const key = new Request('https://cache.local/ical');
  let res = await cache.match(key);
  if (!res) {
    const r = await fetch(env.ICAL_URL, { cf: { cacheTtl: 0 } });
    if (!r.ok) throw new Error(`Agenda inaccessible (${r.status})`);
    res = new Response(await r.text(), { headers: { 'Cache-Control': 'max-age=120' } });
    ctx.waitUntil(cache.put(key, res.clone()));
  }
  return busyFromIcs(await res.text(), from, to);
}

async function bookingBusy(env, now, excludeId) {
  const { results } = await env.DB.prepare(
    `SELECT id, start, end FROM bookings WHERE end > ?1 AND (status = 'confirmed' OR (status = 'hold' AND hold_until > ?1))`,
  ).bind(now).all();
  return results.filter((r) => r.id !== excludeId).map((r) => ({ start: r.start, end: r.end }));
}

async function allBusy(env, ctx, now, excludeId) {
  const to = now + (RULES.maxDaysAhead + 2) * 86400000;
  const [cal, book] = await Promise.all([calendarBusy(env, ctx, now - 86400000, to), bookingBusy(env, now, excludeId)]);
  return cal.concat(book);
}

// ---------------------------------------------------------------- réservations
async function getBooking(env, id) {
  return env.DB.prepare('SELECT * FROM bookings WHERE id = ?1').bind(id).first();
}

/** Confirme une réservation payée (idempotent) et envoie les e-mails une seule fois. */
async function confirmBooking(env, id, session) {
  const b = await getBooking(env, id);
  if (!b) return null;
  if (b.status !== 'confirmed') {
    await env.DB.prepare(`UPDATE bookings SET status = 'confirmed', payment_intent = ?2, paid_at = ?3 WHERE id = ?1 AND status != 'cancelled'`)
      .bind(id, session.payment_intent || null, Date.now()).run();
  }
  const claim = await env.DB.prepare('UPDATE bookings SET emailed = 1 WHERE id = ?1 AND emailed = 0').bind(id).run();
  const fresh = await getBooking(env, id);
  if (claim.meta.changes === 1) {
    const item = resolveItem(fresh.item, fresh.combo);
    await Promise.all([sendConfirmation(env, { ...fresh, note: item?.note }), calendarSync(env, 'create', fresh)]);
  }
  return fresh;
}

const publicBooking = (b) => b && ({
  id: b.id, status: b.status, item: b.item_name, place: PLACES[b.place]?.address, start: b.start, label: frLabel(b.start), price: b.price, name: b.name,
});

// ---------------------------------------------------------------- routes
async function handle(req, env, ctx) {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, '');
  const now = Date.now();

  if (req.method === 'GET' && path === '/api/catalog') {
    return json({ items: CATALOG.map(({ id, group, zone, pack, name, duration, price, places, note, combo }) => ({ id, group, zone, pack, name, duration, price, places, note, combo })), places: PLACES, rules: { refundHours: RULES.refundHours } });
  }

  if (req.method === 'GET' && path === '/api/slots') {
    const item = resolveItem(url.searchParams.get('item'), url.searchParams.get('combo'));
    const place = url.searchParams.get('place');
    if (!item || !item.places.includes(place)) return json({ error: 'Prestation ou lieu inconnu.' }, 400);
    const busy = await allBusy(env, ctx, now);
    return json({ days: computeSlots({ duration: item.duration, busy, now }) }, 200, { 'Cache-Control': 'no-store' });
  }

  if (req.method === 'POST' && path === '/api/checkout') {
    const body = await req.json().catch(() => ({}));
    const item = resolveItem(body.item, body.combo);
    const place = body.place;
    const start = Number(body.start);
    const name = String(body.name || '').trim().slice(0, 120);
    const email = String(body.email || '').trim().slice(0, 160);
    const phone = String(body.phone || '').trim().slice(0, 40);
    const message = String(body.message || '').trim().slice(0, 500);
    if (!item || !item.places.includes(place)) return json({ error: 'Prestation ou lieu inconnu.' }, 400);
    if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || phone.replace(/\D/g, '').length < 9) return json({ error: 'Merci de compléter votre nom, un e-mail valide et votre téléphone.' }, 400);
    if (!body.consent) return json({ error: 'Merci d’accepter les conditions de réservation.' }, 400);

    const busy = await allBusy(env, ctx, now);
    if (!isFree({ start, duration: item.duration, busy, now })) return json({ error: 'Ce créneau vient d’être pris. Merci d’en choisir un autre.', code: 'taken' }, 409);

    const id = randomId(12);
    const end = start + item.duration * MIN;
    const holdUntil = now + RULES.holdMinutes * MIN + 2 * MIN;
    await env.DB.prepare(
      `INSERT INTO bookings (id, item, item_name, place, start, end, price, name, email, phone, message, status, hold_until, cancel_token, created_at, emailed)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 'hold', ?12, ?13, ?14, 0)`,
    ).bind(id, item.id, item.name, place, start, end, item.price, name, email, phone, message, holdUntil, randomId(20), now).run();

    // Deux personnes au même instant : la première réservation enregistrée garde le créneau.
    const rival = await env.DB.prepare(
      `SELECT id FROM bookings WHERE id != ?1 AND start < ?3 AND end > ?2 AND (status = 'confirmed' OR (status = 'hold' AND hold_until > ?4)) AND created_at <= ?5 LIMIT 1`,
    ).bind(id, start - RULES.bufferMinutes * MIN, end + RULES.bufferMinutes * MIN, now, now).first();
    if (rival) {
      await env.DB.prepare(`UPDATE bookings SET status = 'expired' WHERE id = ?1`).bind(id).run();
      return json({ error: 'Ce créneau vient d’être pris. Merci d’en choisir un autre.', code: 'taken' }, 409);
    }

    try {
      const session = await stripe(env, 'POST', '/checkout/sessions', {
        mode: 'payment',
        locale: 'fr',
        adaptive_pricing: { enabled: false }, // euros uniquement
        customer_email: email,
        client_reference_id: id,
        expires_at: Math.floor((now + RULES.holdMinutes * MIN) / 1000),
        success_url: `${env.SITE_URL}/reservation/confirmee?b=${id}&s={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.SITE_URL}/reserver?retour=1`,
        metadata: { booking_id: id },
        payment_intent_data: { metadata: { booking_id: id }, description: `${item.name} — ${frLabel(start)}` },
        line_items: { 0: { quantity: 1, price_data: { currency: 'eur', unit_amount: item.price, product_data: { name: item.name, description: `${frLabel(start)} · ${PLACES[place].name}` } } } },
      });
      await env.DB.prepare('UPDATE bookings SET stripe_session = ?2 WHERE id = ?1').bind(id, session.id).run();
      return json({ url: session.url, id });
    } catch (e) {
      await env.DB.prepare(`UPDATE bookings SET status = 'expired' WHERE id = ?1`).bind(id).run();
      console.log(String(e));
      return json({ error: 'Le paiement n’a pas pu être préparé. Merci de réessayer ou d’appeler le 06 76 64 79 09.' }, 502);
    }
  }

  let m;
  if (req.method === 'GET' && (m = path.match(/^\/api\/booking\/([a-f0-9]{24})$/))) {
    let b = await getBooking(env, m[1]);
    if (!b) return json({ error: 'Réservation introuvable.' }, 404);
    const sid = url.searchParams.get('s');
    if (b.status === 'hold' && sid && sid === b.stripe_session) {
      const s = await stripe(env, 'GET', `/checkout/sessions/${sid}`);
      if (s.payment_status === 'paid') b = await confirmBooking(env, b.id, s);
    }
    return json(publicBooking(b), 200, { 'Cache-Control': 'no-store' });
  }

  if ((m = path.match(/^\/api\/cancel\/([a-f0-9]{40})$/))) {
    const b = await env.DB.prepare('SELECT * FROM bookings WHERE cancel_token = ?1').bind(m[1]).first();
    if (!b || b.status === 'hold' || b.status === 'expired') return json({ error: 'Lien d’annulation invalide.' }, 404);
    const refundable = b.start - now >= RULES.refundHours * 3600000;
    if (req.method === 'GET') return json({ ...publicBooking(b), refundable, refundHours: RULES.refundHours });
    if (req.method === 'POST') {
      if (b.status === 'cancelled') return json({ ...publicBooking(b), already: true });
      if (!refundable) return json({ error: `L’annulation en ligne n’est possible que jusqu’à ${RULES.refundHours} h avant le rendez-vous. Merci d’appeler Alexandra au 06 76 64 79 09.` }, 409);
      let refunded = false;
      if (b.payment_intent) {
        try {
          await stripe(env, 'POST', '/refunds', { payment_intent: b.payment_intent, reason: 'requested_by_customer', metadata: { booking_id: b.id } });
        } catch (e) {
          // Clé Stripe soumise à approbation : le remboursement attend la validation d'Alexandra dans Stripe.
          if (!/approval/i.test(String(e))) throw e;
          console.log('Remboursement en attente d’approbation Stripe', b.id);
        }
        refunded = true;
      }
      await env.DB.prepare(`UPDATE bookings SET status = 'cancelled', cancelled_at = ?2, refunded = ?3 WHERE id = ?1`).bind(b.id, now, refunded ? 1 : 0).run();
      ctx.waitUntil(Promise.all([sendCancellation(env, b, refunded), calendarSync(env, 'delete', b)]));
      return json({ ...publicBooking({ ...b, status: 'cancelled' }), refunded });
    }
  }

  if (req.method === 'POST' && path === '/api/stripe/webhook') {
    // On ne fait pas confiance au contenu reçu : l'événement est relu directement chez Stripe.
    const payload = await req.json().catch(() => null);
    if (!payload?.id?.startsWith('evt_')) return json({ error: 'bad request' }, 400);
    const evt = await stripe(env, 'GET', `/events/${payload.id}`);
    const s = evt.data.object;
    const id = s?.metadata?.booking_id || s?.client_reference_id;
    if (id && evt.type === 'checkout.session.completed' && s.payment_status === 'paid') await confirmBooking(env, id, s);
    if (id && evt.type === 'checkout.session.async_payment_succeeded') await confirmBooking(env, id, s);
    if (id && evt.type === 'checkout.session.expired') await env.DB.prepare(`UPDATE bookings SET status = 'expired' WHERE id = ?1 AND status = 'hold'`).bind(id).run();
    return json({ received: true });
  }

  if (req.method === 'GET' && path === '/api/health') return json({ ok: true, ical: !!env.ICAL_URL, stripe: !!env.STRIPE_SECRET_KEY, mail: !!env.RESEND_API_KEY, agenda: !!env.GCAL_HOOK_URL });

  return json({ error: 'Not found' }, 404);
}

export default {
  async fetch(req, env, ctx) {
    const h = cors(req, env);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    try {
      const res = await handle(req, env, ctx);
      for (const [k, v] of Object.entries(h)) res.headers.set(k, v);
      return res;
    } catch (e) {
      console.log('Erreur', String(e?.stack || e));
      return json({ error: 'Une erreur est survenue. Merci de réessayer ou d’appeler le 06 76 64 79 09.' }, 500, h);
    }
  },
};
