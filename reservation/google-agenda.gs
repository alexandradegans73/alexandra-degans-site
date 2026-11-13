/**
 * Réservations du site → agenda « Kinésiologie » d'Alexandra Degans.
 * Le site envoie chaque réservation payée (create) et chaque annulation (delete),
 * et relit toutes les 5 min les rendez-vous présents (tags) pour suivre suppressions et déplacements.
 * À déployer en « Application Web » : Exécuter en tant que « Moi », Accès « Tout le monde ».
 */
const SECRET = 'À_REMPLACER'; // même valeur que le secret GCAL_HOOK_SECRET du Worker (jamais dans le dépôt)
const CALENDAR_ID = 'e1bc485beb4b26153965524b396a81ba3b7289ad0ad36fd86bbc858c6f259303@group.calendar.google.com';

function doPost(e) {
  const out = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: 'json' }); }
  if (d.secret !== SECRET) return out({ ok: false, error: 'secret' });
  const cal = CalendarApp.getCalendarById(CALENDAR_ID);
  if (!cal) return out({ ok: false, error: 'agenda introuvable' });
  const mine = () => cal.getEvents(new Date(d.start - 864e5), new Date(d.end + 864e5)).filter((ev) => ev.getTag('reservation') === d.id);

  if (d.action === 'create') {
    if (mine().length) return out({ ok: true, deja: true });
    const ev = cal.createEvent(d.title, new Date(d.start), new Date(d.end), { location: d.location, description: d.description });
    ev.setTag('reservation', d.id);
    return out({ ok: true });
  }
  if (d.action === 'busy') {
    // Plages occupées entre d.from et d.to : agenda « Kinésiologie » + agenda principal du compte.
    // Ignorés : événements marqués « disponible » (ex. journées entières de notes) et invitations refusées.
    const from = new Date(d.from), to = new Date(d.to);
    const busy = [];
    [cal, CalendarApp.getDefaultCalendar()].forEach((c) => {
      if (!c) return;
      c.getEvents(from, to).forEach((ev) => {
        try { if (String(ev.getTransparency()) === 'TRANSPARENT') return; } catch (err) { if (ev.isAllDayEvent()) return; }
        try { if (String(ev.getMyStatus()) === 'NO') return; } catch (err) { /* sans objet */ }
        // Cabinet du rendez-vous, déduit du lieu ou du titre (sert à ne proposer que ce cabinet sur la même demi-journée).
        const txt = (ev.getLocation() + ' ' + ev.getTitle()).toLowerCase();
        const place = /myans|gardeny/.test(txt) ? 'myans' : /bassens|cobalt|haulotte/.test(txt) ? 'bassens' : '';
        busy.push([ev.getStartTime().getTime(), ev.getEndTime().getTime(), place]);
      });
    });
    return out({ ok: true, busy });
  }
  if (d.action === 'tags') {
    // Rendez-vous du site présents dans l'agenda (repérés par leur étiquette) avec leur horaire actuel :
    // le site annule ceux qui ont été supprimés et reprend l'horaire de ceux qui ont été déplacés.
    const from = new Date(d.from), to = new Date(d.to);
    const events = [];
    [cal, CalendarApp.getDefaultCalendar()].forEach((c) => {
      if (!c) return;
      c.getEvents(from, to).forEach((ev) => {
        const tag = ev.getTag('reservation');
        if (tag) events.push([tag, ev.getStartTime().getTime(), ev.getEndTime().getTime()]);
      });
    });
    return out({ ok: true, events });
  }
  if (d.action === 'delete') {
    const evs = mine();
    evs.forEach((ev) => ev.deleteEvent());
    return out({ ok: true, supprimes: evs.length });
  }
  return out({ ok: false, error: 'action' });
}

/** Lancer une fois à la main pour autoriser l'accès à l'agenda. */
function autoriser() {
  Logger.log(CalendarApp.getCalendarById(CALENDAR_ID).getName());
}
