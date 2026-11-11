/**
 * MÉDIAS DU SITE.
 * Le film de l'arbre de vie (Higgsfield) est stocké en séquence d'images pour
 * être piloté image par image par le scroll. Jeux générés par scripts/film.sh.
 */
export const film = {
  /** Nombre d'images de la séquence */
  count: 603,
  /** Dossiers des jeux d'images */
  desktop: '/media/film/desktop',
  mobile: '/media/film/mobile',
  ext: 'webp',
  /** true tant que le film affiché est un brouillon basse définition */
  draft: true,
} as const;

export const media = {
  /** Ambiance sonore optionnelle (ElevenLabs), lecture uniquement sur action de l'utilisateur. */
  ambience: '/media/ambiance.mp3',
  /** Portraits & lieux : photos professionnelles à fournir. */
  portrait: '',
  cabinetBassens: '',
  cabinetMyans: '',
} as const;
