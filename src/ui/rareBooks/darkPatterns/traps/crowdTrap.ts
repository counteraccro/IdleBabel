import './crowdTrap.css';
import { el } from '../../../dom';
import { button, site, traps, type Trap } from './trapStage';

/** Une bulle de plus toutes les… */
const TOAST_MS = 1100;
const FIRST_MS = 300;
/** La pile monte d'autant à chaque bulle, et n'en garde que tant. */
const STEP = 58;
const KEEP = 7;
/** Une bulle sur trois porte « ne plus afficher ». */
const MUTE_EVERY = 3;

/**
 * La foule inventée : des bulles « 12 personnes lisent cette page » arrivent l'une après l'autre, toujours sur
 * « Continuer », les plus anciennes montent. La grande porte : cliquer une bulle (on rejoint les autres). La vraie
 * sortie : « ne plus afficher », en tout petit dans une bulle sur trois, puis « Continuer ».
 */
export const crowdTrap: Trap = ({ layer, show, done, later, every, stopTimers }) => {
  const text = traps().crowd;
  const page = site(text.title, undefined, 9);
  let muted = false;
  const toasts: HTMLElement[] = [];
  let said = 0;

  const toast = (): void => {
    if (muted) return;
    const bubble = el('div', 'dp-toast');
    bubble.append(el('i'), el('span', undefined, text.toasts[said % text.toasts.length]));
    if (said % MUTE_EVERY === MUTE_EVERY - 1) {
      const mute = button('link', text.mute, () => {
        muted = true;
        stopTimers();
        toasts.forEach((other) => other.remove());
      });
      mute.addEventListener('click', (event) => event.stopPropagation());
      bubble.append(mute);
    }
    bubble.addEventListener('click', () => done(false, text.joined));
    // La plus récente se pose sur le bouton ; les autres montent d'un cran.
    for (const other of toasts) other.style.top = `${parseFloat(other.style.top) - STEP}px`;
    const target = go.getBoundingClientRect();
    const frame = layer.getBoundingClientRect();
    bubble.style.left = `${target.left - frame.left + target.width / 2 - 150 + (Math.random() - 0.5) * 40}px`;
    bubble.style.top = `${target.top - frame.top - 8}px`;
    layer.append(bubble);
    toasts.push(bubble);
    said++;
    if (toasts.length > KEEP) toasts.shift()?.remove();
  };

  // « Continuer » avant le silence : une bulle de plus.
  const go = button('big', text.continue, () => (muted ? done(true, text.free) : toast()));
  go.classList.add('dp-continue');
  page.append(go);
  show(page);
  later(toast, FIRST_MS);
  every(toast, TOAST_MS);
};
