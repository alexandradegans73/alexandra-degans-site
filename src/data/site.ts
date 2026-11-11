/**
 * Données centrales du site. Tout ce qui est ici provient de l'audit du site
 * Wix (novembre 2026) et de l'état du projet. Les tarifs sont marqués
 * « à confirmer » tant qu'Alexandra ne les a pas validés.
 */
export const site = {
  name: 'Alexandra Degans',
  title: 'Alexandra Degans · Kinésiologie',
  tagline: 'Retrouver l’équilibre, à votre rythme.',
  url: 'https://alexandradegans-kinesiologie.com',
  phone: '06 76 64 79 09',
  phoneHref: 'tel:+33676647909',
  email: 'alexandradegans@outlook.fr',
  booking: 'https://www.crenolibre.fr/prendre-rdv/114511',
  instagram: 'https://www.instagram.com/alexandra.degans',
  instagramHandle: 'alexandra.degans',
  hours: [
    { days: 'Lundi – Vendredi', time: '9 h – 20 h' },
    { days: 'Samedi', time: '9 h – 15 h' },
  ],
  payments: 'Chèques, espèces, Paylib, virement',
  affiliations: [
    'Membre de la Fédération de la Kinésiologie Professionnelle',
    'Membre de la Fédération Française des Pratiques Alternatives Professionnelles',
  ],
  mediation: 'CNPM Médiation — adhérente n° CNPM32916',
  places: [
    {
      id: 'bassens',
      name: 'Bassens',
      label: 'Le Cobalt',
      street: '17 rue Arthur Haulotte',
      zip: '73000',
      city: 'Bassens',
      note: 'Stationnement gratuit · à 5 min de Chambéry',
      maps: 'https://www.google.com/maps/search/?api=1&query=17+rue+Arthur+Haulotte+73000+Bassens',
      lat: 45.5873,
      lng: 5.9458,
    },
    {
      id: 'myans',
      name: 'Myans',
      label: 'Cabinet de Myans',
      street: '17 impasse du Gardeny',
      zip: '73800',
      city: 'Myans',
      note: 'Stationnement gratuit · au pied des vignes',
      maps: 'https://www.google.com/maps/search/?api=1&query=17+impasse+du+Gardeny+73800+Myans',
      lat: 45.5147,
      lng: 5.9869,
    },
  ],
} as const;

export type Prestation = {
  slug: string;
  path: string;
  name: string;
  short: string;
  intro: string;
  duration: string;
  price: string;
  branch: 'top' | 'upper-left' | 'upper-right' | 'left' | 'right';
};

/** Les cinq branches de l'arbre de vie. */
export const prestations: Prestation[] = [
  {
    slug: 'kinesiologie',
    path: '/kinesiologie',
    name: 'Kinésiologie',
    short: 'Écouter ce que le corps sait déjà.',
    intro:
      'Une approche psycho-corporelle douce pour identifier l’origine d’un blocage et libérer la charge émotionnelle qui l’accompagne.',
    duration: '1 h · 3 semaines entre les séances',
    price: '70 €',
    branch: 'top',
  },
  {
    slug: 'memoires-transgenerationnelles',
    path: '/memoires-transgenerationnelles',
    name: 'Mémoires transgénérationnelles',
    short: 'Déposer ce qui ne vous appartient pas.',
    intro:
      'Deux séances pour explorer les loyautés familiales et alléger un héritage émotionnel transmis de génération en génération.',
    duration: '2 séances',
    price: '140 €',
    branch: 'upper-left',
  },
  {
    slug: 'kinesiologie-animale',
    path: '/kinesiologie-animale',
    name: 'Kinésiologie animale',
    short: 'Comprendre votre animal, renforcer le lien.',
    intro:
      'Un accompagnement pour les animaux de compagnie et d’élevage : stress, peurs, comportements, arrivée d’un nouveau membre.',
    duration: '1 h 15 · à Bassens',
    price: '70 €',
    branch: 'upper-right',
  },
  {
    slug: 'soins-energetiques',
    path: '/soins-energetiques',
    name: 'Soins énergétiques',
    short: 'Visage et corps, un temps pour soi.',
    intro:
      'Un soin du visage revitalisant et un soin du corps profond, de la conception à la naissance, pour relâcher et se reconnecter.',
    duration: '1 h ou 2 h',
    price: 'dès 60 €',
    branch: 'left',
  },
  {
    slug: 'drainage-lymphatique',
    path: '/drainage-lymphatique',
    name: 'Drainage lymphatique',
    short: 'Légèreté du ventre et des jambes.',
    intro:
      'Des gestes lents et précis pour accompagner la circulation de la lymphe, apaiser les gonflements et retrouver de la légèreté.',
    duration: '1 h ou 75 min',
    price: 'dès 60 €',
    branch: 'right',
  },
];

export const nav = [
  { label: 'La kinésiologie', path: '/kinesiologie' },
  { label: 'Mémoires transgénérationnelles', path: '/memoires-transgenerationnelles' },
  { label: 'Kinésiologie animale', path: '/kinesiologie-animale' },
  { label: 'Soins énergétiques', path: '/soins-energetiques' },
  { label: 'Drainage lymphatique', path: '/drainage-lymphatique' },
  { label: 'À propos', path: '/a-propos' },
  { label: 'Contact', path: '/contact' },
];

/** Tarifs (à confirmer par Alexandra avant publication). */
export const tarifs = {
  kinesiologie: [{ label: 'Séance de kinésiologie', detail: '1 h', price: '70 €' }],
  transgenerationnel: [{ label: 'Libération des loyautés familiales', detail: '2 séances (kinésiologie + soin énergétique)', price: '140 €', note: 'au lieu de 160 €' }],
  animale: [{ label: 'Séance de kinésiologie animale', detail: '1 h 15 · uniquement à Bassens', price: '70 €' }],
  visage: [
    { label: '1 séance', detail: '1 h', price: '60 €' },
    { label: 'Forfait 5 séances', detail: '5 × 1 h', price: '250 €' },
    { label: 'Forfait 10 séances', detail: '10 × 1 h', price: '500 €' },
  ],
  corps: [{ label: 'Soin énergétique du corps', detail: '2 h', price: '90 €' }],
  ventre: [
    { label: '1 séance', detail: '1 h', price: '60 €' },
    { label: 'Forfait 3 séances', detail: '3 × 1 h', price: '160 €' },
    { label: 'Forfait 5 séances', detail: '5 × 1 h', price: '250 €' },
  ],
  jambes: [
    { label: '1 séance', detail: '75 min', price: '70 €' },
    { label: 'Forfait 3 séances', detail: '3 × 75 min', price: '190 €' },
    { label: 'Forfait 5 séances', detail: '5 × 75 min', price: '320 €' },
  ],
  ventreJambes: [
    { label: '1 séance', detail: 'ventre + jambes', price: '120 €' },
    { label: 'Forfait 3 séances', detail: 'ventre + jambes', price: '320 €' },
    { label: 'Forfait 5 séances', detail: 'ventre + jambes', price: '520 €' },
  ],
};
