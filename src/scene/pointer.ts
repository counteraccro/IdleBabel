/** Position lissée du pointeur (ou inclinaison du téléphone), de -1 à 1 sur chaque axe. */
export interface Pointer {
  x: number;
  y: number;
}

const SMOOTHING = 0.06;

export const createPointer = (): { current: Pointer; step: () => void } => {
  const target: Pointer = { x: 0, y: 0 };
  const current: Pointer = { x: 0, y: 0 };

  window.addEventListener('pointermove', (event) => {
    target.x = (event.clientX / window.innerWidth) * 2 - 1;
    target.y = (event.clientY / window.innerHeight) * 2 - 1;
  });
  window.addEventListener('deviceorientation', (event) => {
    if (event.gamma === null || event.beta === null) return;
    target.x = Math.max(-1, Math.min(1, event.gamma / 30));
    target.y = Math.max(-1, Math.min(1, (event.beta - 45) / 30));
  });

  const step = (): void => {
    current.x += (target.x - current.x) * SMOOTHING;
    current.y += (target.y - current.y) * SMOOTHING;
  };
  return { current, step };
};
