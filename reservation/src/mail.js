/** E-mails (Resend) et invitations d'agenda (.ics). */
import { frLabel, icsUtc } from './time.js';
import { PLACES, RULES } from './catalog.js';

const euro = (c) => `${(c / 100).toFixed(c % 100 ? 2 : 0).replace('.', ',')} €`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const icsText = (s) => String(s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

function fold(line) {
  const out = [];
  let rest = line;
  while (rest.length > 74) { out.push(rest.slice(0, 74)); rest = ' ' + rest.slice(74); }
  out.push(rest);
  return out.join('\r\n');
}

/** Invitation iCalendar pour un rendez-vous (REQUEST) ou son annulation (CANCEL). */
export function bookingIcs(b, env, { method = 'REQUEST', attendee, attendeeName } = {}) {
  const place = PLACES[b.place];
  const organizer = env.MAIL_FROM_ADDRESS || 'reservation@alexandradegans-kinesiologie.com';
  const lines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//Alexandra Degans//Reservation//FR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${b.id}@alexandradegans-kinesiologie.com`,
    `SEQUENCE:${method === 'CANCEL' ? 1 : 0}`,
    `DTSTAMP:${icsUtc(Date.now())}`,
    `DTSTART:${icsUtc(b.start)}`,
    `DTEND:${icsUtc(b.end)}`,
    `SUMMARY:${icsText(attendeeName ? `${b.item_name} — ${b.name}` : `${b.item_name} avec Alexandra Degans`)}`,
    `LOCATION:${icsText(place?.address || '')}`,
    `DESCRIPTION:${icsText(attendeeName
      ? `Client : ${b.name}\nTél. : ${b.phone}\nE-mail : ${b.email}${b.message ? `\nPrécisions : ${b.message}` : ''}\nPayé : ${euro(b.price)}`
      : `Rendez-vous réservé et réglé en ligne (${euro(b.price)}).\nAlexandra Degans · 06 76 64 79 09`)}`,
    `ORGANIZER;CN=Alexandra Degans:mailto:${organizer}`,
    `ATTENDEE;CN=${icsText(attendeeName || b.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${attendee}`,
    `STATUS:${method === 'CANCEL' ? 'CANCELLED' : 'CONFIRMED'}`,
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

const b64 = (s) => btoa(unescape(encodeURIComponent(s)));

async function send(env, { to, subject, html, ics, icsMethod }) {
  if (!env.RESEND_API_KEY) { console.log('E-mail non envoyé (RESEND_API_KEY absente) :', subject, to); return { skipped: true }; }
  const body = {
    from: env.MAIL_FROM || 'Alexandra Degans <reservation@alexandradegans-kinesiologie.com>',
    to: Array.isArray(to) ? to : [to],
    reply_to: env.REPLY_TO || 'alexandradegans@outlook.fr',
    subject,
    html,
  };
  if (ics) body.attachments = [{ filename: icsMethod === 'CANCEL' ? 'annulation.ics' : 'rendez-vous.ics', content: b64(ics), content_type: `text/calendar; method=${icsMethod}; charset=UTF-8` }];
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) console.log('Erreur Resend', r.status, await r.text());
  return { ok: r.ok };
}

const layout = (title, inner) => `<!doctype html><html lang="fr"><body style="margin:0;background:#f3ede2;font-family:Georgia,'Times New Roman',serif;color:#3b4434">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:560px;background:#fbf8f2;border-radius:16px;border:1px solid #e6dcc8" cellpadding="0" cellspacing="0">
<tr><td style="padding:32px 32px 8px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#627056">Alexandra Degans · Kinésiologie</td></tr>
<tr><td style="padding:0 32px 8px;font-size:28px;line-height:1.2">${title}</td></tr>
<tr><td style="padding:8px 32px 32px;font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#3b4434">${inner}</td></tr>
</table>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#5b6453;margin-top:16px">Alexandra Degans · 06 76 64 79 09 · alexandradegans@outlook.fr</p>
</td></tr></table></body></html>`;

const recap = (b) => {
  const place = PLACES[b.place];
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;border-top:1px solid #e6dcc8">
<tr><td style="padding:10px 0;border-bottom:1px solid #e6dcc8;color:#627056;width:38%">Soin</td><td style="padding:10px 0;border-bottom:1px solid #e6dcc8">${esc(b.item_name)}</td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #e6dcc8;color:#627056">Date</td><td style="padding:10px 0;border-bottom:1px solid #e6dcc8">${esc(frLabel(b.start))}</td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #e6dcc8;color:#627056">Lieu</td><td style="padding:10px 0;border-bottom:1px solid #e6dcc8">${esc(place?.address)}</td></tr>
<tr><td style="padding:10px 0;border-bottom:1px solid #e6dcc8;color:#627056">Réglé</td><td style="padding:10px 0;border-bottom:1px solid #e6dcc8">${euro(b.price)}</td></tr>
</table>`;
};

export async function sendConfirmation(env, b) {
  const cancelUrl = `${env.SITE_URL}/reservation/annuler?t=${b.cancel_token}`;
  const note = b.note ? `<p style="background:#f3ede2;border-radius:8px;padding:12px 16px">${esc(b.note)}</p>` : '';
  const client = layout('Votre rendez-vous est confirmé.', `
<p>Bonjour ${esc(b.name)},</p>
<p>Merci pour votre réservation. Votre séance est réglée et confirmée :</p>
${recap(b)}${note}
<p>Venez dans une tenue confortable. Stationnement gratuit sur place.</p>
<p style="font-size:13px;color:#5b6453">Annulation remboursée intégralement jusqu'à ${RULES.refundHours} h avant le rendez-vous : <a href="${cancelUrl}" style="color:#627056">annuler ma réservation</a>. Au-delà, contactez Alexandra au 06 76 64 79 09.</p>
<p style="font-size:13px;color:#5b6453">La kinésiologie et les soins proposés ne se substituent pas à un suivi médical.</p>`);
  const pro = layout('Nouvelle réservation', `
<p><strong>${esc(b.name)}</strong> · ${esc(b.phone)} · <a href="mailto:${esc(b.email)}" style="color:#627056">${esc(b.email)}</a></p>
${recap(b)}${b.message ? `<p><strong>Précisions :</strong> ${esc(b.message)}</p>` : ''}
<p style="font-size:13px;color:#5b6453">${env.GCAL_HOOK_URL ? 'Le rendez-vous a été ajouté à l’agenda « Kinésiologie ».' : 'Le rendez-vous est joint en invitation d’agenda.'} Paiement visible dans Stripe.</p>`);
  const pros = [env.ALEXANDRA_EMAIL, env.ALEXANDRA_EMAIL_2].filter(Boolean);
  await send(env, { to: b.email, subject: `Rendez-vous confirmé — ${frLabel(b.start)}`, html: client, ics: bookingIcs(b, env, { attendee: b.email }), icsMethod: 'REQUEST' });
  for (const to of pros) {
    await send(env, { to, subject: `Nouvelle réservation : ${b.item_name} — ${frLabel(b.start)}`, html: pro, ...(env.GCAL_HOOK_URL ? {} : { ics: bookingIcs(b, env, { attendee: to, attendeeName: b.name }), icsMethod: 'REQUEST' }) });
  }
}

export async function sendCancellation(env, b, refunded) {
  const client = layout('Votre rendez-vous est annulé.', `
<p>Bonjour ${esc(b.name)},</p>
<p>Votre rendez-vous a bien été annulé.${refunded ? ` Le remboursement de ${euro(b.price)} est en cours (comptez quelques jours selon votre banque).` : ''}</p>
${recap(b)}
<p>À bientôt, peut-être, pour une prochaine séance.</p>`);
  const pro = layout('Réservation annulée', `<p>${esc(b.name)} a annulé son rendez-vous${refunded ? ' (remboursé)' : ''}.</p>${recap(b)}`);
  await send(env, { to: b.email, subject: `Rendez-vous annulé — ${frLabel(b.start)}`, html: client, ics: bookingIcs(b, env, { method: 'CANCEL', attendee: b.email }), icsMethod: 'CANCEL' });
  for (const to of [env.ALEXANDRA_EMAIL, env.ALEXANDRA_EMAIL_2].filter(Boolean)) {
    await send(env, { to, subject: `Annulation : ${b.item_name} — ${frLabel(b.start)}`, html: pro, ...(env.GCAL_HOOK_URL ? {} : { ics: bookingIcs(b, env, { method: 'CANCEL', attendee: to, attendeeName: b.name }), icsMethod: 'CANCEL' }) });
  }
}

/**
 * Agenda « Kinésiologie » d'Alexandra : le rendez-vous y est écrit directement
 * par un petit script Google (Apps Script, voir reservation/google-agenda.gs).
 */
export async function calendarSync(env, action, b) {
  if (!env.GCAL_HOOK_URL) return;
  const place = PLACES[b.place];
  const description = [
    `Client : ${b.name}`, `Tél. : ${b.phone}`, `E-mail : ${b.email}`,
    b.message ? `Précisions : ${b.message}` : '', `Réglé en ligne : ${euro(b.price)}`,
  ].filter(Boolean).join('\n');
  try {
    const r = await fetch(env.GCAL_HOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ secret: env.GCAL_HOOK_SECRET, action, id: b.id, title: `${b.item_name} — ${b.name}`, start: b.start, end: b.end, location: place?.address || '', description }),
    });
    const t = await r.text();
    if (!r.ok || !t.includes('"ok":true')) console.log('Agenda Google', action, r.status, t.slice(0, 300));
  } catch (e) {
    console.log('Agenda Google injoignable', String(e));
  }
}
