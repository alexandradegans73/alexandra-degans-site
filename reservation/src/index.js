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
import { CATALOG, PLACES, PLACE_HOURS, RULES, resolveItem } from './catalog.js';
import { busyFromIcs } from './ics.js';
import { computeSlots, isFree } from './slots.js';
import { sendConfirmation, sendCancellation, sendReminder, sendReviewRequest, sendInvoice, calendarSync } from './mail.js';
import { frLabel, parisParts, addDays, wallToUtc } from './time.js';

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
  // 1) Lecture directe de l'agenda par le script Google (instantané, agenda « Kinésiologie » + agenda principal).
  if (env.GCAL_HOOK_URL) {
    const cache = caches.default;
    const key = new Request('https://cache.local/agenda-direct');
    let res = await cache.match(key);
    if (!res) {
      try {
        const r = await fetch(env.GCAL_HOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ secret: env.GCAL_HOOK_SECRET, action: 'busy', from, to }),
        });
        const data = await r.json();
        if (data.ok && Array.isArray(data.busy)) {
          res = new Response(JSON.stringify(data.busy), { headers: { 'Cache-Control': 'max-age=20' } });
          ctx.waitUntil(cache.put(key, res.clone()));
        } else console.log('Agenda direct indisponible', JSON.stringify(data).slice(0, 200));
      } catch (e) {
        console.log('Agenda direct injoignable', String(e));
      }
    }
    if (res) return (await res.json()).map(([start, end, place]) => ({ start, end, place: place || null }));
  }
  // 2) Secours : adresse iCal secrète (mise à jour par Google avec plusieurs heures de retard).
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
    `SELECT id, start, end, place FROM bookings WHERE end > ?1 AND (status = 'confirmed' OR (status = 'hold' AND hold_until > ?1))`,
  ).bind(now).all();
  return results.filter((r) => r.id !== excludeId).map((r) => ({ start: r.start, end: r.end, place: r.place || null }));
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
  onSite: b.pay_mode === 'sur_place',
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
    if (!item || (place && !item.places.includes(place))) return json({ error: 'Prestation ou lieu inconnu.' }, 400);
    const busy = await allBusy(env, ctx, now);
    // Sans lieu : on fusionne les cabinets, chaque créneau indique où il est possible.
    const byDate = new Map();
    for (const p of place ? [place] : item.places) {
      for (const d of computeSlots({ duration: item.duration, busy, now, hours: PLACE_HOURS[p], place: p })) {
        const day = byDate.get(d.date) || new Map();
        for (const s of d.slots) {
          const slot = day.get(s.start) || { ...s, places: [] };
          slot.places.push(p);
          day.set(s.start, slot);
        }
        byDate.set(d.date, day);
      }
    }
    const days = [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, m]) => ({ date, slots: [...m.values()].sort((a, b) => a.start - b.start) }));
    return json({ days }, 200, { 'Cache-Control': 'no-store' });
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
    const payOnSite = body.pay === 'sur-place';
    if (payOnSite) {
      // Garde-fou : pas plus de 2 rendez-vous à venir non payés pour une même personne.
      // (Si la vérification échoue, on ne bloque pas la réservation.)
      try {
        const open = await env.DB.prepare(
          `SELECT COUNT(*) AS n FROM bookings WHERE status = 'confirmed' AND pay_mode = 'sur_place' AND start > ? AND (email = ? COLLATE NOCASE OR phone = ?)`,
        ).bind(now, email, phone).first();
        if ((open?.n || 0) >= 2) return json({ error: 'Vous avez déjà deux rendez-vous à régler sur place. Pour en réserver un autre, merci de payer en ligne ou d’appeler Alexandra au 06 76 64 79 09.' }, 409);
      } catch (e) {
        console.log('Garde-fou paiement sur place', String(e));
      }
    }
    const busy = await allBusy(env, ctx, now);
    if (!isFree({ start, duration: item.duration, busy, now, hours: PLACE_HOURS[place], place })) return json({ error: 'Ce créneau vient d’être pris. Merci d’en choisir un autre.', code: 'taken' }, 409);

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

    // Paiement sur place : le rendez-vous est confirmé tout de suite, sans passer par Stripe.
    if (payOnSite) {
      await env.DB.prepare(`UPDATE bookings SET status = 'confirmed', pay_mode = 'sur_place' WHERE id = ?1`).bind(id).run();
      const claim = await env.DB.prepare('UPDATE bookings SET emailed = 1 WHERE id = ?1 AND emailed = 0').bind(id).run();
      const fresh = await getBooking(env, id);
      if (claim.meta.changes === 1) {
        ctx.waitUntil(Promise.all([sendConfirmation(env, { ...fresh, note: item.note }), calendarSync(env, 'create', fresh)]));
      }
      return json({ url: `${env.SITE_URL}/reservation/confirmee?b=${id}`, id });
    }

    try {
      const session = await stripe(env, 'POST', '/checkout/sessions', {
        mode: 'payment',
        locale: 'fr',
        adaptive_pricing: { enabled: false }, // euros uniquement
        customer_email: email,
        billing_address_collection: 'required', // adresse du client : mention obligatoire sur la facture
        client_reference_id: id,
        expires_at: Math.floor((now + RULES.holdMinutes * MIN) / 1000),
        success_url: `${env.SITE_URL}/reservation/confirmee?b=${id}&s={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.SITE_URL}/reserver?retour=1`,
        metadata: { booking_id: id },
        payment_intent_data: { metadata: { booking_id: id }, description: `${item.name} — ${frLabel(start)}` },
        // Facture Stripe rattachée au paiement ; elle est envoyée au client le lendemain de la séance (cron).
        invoice_creation: { enabled: true, invoice_data: { description: `${item.name} — ${frLabel(start)} · ${PLACES[place].name}`, footer: 'Alexandra Degans — Kinésiologue · SIRET 953 944 154 00012 · TVA non applicable, art. 293 B du CGI', metadata: { booking_id: id } } },
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

// En-têtes de sécurité ajoutés à toutes les réponses de l'API.
const SEC = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
};

// Purge quotidienne (cron) : réservations terminées depuis plus de 3 ans,
// réservations jamais payées (hold / expired) de plus de 30 jours.
async function purge(env) {
  const now = Date.now();
  await env.DB.prepare('DELETE FROM bookings WHERE end < ?1').bind(now - 3 * 365 * 864e5).run();
  await env.DB.prepare("DELETE FROM bookings WHERE status IN ('hold','expired') AND created_at < ?1").bind(now - 30 * 864e5).run();
}

// Rappel la veille vers 18 h (heure de Paris) pour les rendez-vous payés du lendemain.
// Le cron tourne à 16 h 07 et 17 h 07 UTC : seul le passage qui tombe à 18 h à Paris envoie (heure d'été / d'hiver).
async function remind(env, now = Date.now()) {
  const p = parisParts(now);
  if (p.h !== 18) return 0;
  const t = addDays(p, 1);
  const from = wallToUtc(t.y, t.m, t.d, 0, 0);
  const to = wallToUtc(t.y, t.m, t.d, 23, 59, 59);
  const { results } = await env.DB.prepare(
    "SELECT * FROM bookings WHERE status = 'confirmed' AND reminded = 0 AND start >= ?1 AND start <= ?2"
  ).bind(from, to).all();
  let sent = 0;
  for (const b of results) {
    const claim = await env.DB.prepare('UPDATE bookings SET reminded = 1 WHERE id = ?1 AND reminded = 0').bind(b.id).run();
    if (claim.meta.changes !== 1) continue;
    await sendReminder(env, b);
    sent++;
  }
  return sent;
}

// Synchronisation depuis l'agenda Google (cron toutes les 5 min) :
// - rendez-vous du site supprimé de l'agenda par Alexandra → annulé, remboursé s'il a été payé en ligne,
//   le client reçoit l'e-mail d'annulation et Alexandra un récapitulatif ;
// - rendez-vous déplacé dans l'agenda → nouvel horaire repris (rappel et demande d'avis suivent).
// Sécurités : on n'annule que ce qui a déjà été vu dans l'agenda (cal_seen = 1), rien si l'agenda ne répond pas,
// et jamais plus de 3 annulations d'un coup (signe d'un problème plutôt que d'annulations réelles).
async function syncFromCalendar(env, now = Date.now()) {
  if (!env.GCAL_HOOK_URL) return;
  const from = now - 4 * 3600e3, to = now + 120 * 864e5;
  const { results } = await env.DB.prepare(
    "SELECT * FROM bookings WHERE status = 'confirmed' AND id NOT LIKE 'crenolibre-%' AND end >= ?1 AND start <= ?2 AND created_at <= ?3"
  ).bind(now - 3 * 3600e3, to, now - 10 * 60e3).all();
  if (!results.length) return;
  let data;
  try {
    const r = await fetch(env.GCAL_HOOK_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ secret: env.GCAL_HOOK_SECRET, action: 'tags', from, to }) });
    data = await r.json();
  } catch (e) { console.log('Synchro agenda injoignable', String(e)); return; }
  if (!data?.ok || !Array.isArray(data.events)) { console.log('Synchro agenda indisponible', JSON.stringify(data).slice(0, 200)); return; }
  const seen = new Map(data.events.map(([id, start, end]) => [id, { start, end }]));
  const gone = [];
  for (const b of results) {
    const ev = seen.get(b.id);
    if (ev) {
      if (ev.start !== b.start || ev.end !== b.end) {
        await env.DB.prepare('UPDATE bookings SET start = ?2, end = ?3, cal_seen = 1, reminded = CASE WHEN ?2 > ?4 THEN 0 ELSE reminded END WHERE id = ?1').bind(b.id, ev.start, ev.end, now + 6 * 3600e3).run();
        console.log('Rendez-vous déplacé dans l’agenda', b.id, new Date(ev.start).toISOString());
      } else if (!b.cal_seen) {
        await env.DB.prepare('UPDATE bookings SET cal_seen = 1 WHERE id = ?1').bind(b.id).run();
      }
    } else if (b.cal_seen) gone.push(b);
  }
  if (gone.length > 3) { console.log('Synchro agenda : trop d’absences d’un coup, rien n’est annulé', gone.length); return; }
  for (const b of gone) {
    const claim = await env.DB.prepare("UPDATE bookings SET status = 'cancelled', cancelled_at = ?2 WHERE id = ?1 AND status = 'confirmed'").bind(b.id, now).run();
    if (claim.meta.changes !== 1) continue;
    console.log('Rendez-vous retiré de l’agenda → annulé', b.id);
    // Annulation par Alexandra : remboursement intégral, quel que soit le délai.
    let refunded = false, refundError = '';
    if (b.payment_intent) {
      try {
        await stripe(env, 'POST', '/refunds', { payment_intent: b.payment_intent, metadata: { booking_id: b.id, origine: 'agenda' } });
        refunded = true;
      } catch (e) {
        refundError = String(e.message || e).replace(/^Stripe \S+ : /, '');
        if (/already been refunded/i.test(refundError)) { refunded = true; refundError = ''; }
        console.log('Remboursement agenda', b.id, refundError);
      }
      if (refunded) await env.DB.prepare('UPDATE bookings SET refunded = 1 WHERE id = ?1').bind(b.id).run();
    }
    await sendCancellation(env, b, refunded, { byAgenda: true, refundError });
  }
}

// Facture : le lendemain de la séance (24 h après la fin), pour les séances réglées en ligne.
async function sendInvoices(env, now = Date.now()) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM bookings WHERE status = 'confirmed' AND invoice_sent = 0 AND stripe_session IS NOT NULL AND payment_intent IS NOT NULL AND end <= ?1 AND end >= ?2 AND email LIKE '%@%'"
  ).bind(now - 24 * 3600e3, now - 72 * 3600e3).all();
  for (const b of results) {
    let inv;
    try {
      const s = await stripe(env, 'GET', `/checkout/sessions/${b.stripe_session}`);
      if (!s.invoice) { await env.DB.prepare('UPDATE bookings SET invoice_sent = 2 WHERE id = ?1').bind(b.id).run(); continue; } // payé avant la mise en place des factures
      inv = await stripe(env, 'GET', `/invoices/${typeof s.invoice === 'string' ? s.invoice : s.invoice.id}`);
    } catch (e) { console.log('Facture indisponible', b.id, String(e)); continue; }
    if (!inv?.hosted_invoice_url) continue;
    const claim = await env.DB.prepare('UPDATE bookings SET invoice_sent = 1 WHERE id = ?1 AND invoice_sent = 0').bind(b.id).run();
    if (claim.meta.changes !== 1) continue;
    await sendInvoice(env, b, inv);
  }
}

// Demande d'avis Google : 15 min après la fin d'une séance confirmée (cron toutes les 5 min).
// Une seule fois par client (même e-mail) ; rien pour une séance terminée depuis plus de 3 h.
async function askReviews(env, now = Date.now()) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM bookings WHERE status = 'confirmed' AND review_asked = 0 AND end <= ?1 AND end >= ?2 AND email LIKE '%@%'"
  ).bind(now - 15 * 60e3, now - 3 * 3600e3).all();
  let sent = 0;
  for (const b of results) {
    const claim = await env.DB.prepare('UPDATE bookings SET review_asked = 1 WHERE id = ?1 AND review_asked = 0').bind(b.id).run();
    if (claim.meta.changes !== 1) continue;
    const before = await env.DB.prepare('SELECT 1 FROM bookings WHERE email = ?1 COLLATE NOCASE AND review_asked = 1 AND id != ?2 LIMIT 1').bind(b.email, b.id).first();
    if (before) continue;
    await sendReviewRequest(env, b);
    sent++;
  }
  return sent;
}

export default {
  async scheduled(event, env, ctx) {
    const job = event.cron === '17 2 * * *' ? purge(env) : event.cron === '*/5 * * * *' ? syncFromCalendar(env).catch((e) => console.log('Synchro agenda', String(e))).then(() => askReviews(env)).then(() => sendInvoices(env)) : remind(env);
    ctx.waitUntil(job);
  },
  async fetch(req, env, ctx) {
    const h = { ...cors(req, env), ...SEC };
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
