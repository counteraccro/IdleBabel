/**
 * Geste sur le livre : un clic court tourne la page ; un appui maintenu « prend » la page,
 * qui suit ensuite le pointeur (souris ou doigt) jusqu'au relâchement.
 */
export interface GrabHandlers {
  /** Clic court : tourner la page d'un coup. */
  turn: () => void;
  /** La page est saisie (appui maintenu ou glissement). */
  grab: () => void;
  /** Avancement de la page tenue, de 0 (à plat à droite) à 1 (tournée). */
  move: (progress: number) => void;
  /** La page est lâchée à cet avancement. */
  release: (progress: number) => void;
}

const HOLD_MS = 180;
const DRAG_THRESHOLD_PX = 6;
/** Distance à parcourir vers la gauche, en largeur de livre, pour tourner entièrement la page. */
const FULL_TURN_WIDTH = 0.75;

/**
 * `direction` : sens du geste, choisi à l'appui (1 : on tire vers la gauche, la page de droite
 * tourne ; -1 : on tire vers la droite, pour revenir en arrière). Le livre en main tire toujours à gauche.
 */
export const attachGrab = (book: HTMLElement, handlers: GrabHandlers, direction: (event: PointerEvent) => 1 | -1 = () => 1): void => {
  let startX = 0;
  let sign: 1 | -1 = 1;
  let pointerId: number | null = null;
  let grabbing = false;
  let progress = 0;
  let holdTimer = 0;

  const grab = (): void => {
    if (grabbing) return;
    grabbing = true;
    handlers.grab();
  };

  book.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    pointerId = event.pointerId;
    book.setPointerCapture(pointerId);
    startX = event.clientX;
    sign = direction(event);
    progress = 0;
    holdTimer = window.setTimeout(grab, HOLD_MS);
  });

  book.addEventListener('pointermove', (event) => {
    if (event.pointerId !== pointerId) return;
    const dx = (startX - event.clientX) * sign;
    if (!grabbing && Math.abs(dx) > DRAG_THRESHOLD_PX) grab();
    if (!grabbing) return;
    progress = Math.min(1, Math.max(0, dx / (book.getBoundingClientRect().width * FULL_TURN_WIDTH)));
    handlers.move(progress);
  });

  const end = (event: PointerEvent, cancelled: boolean): void => {
    if (event.pointerId !== pointerId) return;
    window.clearTimeout(holdTimer);
    pointerId = null;
    if (grabbing) handlers.release(cancelled ? 0 : progress);
    else if (!cancelled) handlers.turn();
    grabbing = false;
  };
  book.addEventListener('pointerup', (event) => end(event, false));
  book.addEventListener('pointercancel', (event) => end(event, true));

  // Clavier (Entrée, Espace) : le navigateur envoie un clic sans pointeur.
  book.addEventListener('click', (event) => {
    if (event.detail === 0) handlers.turn();
  });
};
