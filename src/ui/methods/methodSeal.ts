import { el } from '../dom';
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
}

export const createMethodSeal = (id: ToolId): MethodSeal => {
  const root = el('button', 'method-seal');
  const count = el('span', 'method-count number');
  root.append(el('span', 'method-rim'), el('span', 'method-core'));
  root.insertAdjacentHTML('beforeend', sigilSvg(id));
  root.append(count);
  return {
    root,
    show: (value, affordable) => {
      count.textContent = value;
      root.classList.toggle('ready', affordable);
    },
  };
};
