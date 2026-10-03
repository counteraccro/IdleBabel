import './sealVision.css';
import { el } from './dom';
import { SEALS, sealSeries } from '../data/seals';
import { onSealed } from '../systems/seals';
import { sealSvg, sigil } from './strangeBook/sigil';

/** Le temps d'une vision (voir sealVision.css). */
const VISION_MS = 4200;

/**
 * Un sceau vient d'être apposé : il apparaît dans l'obscurité, à droite de l'écran — d'abord en relief,
 * puis doré — luit un instant et se dissout. Rien n'est écrit : le joueur le retrouvera dans le livre étrange.
 * Plusieurs sceaux d'un coup (vieille partie, gros palier) : une seule vision, la plus avancée.
 */
export const mountSealVisions = (): void => {
  const stage = el('div', 'seal-visions');
  stage.setAttribute('aria-hidden', 'true');
  document.body.append(stage);
  let count = 0;

  onSealed((ids) => {
    const seal = SEALS.find((candidate) => candidate.id === ids[ids.length - 1]);
    if (!seal) return;
    const shapes = sigil(sealSeries(seal), seal.tier?.index ?? 0);
    const vision = el('div', 'seal-vision');
    const uid = `vision-${count++}`;
    vision.innerHTML = `<div class="seal-vision-relief">${sealSvg(shapes, 'embossed', uid)}</div><div class="seal-vision-gold">${sealSvg(shapes, 'gold', uid)}</div>`;
    stage.append(vision);
    window.setTimeout(() => vision.remove(), VISION_MS);
  });
};
