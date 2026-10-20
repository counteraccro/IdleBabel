import { el } from '../dom';
import { setNumberText } from '../babelDigits';
import { sigil } from '../strangeBook/sigil';
import { SENTENCES } from '../../data/sentences';
import type { ToolId } from '../../data/tools';

/**
 * Le sceau d'une méthode : le même que sur sa page du livre blanc (mêmes traits, tirés de sa phrase), dans
 * un hexagone doré. Sans le double hexagone du bord (le cadre le fait déjà), vu d'un peu plus près.
 */
const sigilSvg = (id: ToolId): string => {
  const sentence = SENTENCES.find((candidate) => candidate.tool === id);
  const shapes = sigil(`whiteBook:${sentence?.id ?? id}`).slice(2);
  const gradient = `method-gold-${id}`;
  const body = shapes
    .map((shape) =>
      shape.kind === 'path'
        ? `<path d="${shape.d}"/>`
        : `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r.toFixed(1)}"${shape.filled ? ` fill="url(#${gradient})"` : ''}/>`,
    )
    .join('');
  return `<svg class="method-sigil" viewBox="12 12 76 76" aria-hidden="true"><defs><linearGradient id="${gradient}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="100"><stop offset="0" stop-color="#f7e2a6"/><stop offset=".5" stop-color="#d9a94e"/><stop offset="1" stop-color="#a8762c"/></linearGradient></defs><g fill="none" stroke="url(#${gradient})" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
};

export interface MethodSeal {
  root: HTMLButtonElement;
  /** Nombre possédé, et assez de pages pour la suivante ? */
  show: (count: string, affordable: boolean) => void;
  /**
   * La méthode qui s'annonce (piste B de .ai/maquette-methode-floue.html, l'auteur, 20/10) : sceau éteint, « ? » au lieu
   * du nombre, et ses traits qui se dessinent au prorata des morceaux de sa phrase (`drawn`, de 0 à 1).
   */
  sketch: (drawn: number) => void;
}

export const createMethodSeal = (id: ToolId): MethodSeal => {
  const root = el('button', 'method-seal');
  // Pour qu'un mod sache quel sceau est quelle méthode ; le jeu ne touche à aucun autre attribut data-* d'un sceau.
  root.dataset.method = id;
  const count = el('span', 'method-count number');
  root.append(el('span', 'method-rim'), el('span', 'method-core'));
  root.insertAdjacentHTML('beforeend', sigilSvg(id));
  root.append(count);
  const strokes = [...root.querySelectorAll<SVGElement>('.method-sigil g > *')];
  const drawAll = (shown: number): void => strokes.forEach((stroke, index) => stroke.classList.toggle('undrawn', index >= shown));
  return {
    root,
    show: (value, affordable) => {
      root.classList.remove('announced');
      drawAll(strokes.length);
      setNumberText(count, value, 11);
      root.classList.toggle('ready', affordable);
    },
    sketch: (drawn) => {
      root.classList.remove('ready');
      root.classList.add('announced');
      drawAll(Math.round(drawn * strokes.length));
      setNumberText(count, '?', 11);
    },
  };
};
