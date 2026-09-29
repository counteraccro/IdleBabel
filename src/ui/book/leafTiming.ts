/** Rythme d'une feuille tournée sur une page HTML (le carnet d'options, leafTurn.ts). */
export const TURN_MS = 850;
export const RELEASE_MS = 380;
/** Page tenue sans bouger : elle se soulève à peine. */
export const HELD_PROGRESS = 0.06;

export const easeInOut = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;
