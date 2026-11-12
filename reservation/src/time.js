/** Outils de dates en heure de Paris, sans dépendance. */
export const TZ = 'Europe/Paris';

const dtf = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short',
});

/** Composantes de l'heure murale de Paris pour un instant donné (ms UTC). */
export function parisParts(ms) {
  const p = Object.fromEntries(dtf.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const wd = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[p.weekday];
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, min: +p.minute, s: +p.second, wd };
}

/** Décalage de Paris par rapport à UTC (minutes) à un instant donné. */
function offsetAt(ms) {
  const p = parisParts(ms);
  const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s);
  return Math.round((asUtc - ms) / 60000);
}

/** Instant UTC (ms) correspondant à une heure murale dans un fuseau (Paris par défaut). */
export function wallToUtc(y, m, d, h = 0, min = 0, s = 0, tz = TZ) {
  const guess = Date.UTC(y, m - 1, d, h, min, s);
  if (tz === 'UTC') return guess;
  const off = tz === TZ ? offsetAt : (ms) => offsetIn(ms, tz);
  let t = guess - off(guess) * 60000;
  t = guess - off(t) * 60000; // second passage pour les changements d'heure
  return t;
}

const fmtCache = new Map();
function offsetIn(ms, tz) {
  let f = fmtCache.get(tz);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      f = dtf; // fuseau inconnu : on suppose Paris
    }
    fmtCache.set(tz, f);
  }
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return Math.round((Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms) / 60000);
}

export const pad = (n) => String(n).padStart(2, '0');
export const ymd = (p) => `${p.y}-${pad(p.m)}-${pad(p.d)}`;
export const hm = (s) => s.split(':').map(Number);

/** Ajoute n jours à une date civile {y,m,d}. */
export function addDays({ y, m, d }, n) {
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(), wd: t.getUTCDay() };
}

/** Libellé lisible en français, heure de Paris. */
export function frLabel(ms) {
  return new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));
}

/** Format iCalendar UTC : 20261112T093000Z */
export const icsUtc = (ms) => new Date(ms).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
