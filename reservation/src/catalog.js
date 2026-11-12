/**
 * Catalogue des prestations réservables en ligne.
 * Les prix sont en centimes et font foi côté serveur (jamais ceux envoyés par le navigateur).
 * `duration` = durée du rendez-vous réservé, en minutes.
 * `places` = lieux où la prestation est proposée.
 */
export const PLACES = {
  bassens: { name: 'Bassens', address: 'Le Cobalt, 17 rue Arthur Haulotte, 73000 Bassens' },
  myans: { name: 'Myans', address: '17 impasse du Gardeny, 73800 Myans' },
};

const BOTH = ['bassens', 'myans'];
const NEXT = 'Vous réservez la première séance ; les suivantes se fixent avec Alexandra.';

/**
 * Chaque prestation appartient à un soin (`group`), éventuellement à une zone (`zone`)
 * et à une formule (`pack` = nombre de séances). Le site s'en sert pour un choix en 3 temps.
 */
export const CATALOG = [
  { id: 'kinesiologie', group: 'Kinésiologie', name: 'Séance de kinésiologie', duration: 60, price: 7000, places: BOTH },
  {
    id: 'memoires', group: 'Mémoires transgénérationnelles',
    name: 'Mémoires transgénérationnelles (1 séance de kinésiologie + 1 soin énergétique)',
    duration: 60, price: 14000, places: BOTH,
    note: 'Vous réservez ici la première séance ; la seconde se fixe ensemble à la fin de celle-ci.',
  },
  { id: 'animale', group: 'Kinésiologie animale', name: 'Séance de kinésiologie animale', duration: 75, price: 7000, places: BOTH },

  { id: 'visage', group: 'Soins énergétiques', zone: 'Visage', pack: 1, name: 'Massage énergétique du visage', duration: 45, price: 6000, places: BOTH },
  { id: 'visage-5', group: 'Soins énergétiques', zone: 'Visage', pack: 5, name: 'Massage énergétique du visage — forfait 5 séances', duration: 45, price: 25000, places: BOTH, note: NEXT },
  { id: 'visage-10', group: 'Soins énergétiques', zone: 'Visage', pack: 10, name: 'Massage énergétique du visage — forfait 10 séances', duration: 45, price: 50000, places: BOTH, note: NEXT },
  { id: 'corps', group: 'Soins énergétiques', zone: 'Corps', pack: 1, name: 'Soin énergétique du corps', duration: 60, price: 9000, places: BOTH },

  { id: 'ventre', group: 'Drainage lymphatique', zone: 'Ventre', pack: 1, name: 'Drainage lymphatique du ventre', duration: 60, price: 6000, places: BOTH },
  { id: 'ventre-3', group: 'Drainage lymphatique', zone: 'Ventre', pack: 3, name: 'Drainage du ventre — forfait 3 séances', duration: 60, price: 16000, places: BOTH, note: NEXT },
  { id: 'ventre-5', group: 'Drainage lymphatique', zone: 'Ventre', pack: 5, name: 'Drainage du ventre — forfait 5 séances', duration: 60, price: 25000, places: BOTH, note: NEXT },
  { id: 'jambes', group: 'Drainage lymphatique', zone: 'Jambes', pack: 1, name: 'Drainage lymphatique des jambes', duration: 75, price: 7000, places: BOTH },
  { id: 'jambes-3', group: 'Drainage lymphatique', zone: 'Jambes', pack: 3, name: 'Drainage des jambes — forfait 3 séances', duration: 75, price: 19000, places: BOTH, note: NEXT },
  { id: 'jambes-5', group: 'Drainage lymphatique', zone: 'Jambes', pack: 5, name: 'Drainage des jambes — forfait 5 séances', duration: 75, price: 32000, places: BOTH, note: NEXT },
  { id: 'ventre-jambes', group: 'Drainage lymphatique', zone: 'Ventre + jambes', pack: 1, name: 'Drainage ventre + jambes', duration: 135, price: 12000, places: BOTH },
  { id: 'ventre-jambes-3', group: 'Drainage lymphatique', zone: 'Ventre + jambes', pack: 3, name: 'Drainage ventre + jambes — forfait 3 séances', duration: 135, price: 32000, places: BOTH, note: NEXT },
  { id: 'ventre-jambes-5', group: 'Drainage lymphatique', zone: 'Ventre + jambes', pack: 5, name: 'Drainage ventre + jambes — forfait 5 séances', duration: 135, price: 52000, places: BOTH, note: NEXT },

  // Deux soins au choix parmi les massages, soins énergétiques et drainages ; durée = somme des deux.
  { id: 'a-la-carte', group: 'Soin à la carte', name: 'Soin à la carte', duration: 0, price: 11000, places: BOTH, combo: ['visage', 'corps', 'ventre', 'jambes'] },
];

/** Horaires d'ouverture (heure de Paris). 0 = dimanche. */
export const HOURS = {
  1: [['09:00', '19:00']],
  2: [['09:00', '19:00']],
  3: [['09:00', '19:00']],
  4: [['09:00', '19:00']],
  5: [['09:00', '19:00']],
  6: [['09:00', '14:30']],
};

/** Jours d'ouverture par cabinet : Bassens fermé le lundi et le mardi, Myans fermé le samedi. */
export const PLACE_HOURS = {
  bassens: { 3: HOURS[3], 4: HOURS[4], 5: HOURS[5], 6: HOURS[6] },
  myans: { 1: HOURS[1], 2: HOURS[2], 3: HOURS[3], 4: HOURS[4], 5: HOURS[5] },
};

export const RULES = {
  stepMinutes: 30, // un créneau peut démarrer toutes les demi-heures
  bufferMinutes: 15, // temps libre après chaque rendez-vous
  minNoticeHours: 12, // délai minimal avant un rendez-vous
  maxDaysAhead: 60, // réservation possible jusqu'à 60 jours
  holdMinutes: 30, // créneau bloqué pendant le paiement (minimum Stripe)
  refundHours: 48, // remboursement si annulation au moins 48 h avant
};

export const findItem = (id) => CATALOG.find((c) => c.id === id);

/**
 * Prestation réservée, prête à l'emploi (nom, durée, prix).
 * Pour le soin à la carte, `combo` = les deux soins choisis (identifiants distincts parmi `item.combo`).
 */
export function resolveItem(id, combo) {
  const item = findItem(id);
  if (!item) return null;
  if (!item.combo) return item;
  const ids = (Array.isArray(combo) ? combo : String(combo || '').split(',')).map((x) => String(x).trim()).filter(Boolean);
  if (ids.length !== 2 || ids[0] === ids[1] || !ids.every((x) => item.combo.includes(x))) return null;
  const parts = ids.map(findItem);
  return {
    ...item,
    combo: ids,
    name: `Soin à la carte : ${parts.map((p) => p.name).join(' + ')}`,
    duration: parts.reduce((t, p) => t + p.duration, 0),
  };
}
