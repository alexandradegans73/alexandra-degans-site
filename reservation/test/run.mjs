import { busyFromIcs } from '../src/ics.js';
import { computeSlots, isFree } from '../src/slots.js';
import { wallToUtc, frLabel, parisParts } from '../src/time.js';
import assert from 'node:assert/strict';

const P = (y,m,d,h=0,mi=0) => wallToUtc(y,m,d,h,mi);
// --- fuseau : 12/11/2026 10:00 Paris = 09:00 UTC ; 15/07/2026 10:00 Paris = 08:00 UTC
assert.equal(new Date(P(2026,11,12,10)).toISOString(), '2026-11-12T09:00:00.000Z');
assert.equal(new Date(P(2026,7,15,10)).toISOString(), '2026-07-15T08:00:00.000Z');

const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:a
DTSTART;TZID=Europe/Paris:20261116T100000
DTEND;TZID=Europe/Paris:20261116T113000
SUMMARY:RDV simple
END:VEVENT
BEGIN:VEVENT
UID:b
DTSTART:20261117T130000Z
DTEND:20261117T140000Z
SUMMARY:UTC
END:VEVENT
BEGIN:VEVENT
UID:c
DTSTART;TZID=Europe/Paris:20261102T180000
DTEND;TZID=Europe/Paris:20261102T190000
RRULE:FREQ=WEEKLY;BYDAY=MO,WE
EXDATE;TZID=Europe/Paris:20261118T180000
SUMMARY:Hebdo lundi mercredi
END:VEVENT
BEGIN:VEVENT
UID:c
RECURRENCE-ID;TZID=Europe/Paris:20261123T180000
DTSTART;TZID=Europe/Paris:20261123T080000
DTEND;TZID=Europe/Paris:20261123T083000
SUMMARY:Occurrence déplacée
END:VEVENT
BEGIN:VEVENT
UID:d
DTSTART;VALUE=DATE:20261120
DTEND;VALUE=DATE:20261121
SUMMARY:Journée bloquée
END:VEVENT
BEGIN:VEVENT
UID:e
DTSTART;VALUE=DATE:20261119
DTEND;VALUE=DATE:20261120
TRANSP:TRANSPARENT
SUMMARY:Anniversaire (disponible)
END:VEVENT
BEGIN:VEVENT
UID:f
DTSTART;TZID=Europe/Paris:20261118T090000
DURATION:PT2H
STATUS:CANCELLED
SUMMARY:Annulé
END:VEVENT
BEGIN:VEVENT
UID:g
DTSTART;TZID=Europe/Paris:20261103T120000
DTEND;TZID=Europe/Paris:20261103T130000
RRULE:FREQ=MONTHLY;BYDAY=-1TU;COUNT=3
SUMMARY:Dernier mardi du mois
END:VEVENT
END:VCALENDAR`.replace(/\n/g,'\r\n');

const from = P(2026,11,16), to = P(2026,12,31);
const busy = busyFromIcs(ics, from, to);
const lbl = busy.map(b => `${frLabel(b.start)} → ${new Date(b.end).toISOString().slice(11,16)}Z`);
console.log(lbl.join('\n'));
const has = (y,m,d,h,mi=0) => busy.some(b => b.start === P(y,m,d,h,mi));
assert(has(2026,11,16,10));               // simple
assert(busy.some(b => b.start === Date.UTC(2026,10,17,13))); // UTC
assert(has(2026,11,16,18));               // hebdo lundi
assert(!has(2026,11,18,18));              // EXDATE mercredi
assert(!has(2026,11,23,18));              // occurrence remplacée
assert(has(2026,11,23,8));                // occurrence déplacée
assert(has(2026,11,25,18));               // hebdo continue
assert(has(2026,11,20,0));                // journée bloquée
assert(!has(2026,11,19,0));               // transparente ignorée
assert(!has(2026,11,18,9));               // annulé ignoré
assert(has(2026,11,24,12));               // dernier mardi de novembre
assert(has(2026,12,29,12));               // dernier mardi de décembre

// --- créneaux
const now = P(2026,11,14,8); // samedi 14/11 8h
const days = computeSlots({ duration: 60, busy, now, days: 10 });
const day = (s) => days.find(d => d.date === s);
assert(!day('2026-11-15'), 'dimanche fermé');
assert(!day('2026-11-20'), 'journée bloquée');
const mon = day('2026-11-16').slots.map(s=>s.label);
console.log('lundi 16 :', mon.join(' '));
assert(!mon.includes('09:30'), '9h30+1h+15min tampon chevauche RDV 10h');
assert(mon.includes('09:00') === false, '9h00 : 9h-10h + tampon 15 min chevauche 10h');
assert(!mon.includes('11:45') && mon.includes('12:00'), 'RDV finit 11h30 + 15 min → prochain créneau à la demi-heure : 12h00');
assert(!mon.includes('11:30'));
assert(mon.includes('16:30') && !mon.includes('17:00'), 'avant le RDV hebdo de 18h (créneaux à la demi-heure)');
assert(!mon.some(l => l >= '17:00'), 'rien après : 19h15 + 1 h dépasse 20h');
const tue = day('2026-11-17').slots.map(s=>s.label);
assert(tue.includes('19:00') && !tue.includes('19:15'), 'fermeture 20h');
assert(tue.includes('12:30') && !tue.includes('13:00') && !tue.includes('15:00') && tue.includes('15:30'), 'RDV 14h-15h (13h UTC)');
const sat = day('2026-11-21').slots.map(s=>s.label);
assert(sat.at(-1) === '13:30', 'samedi : dernier créneau 13h30 pour finir à 14h30, reçu ' + sat.at(-1));
// délai minimal 12 h
const early = computeSlots({ duration: 60, busy: [], now: P(2026,11,16,8), days: 0 });
assert.equal(early.length, 0, 'aucun créneau le jour même avant 12 h de délai');
assert(isFree({ start: P(2026,11,16,14), duration: 60, busy, now }));
assert(!isFree({ start: P(2026,11,16,10,30), duration: 60, busy, now }));
assert(!isFree({ start: P(2026,11,15,10), duration: 60, busy, now }), 'dimanche');
assert(!isFree({ start: P(2026,11,16,14,10), duration: 60, busy, now }), 'pas au quart d’heure');
console.log('\nTous les tests passent.');

// --- soin à la carte
import { resolveItem } from '../src/catalog.js';
{
  const r = resolveItem('a-la-carte', 'visage,ventre');
  assert.equal(r.duration, 105);
  assert.equal(r.price, 11000);
  assert.match(r.name, /visage \+ Drainage lymphatique du ventre/);
  assert.equal(resolveItem('a-la-carte', 'visage,visage'), null);
  assert.equal(resolveItem('a-la-carte', 'visage'), null);
  assert.equal(resolveItem('a-la-carte', 'visage,kinesiologie'), null);
  assert.equal(resolveItem('a-la-carte', ['ventre', 'jambes']).duration, 135);
  assert.equal(resolveItem('kinesiologie').duration, 60);
  console.log('Soin à la carte : OK');
}
