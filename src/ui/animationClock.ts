/**
 * L'horloge des animations : elle s'arrête tant qu'une modale est ouverte (le décor derrière se fige :
 * livres 3D, pile, décor, animations CSS), et repart là où elle en était. Le jeu, lui, continue
 * (core/loop.ts) : à la reprise, `onResume` reçoit le temps passé à l'arrêt.
 */
let pausedSince: number | null = null;
let pausedTotal = 0;
const listeners = new Set<(seconds: number) => void>();

/** Instant des animations (en ms, comme performance.now) : celui de l'image `now`, moins les arrêts. */
export const animationNow = (now = performance.now()): number => now - pausedTotal - (pausedSince === null ? 0 : now - pausedSince);

export const pauseAnimations = (): void => {
  if (pausedSince !== null) return;
  pausedSince = performance.now();
  document.documentElement.classList.add('animations-paused');
};

export const resumeAnimations = (): void => {
  if (pausedSince === null) return;
  const paused = performance.now() - pausedSince;
  pausedTotal += paused;
  pausedSince = null;
  document.documentElement.classList.remove('animations-paused');
  listeners.forEach((listener) => listener(paused / 1000));
};

/** Prévient à chaque reprise, avec la durée de l'arrêt (en secondes). */
export const onResume = (listener: (seconds: number) => void): void => {
  listeners.add(listener);
};
