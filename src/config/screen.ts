// Configuration de l'écran tactile cible (borne 1024 × 768).
// La bande gauche de l'écran est défectueuse (touches fantômes) :
// aucune interface ne doit jamais y être placée.
// Pour changer la largeur de la zone morte (75 / 125 / 150 px…), modifier
// uniquement DEAD_ZONE_LEFT : toute la mise en page s'adapte automatiquement.
export const DEAD_ZONE_LEFT = 100; // px
export const SCREEN_WIDTH = 1024; // px
export const SCREEN_HEIGHT = 768; // px

// En dessous de cette largeur (téléphones), la zone morte n'est pas appliquée.
export const DEAD_ZONE_MIN_VIEWPORT = 768; // px

export function applyScreenConfig(): void {
  const root = document.documentElement;
  root.style.setProperty('--dead-zone-left', `${DEAD_ZONE_LEFT}px`);
  root.style.setProperty('--screen-width', `${SCREEN_WIDTH}px`);
  root.style.setProperty('--screen-height', `${SCREEN_HEIGHT}px`);
}
