/** Calcul des créneaux libres. */
import { HOURS, RULES, LUNCH } from './catalog.js';
import { wallToUtc, addDays, parisParts, hm, ymd, pad } from './time.js';

const MIN = 60000;

/** Heure (Paris) qui sépare le matin de l'après-midi. */
export const MIDDAY = 13;

/** Vrai si le créneau commence pendant la pause de midi (après 12 h et avant 14 h, en semaine). */
function inLunch(t) {
  const p = parisParts(t);
  if (!LUNCH.days.includes(p.wd)) return false;
  const m = p.h * 60 + p.min;
  const [ah, am] = hm(LUNCH.lastMorningStart), [bh, bm] = hm(LUNCH.firstAfternoonStart);
  return m > ah * 60 + am && m < bh * 60 + bm;
}

/**
 * Alexandra ne change pas de cabinet dans une même demi-journée : si un rendez-vous
 * (agenda ou site) est déjà situé dans l'autre cabinet le même matin / après-midi,
 * ce créneau n'est pas proposé ici.
 */
function otherPlaceSameHalfDay(t, place, busy) {
  if (!place) return false;
  const p = parisParts(t);
  const am = p.h < MIDDAY;
  const from = am ? wallToUtc(p.y, p.m, p.d, 0, 0) : wallToUtc(p.y, p.m, p.d, MIDDAY + 1, 0);
  const to = am ? wallToUtc(p.y, p.m, p.d, MIDDAY, 0) : wallToUtc(p.y, p.m, p.d, 23, 59);
  return busy.some((b) => b.place && b.place !== place && b.start < to && b.end > from);
}

/**
 * @param {object} o
 * @param {number} o.duration  durée en minutes
 * @param {{start:number,end:number}[]} o.busy  plages occupées (agenda + réservations), en ms
 * @param {number} o.now  instant présent (ms)
 * @param {number} o.days  nombre de jours à couvrir à partir d'aujourd'hui
 * @param {object} [o.hours]  horaires d'ouverture (par défaut : horaires généraux)
 * @param {string} [o.place]  cabinet demandé (bassens | myans)
 * @returns {{date:string, slots:{start:number,label:string}[]}[]}
 */
export function computeSlots({ duration, busy, now, days = RULES.maxDaysAhead, hours = HOURS, place }) {
  const earliest = now + RULES.minNoticeHours * 3600000;
  const need = (duration + RULES.bufferMinutes) * MIN;
  const today = parisParts(now);
  const out = [];
  for (let i = 0; i <= Math.min(days, RULES.maxDaysAhead); i++) {
    const c = addDays(today, i);
    const ranges = hours[c.wd] || [];
    const slots = [];
    for (const [open, close] of ranges) {
      const [oh, om] = hm(open);
      const [ch, cm] = hm(close);
      const closeMs = wallToUtc(c.y, c.m, c.d, ch, cm);
      for (let t = wallToUtc(c.y, c.m, c.d, oh, om); t + duration * MIN <= closeMs; t += RULES.stepMinutes * MIN) {
        if (t < earliest || inLunch(t)) continue;
        // le temps tampon après le rendez-vous peut déborder sur la fermeture
        const end = t + need;
        const clash = busy.some((b) => b.start < end && b.end > t - RULES.bufferMinutes * MIN);
        if (!clash && !otherPlaceSameHalfDay(t, place, busy)) {
          const p = parisParts(t);
          slots.push({ start: t, label: `${pad(p.h)}:${pad(p.min)}` });
        }
      }
    }
    if (slots.length) out.push({ date: ymd(c), slots });
  }
  return out;
}

/** Vérifie qu'un créneau précis est encore libre (au moment du paiement). */
export function isFree({ start, duration, busy, now, hours = HOURS, place }) {
  if (start < now + RULES.minNoticeHours * 3600000) return false;
  if (start > now + (RULES.maxDaysAhead + 1) * 86400000) return false;
  const p = parisParts(start);
  if (p.min % RULES.stepMinutes !== 0) return false;
  if (inLunch(start)) return false;
  const ranges = hours[p.wd] || [];
  const inHours = ranges.some(([o, c]) => {
    const [oh, om] = hm(o); const [ch, cm] = hm(c);
    return start >= wallToUtc(p.y, p.m, p.d, oh, om) && start + duration * MIN <= wallToUtc(p.y, p.m, p.d, ch, cm);
  });
  if (!inHours) return false;
  const end = start + (duration + RULES.bufferMinutes) * MIN;
  if (otherPlaceSameHalfDay(start, place, busy)) return false;
  return !busy.some((b) => b.start < end && b.end > start - RULES.bufferMinutes * MIN);
}
