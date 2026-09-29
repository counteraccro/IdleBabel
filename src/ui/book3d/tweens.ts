/** Courbes d'une animation : lente aux deux bouts, qui démarre lentement, ou qui arrive en douceur. */
const EASINGS = {
  inOut: (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),
  in: (t: number): number => t * t,
  out: (t: number): number => 1 - (1 - t) ** 2,
};

interface Tween {
  start: number | null;
  duration: number;
  step: (eased: number) => void;
  ease: (t: number) => number;
  done: () => void;
}

/**
 * Petites animations menées par la boucle d'images du livre 3D (pas de requestAnimationFrame à elles :
 * le rendu à la demande sait ainsi quand redessiner). `run` renvoie une promesse tenue à la fin.
 */
export const createTweens = () => {
  const running: Tween[] = [];
  return {
    run: (duration: number, step: (eased: number) => void, easing: keyof typeof EASINGS = 'inOut'): Promise<void> =>
      new Promise((done) => running.push({ start: null, duration, step, ease: EASINGS[easing], done })),
    /** Avance les animations à l'instant `now` (instantanées si `instant`) ; true s'il y en avait. */
    update: (now: number, instant: boolean): boolean => {
      if (!running.length) return false;
      for (const tween of [...running]) {
        tween.start ??= now;
        const t = instant || tween.duration <= 0 ? 1 : Math.min(1, (now - tween.start) / tween.duration);
        tween.step(tween.ease(t));
        if (t < 1) continue;
        running.splice(running.indexOf(tween), 1);
        tween.done();
      }
      return true;
    },
  };
};
