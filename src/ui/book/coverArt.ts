import './coverArt.css';
import { el } from '../dom';
import { shelfMarkText, type CoverDesign } from '../../systems/coverDesign';
import { createWear } from './coverWear';
import { modernBack, modernFront } from './coverModern';

/** Fleurons dorés au centre de la couverture de devant (dessins fixes, choisis par la couverture). */
const ORNAMENTS = [
  // losange pointé
  '<path d="M20 3 L33 20 L20 37 L7 20 Z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M20 11 L26 20 L20 29 L14 20 Z"/><circle cx="20" cy="1.5" r="1.3"/><circle cx="20" cy="38.5" r="1.3"/>',
  // rosace
  '<circle cx="20" cy="20" r="3.2"/>' +
    Array.from({ length: 8 }, (_, i) => {
      const angle = (i * Math.PI) / 4;
      return `<circle cx="${(20 + 9 * Math.cos(angle)).toFixed(2)}" cy="${(20 + 9 * Math.sin(angle)).toFixed(2)}" r="3.4"/>`;
    }).join('') +
    '<circle cx="20" cy="20" r="15.5" fill="none" stroke="currentColor" stroke-width="1"/>',
  // étoile à huit branches
  `<polygon points="${Array.from({ length: 16 }, (_, i) => {
    const angle = (i * Math.PI) / 8 - Math.PI / 2;
    const radius = i % 2 ? 7 : 17;
    return `${(20 + radius * Math.cos(angle)).toFixed(2)},${(20 + radius * Math.sin(angle)).toFixed(2)}`;
  }).join(' ')}"/>`,
  // trois feuilles
  '<ellipse cx="20" cy="12" rx="4" ry="9"/><ellipse cx="20" cy="12" rx="4" ry="9" transform="rotate(120 20 20)"/><ellipse cx="20" cy="12" rx="4" ry="9" transform="rotate(240 20 20)"/><circle cx="20" cy="20" r="3"/>',
];

const ornament = (index: number): HTMLElement => {
  const root = el('span', 'cover-ornament');
  root.innerHTML = `<svg viewBox="0 0 40 40" fill="currentColor" aria-hidden="true">${ORNAMENTS[index]}</svg>`;
  return root;
};

/** Livre ancien, devant : titre doré, encadrement, fleuron, usure. */
const front = (design: CoverDesign): HTMLElement => {
  const root = el('span', 'cover-art');
  const title = el('span', 'cover-title');
  for (const word of design.title) title.append(el('span', undefined, word));
  if (design.frame > 0) root.append(el('span', `cover-frame frame-${design.frame}`));
  root.append(title, ornament(design.ornament), createWear(design));
  return root;
};

/** Livre ancien, derrière : un filet et la cote. */
const back = (design: CoverDesign): HTMLElement => {
  const root = el('span', 'cover-art');
  root.append(el('span', 'cover-frame frame-1'), createWear(design), el('span', 'cover-mark', shelfMarkText(design)));
  return root;
};

/** Habille les plats extérieurs : couverture de devant et de derrière, ancienne ou moderne. */
export const dressCovers = (outside: { front: HTMLElement; back: HTMLElement }, design: CoverDesign): void => {
  outside.front.replaceChildren(design.modern ? modernFront(design) : front(design));
  outside.back.replaceChildren(design.modern ? modernBack(design) : back(design));
};
