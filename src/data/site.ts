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
    { days: 'Samedi', time: '9 h – 14 h 30' },
  ],
  payments: 'Chèques, espèces, Paylib, virement',
  affiliations: [
    'Membre de la Fédération de la Kinésiologie Professionnelle',
    'Membre de la Fédération Française des Pratiques Alternatives Professionnelles',
  ],
  mediation: 'CNPM Médiation — adhérente n° CNPM32916',
  siret: '953 944 154 00012',
  googleReviews: 'https://www.google.com/maps/place/?q=place_id:ChIJpVBP6peti0cR6ICIh4BDzqU',
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
  /** Lignes affichées dans le cadre de la branche (accueil) */
  details: { label: string; duration: string; price: string }[];
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
    duration: '1 h',
    price: '70 €',
    details: [{ label: 'Séance', duration: '1 h', price: '70 €' }],
    branch: 'top',
  },
  {
    slug: 'memoires-transgenerationnelles',
    path: '/memoires-transgenerationnelles',
    name: 'Mémoires transgénérationnelles',
    short: 'Déposer ce qui ne vous appartient pas.',
    intro:
      'Deux séances pour explorer les loyautés familiales et alléger un héritage émotionnel transmis de génération en génération.',
    duration: '1 séance de kinésiologie + 1 soin énergétique',
    price: '140 €',
    details: [{ label: '1 séance de kinésiologie + 1 soin énergétique', duration: '', price: '140 €' }],
    branch: 'upper-left',
  },
  {
    slug: 'kinesiologie-animale',
    path: '/kinesiologie-animale',
    name: 'Kinésiologie animale',
    short: 'Comprendre votre animal, renforcer le lien.',
    intro:
      'Un accompagnement pour les animaux de compagnie : stress, peurs, comportements, arrivée d’un nouveau membre.',
    duration: '1 h 15 · à Bassens',
    price: '70 €',
    details: [{ label: 'Séance', duration: '1 h 15 · à Bassens', price: '70 €' }],
    branch: 'upper-right',
  },
  {
    slug: 'soins-energetiques',
    path: '/soins-energetiques',
    name: 'Soins énergétiques',
    short: 'Visage et corps, un temps pour soi.',
    intro:
      'Deux soins distincts : un soin du visage revitalisant, et un soin du corps profond, de la conception à la naissance.',
    duration: '45 min ou 1 h',
    price: 'dès 60 €',
    details: [{ label: 'Visage', duration: '45 min', price: '60 €' }, { label: 'Corps', duration: '1 h', price: '90 €' }],
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
    details: [{ label: 'Ventre', duration: '1 h', price: '60 €' }, { label: 'Jambes', duration: '75 min', price: '70 €' }],
    branch: 'right',
  },
];

/** Branches affichées sur l'accueil : les cinq soins + le soin à la carte (sans page dédiée). */
export type Branche = Pick<Prestation, 'slug' | 'path' | 'name' | 'short' | 'intro' | 'details'> & { cta?: string; external?: boolean };
export const branches: Branche[] = [
  ...prestations,
  {
    slug: 'soin-a-la-carte',
    path: site.booking,
    external: true,
    cta: 'Prendre rendez-vous',
    name: 'Soin à la carte',
    short: 'Composez votre séance.',
    intro: 'Deux soins de votre choix, réunis en un seul rendez-vous.',
    details: [{ label: '2 soins au choix', duration: '', price: '110 €' }],
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
    { label: '1 séance', detail: '45 min', price: '60 €' },
    { label: 'Forfait 5 séances', detail: '5 × 45 min', price: '250 €' },
    { label: 'Forfait 10 séances', detail: '10 × 45 min', price: '500 €' },
  ],
  corps: [{ label: 'Soin énergétique du corps', detail: '1 h', price: '90 €' }],
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

/**
 * Avis Google (fiche « Alexandra Degans kinésiologue certifiée à Bassens »).
 * Extraits courts et fidèles d'avis réels ; note et nombre d'avis relevés le 12/11/2026.
 * Pour afficher un avis en entier, remplacer le texte ci-dessous par le texte complet de la fiche Google.
 */
export const avis = {
  note: '5/5',
  total: 19,
  items: [
    { text: 'Le corps parle toujours et Alexandra sait le comprendre.' },
    { text: 'Toute la famille vient la voir, même nos chiens.' },
    { text: 'Elle a été très douce, professionnelle et a su les mettre à l’aise.' },
  ],
};
