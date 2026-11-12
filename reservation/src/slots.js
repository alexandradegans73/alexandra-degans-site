/** Calcul des créneaux libres. */
import { HOURS, RULES } from './catalog.js';
import { wallToUtc, addDays, parisParts, hm, ymd, pad } from './time.js';

const MIN = 60000;

/**
 * @param {object} o
 * @param {number} o.duration  durée en minutes
 * @param {{start:number,end:number}[]} o.busy  plages occupées (agenda + réservations), en ms
 * @param {number} o.now  instant présent (ms)
 * @param {number} o.days  nombre de jours à couvrir à partir d'aujourd'hui
 * @returns {{date:string, slots:{start:number,label:string}[]}[]}
 */
export function computeSlots({ duration, busy, now, days = RULES.maxDaysAhead }) {
  const earliest = now + RULES.minNoticeHours * 3600000;
  const need = (duration + RULES.bufferMinutes) * MIN;
  const today = parisParts(now);
  const out = [];
  for (let i = 0; i <= Math.min(days, RULES.maxDaysAhead); i++) {
    const c = addDays(today, i);
    const ranges = HOURS[c.wd] || [];
    const slots = [];
    for (const [open, close] of ranges) {
      const [oh, om] = hm(open);
      const [ch, cm] = hm(close);
      const closeMs = wallToUtc(c.y, c.m, c.d, ch, cm);
      for (let t = wallToUtc(c.y, c.m, c.d, oh, om); t + duration * MIN <= closeMs; t += RULES.stepMinutes * MIN) {
        if (t < earliest) continue;
        // le temps tampon après le rendez-vous peut déborder sur la fermeture
        const end = t + need;
        const clash = busy.some((b) => b.start < end && b.end > t - RULES.bufferMinutes * MIN);
        if (!clash) {
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
export function isFree({ start, duration, busy, now }) {
  if (start < now + RULES.minNoticeHours * 3600000) return false;
  if (start > now + (RULES.maxDaysAhead + 1) * 86400000) return false;
  const p = parisParts(start);
  if (p.min % RULES.stepMinutes !== 0) return false;
  const ranges = HOURS[p.wd] || [];
  const inHours = ranges.some(([o, c]) => {
    const [oh, om] = hm(o); const [ch, cm] = hm(c);
    return start >= wallToUtc(p.y, p.m, p.d, oh, om) && start + duration * MIN <= wallToUtc(p.y, p.m, p.d, ch, cm);
  });
  if (!inHours) return false;
  const end = start + (duration + RULES.bufferMinutes) * MIN;
  return !busy.some((b) => b.start < end && b.end > start - RULES.bufferMinutes * MIN);
}
