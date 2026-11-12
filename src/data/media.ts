/**
 * MÉDIAS DU SITE.
 * Le film de l'arbre de vie (Higgsfield) est stocké en séquence d'images pour
 * être piloté image par image par le scroll. Jeux générés par scripts/film.sh.
 */
export const film = {
  /** Nombre d'images de la séquence */
  count: 482,
  /** Dossiers des jeux d'images */
  desktop: '/media/film/desktop',
  mobile: '/media/film/mobile',
  ext: 'webp',
  /** true tant que le film affiché est un brouillon basse définition */
  draft: false,
} as const;

export const media = {
  /** Ambiance sonore optionnelle (ElevenLabs), lecture uniquement sur action de l'utilisateur. */
  ambience: '/media/ambiance.mp3',
  /** Ambiances superposées à la musique (public/media/sons/<nom>.mp3), volume lié à l'avancement du film */
  layers: ['vent', 'feuillage', 'gouttes'],
  /** Portraits & lieux : photos professionnelles à fournir. */
  portrait: '/media/alexandra-degans-900.webp',
  cabinetBassens: '',
  cabinetMyans: '',
} as const;
