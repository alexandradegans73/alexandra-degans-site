/**
 * Lecture d'un agenda iCalendar (adresse secrète iCal de Google Agenda) :
 * renvoie les plages occupées entre deux instants.
 * Gère : fuseaux (TZID), événements sur la journée, DURATION, événements récurrents
 * (RRULE DAILY/WEEKLY/MONTHLY/YEARLY, INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY),
 * EXDATE, occurrences modifiées (RECURRENCE-ID), événements annulés ou marqués « disponible ».
 */
import { wallToUtc, addDays } from './time.js';

const DAY = 86400000;
const WD = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function unfold(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function parseLine(line) {
  const i = line.indexOf(':');
  if (i < 0) return null;
  const head = line.slice(0, i);
  const value = line.slice(i + 1);
  const [name, ...ps] = head.split(';');
  const params = {};
  for (const p of ps) {
    const [k, v] = p.split('=');
    params[k.toUpperCase()] = (v || '').replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value };
}

/** Date iCal → { ms, allDay, wall:{y,m,d,h,min,s}, tz } */
function parseDate(value, params) {
  const v = value.trim();
  const m = v.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s, z] = m;
  const wall = { y: +y, m: +mo, d: +d, h: +(h || 0), min: +(mi || 0), s: +(s || 0) };
  if (!h || params.VALUE === 'DATE') {
    return { ms: wallToUtc(wall.y, wall.m, wall.d), allDay: true, wall, tz: 'Europe/Paris' };
  }
  const tz = z ? 'UTC' : params.TZID || 'Europe/Paris';
  return { ms: wallToUtc(wall.y, wall.m, wall.d, wall.h, wall.min, wall.s, tz), allDay: false, wall, tz };
}

function parseDuration(v) {
  const m = v.match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return 0;
  const [, sign, w, d, h, mi, s] = m;
  const ms = ((+w || 0) * 7 * DAY) + ((+d || 0) * DAY) + ((+h || 0) * 3600000) + ((+mi || 0) * 60000) + ((+s || 0) * 1000);
  return sign === '-' ? -ms : ms;
}

function parseRrule(v) {
  const r = {};
  for (const part of v.split(';')) {
    const [k, val] = part.split('=');
    r[k.toUpperCase()] = val;
  }
  return r;
}

export function parseEvents(text) {
  const events = [];
  let ev = null;
  for (const raw of unfold(text)) {
    if (raw === 'BEGIN:VEVENT') { ev = { exdates: [] }; continue; }
    if (raw === 'END:VEVENT') { if (ev) events.push(ev); ev = null; continue; }
    if (!ev) continue;
    const l = parseLine(raw);
    if (!l) continue;
    switch (l.name) {
      case 'UID': ev.uid = l.value; break;
      case 'DTSTART': ev.start = parseDate(l.value, l.params); break;
      case 'DTEND': ev.end = parseDate(l.value, l.params); break;
      case 'DURATION': ev.duration = parseDuration(l.value); break;
      case 'RRULE': ev.rrule = parseRrule(l.value); break;
      case 'EXDATE':
        for (const x of l.value.split(',')) { const d = parseDate(x, l.params); if (d) ev.exdates.push(d.ms); }
        break;
      case 'RECURRENCE-ID': ev.recurrenceId = parseDate(l.value, l.params); break;
      case 'STATUS': ev.status = l.value.trim().toUpperCase(); break;
      case 'TRANSP': ev.transp = l.value.trim().toUpperCase(); break;
      default: break;
    }
  }
  return events;
}

/** Occurrences (début, en ms) d'un événement récurrent dans [from, to]. */
function expand(ev, from, to, length) {
  const r = ev.rrule;
  const freq = r.FREQ;
  const interval = Math.max(1, +(r.INTERVAL || 1));
  const count = r.COUNT ? +r.COUNT : Infinity;
  const until = r.UNTIL ? parseDate(r.UNTIL, {})?.ms ?? Infinity : Infinity;
  const { wall, tz, allDay } = ev.start;
  const at = (y, m, d) => (allDay ? wallToUtc(y, m, d) : wallToUtc(y, m, d, wall.h, wall.min, wall.s, tz));
  const byday = (r.BYDAY || '').split(',').filter(Boolean).map((x) => {
    const mm = x.match(/^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/);
    return mm ? { n: mm[1] ? +mm[1] : 0, wd: WD[mm[2]] } : null;
  }).filter(Boolean);
  const bymonthday = (r.BYMONTHDAY || '').split(',').filter(Boolean).map(Number);

  const out = [];
  let emitted = 0;
  const push = (ms) => {
    if (ms < ev.start.ms) return true;
    if (ms > until || emitted >= count) return false;
    emitted++;
    if (ms + length > from && ms < to && !ev.exdates.includes(ms)) out.push(ms);
    return true;
  };
  const start = { y: wall.y, m: wall.m, d: wall.d };
  const startWd = new Date(Date.UTC(wall.y, wall.m - 1, wall.d)).getUTCDay();
  const LIMIT = 3000; // garde-fou

  if (freq === 'DAILY') {
    for (let i = 0; i < LIMIT; i++) {
      const c = addDays(start, i * interval);
      const ms = at(c.y, c.m, c.d);
      if (ms > to) break;
      if (byday.length && !byday.some((b) => b.wd === c.wd)) continue;
      if (!push(ms)) break;
    }
  } else if (freq === 'WEEKLY') {
    const days = byday.length ? byday.map((b) => b.wd) : [startWd];
    const weekStart = addDays(start, -((startWd + 6) % 7)); // lundi de la semaine de départ
    outer: for (let w = 0; w < LIMIT; w++) {
      const base = addDays(weekStart, w * 7 * interval);
      for (let k = 0; k < 7; k++) {
        const c = addDays(base, k);
        if (!days.includes(c.wd)) continue;
        const ms = at(c.y, c.m, c.d);
        if (ms > to) break outer;
        if (!push(ms)) break outer;
      }
    }
  } else if (freq === 'MONTHLY' || freq === 'YEARLY') {
    const step = freq === 'MONTHLY' ? interval : 12 * interval;
    for (let i = 0; i < LIMIT; i++) {
      const mi = wall.m - 1 + i * step;
      const y = wall.y + Math.floor(mi / 12);
      const m = (mi % 12) + 1;
      if (wallToUtc(y, m, 1) > to) break;
      const dim = new Date(Date.UTC(y, m, 0)).getUTCDate();
      let days = [];
      if (byday.length) {
        for (const b of byday) {
          const all = [];
          for (let d = 1; d <= dim; d++) if (new Date(Date.UTC(y, m - 1, d)).getUTCDay() === b.wd) all.push(d);
          if (b.n > 0) all[b.n - 1] && days.push(all[b.n - 1]);
          else if (b.n < 0) all[all.length + b.n] && days.push(all[all.length + b.n]);
          else days.push(...all);
        }
      } else if (bymonthday.length) {
        days = bymonthday.map((d) => (d < 0 ? dim + d + 1 : d)).filter((d) => d >= 1 && d <= dim);
      } else if (wall.d <= dim) {
        days = [wall.d];
      }
      let stop = false;
      for (const d of days.sort((a, b) => a - b)) {
        if (!push(at(y, m, d))) { stop = true; break; }
      }
      if (stop) break;
    }
  } else {
    push(ev.start.ms);
  }
  return out;
}

/** Plages occupées [{start, end}] (ms UTC) qui chevauchent [from, to]. */
export function busyFromIcs(text, from, to) {
  const events = parseEvents(text);
  const overrides = new Map(); // uid -> [ms des occurrences remplacées]
  for (const e of events) {
    if (e.recurrenceId && e.uid) {
      if (!overrides.has(e.uid)) overrides.set(e.uid, []);
      overrides.get(e.uid).push(e.recurrenceId.ms);
    }
  }
  const busy = [];
  for (const e of events) {
    if (!e.start) continue;
    if (e.status === 'CANCELLED' || e.transp === 'TRANSPARENT') continue;
    let length;
    if (e.end) length = e.end.ms - e.start.ms;
    else if (e.duration) length = e.duration;
    else length = e.start.allDay ? DAY : 0;
    if (length <= 0) continue;
    let starts;
    if (e.rrule && !e.recurrenceId) {
      e.exdates.push(...(overrides.get(e.uid) || []));
      starts = expand(e, from, to, length);
    } else {
      starts = e.start.ms + length > from && e.start.ms < to ? [e.start.ms] : [];
    }
    for (const s of starts) busy.push({ start: s, end: s + length });
  }
  return busy.sort((a, b) => a.start - b.start);
}
