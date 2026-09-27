import './coverArt.css';
import { el } from '../dom';
import { toRoman, type CoverDesign } from '../../systems/coverDesign';

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

/** Usure : coins frottés et quelques éraflures, plus ou moins marqués selon l'âge du livre. */
const wear = (design: CoverDesign): HTMLElement => {
  const root = el('span', 'cover-wear');
  const scuffs = design.scuffs.map(
    ({ x, y, size }) =>
      `radial-gradient(ellipse ${(size * 100).toFixed(0)}% ${(size * 60).toFixed(0)}% at ${(x * 100).toFixed(0)}% ${(y * 100).toFixed(0)}%, rgba(190, 160, 120, 0.3), transparent)`,
  );
  const corners = ['0% 0%', '100% 0%', '0% 100%', '100% 100%'].map(
    (at) => `radial-gradient(circle at ${at}, rgba(185, 150, 105, 0.75), rgba(185, 150, 105, 0.25) 7%, transparent 16%)`,
  );
  root.style.backgroundImage = [...scuffs, ...corners].join(', ');
  root.style.opacity = design.wear.toFixed(2);
  return root;
};

const art = (design: CoverDesign): HTMLElement => el('span', design.modern ? 'cover-art modern' : 'cover-art');

const front = (design: CoverDesign): HTMLElement => {
  const root = art(design);
  const title = el('span', 'cover-title');
  for (const word of design.title) title.append(el('span', undefined, word));
  if (design.modern) {
    // Livre moderne : un bandeau et un titre en caractères bâton, sans dorure.
    const band = el('span', 'cover-band');
    band.append(title);
    root.append(band);
    return root;
  }
  if (design.frame > 0) root.append(el('span', `cover-frame frame-${design.frame}`));
  root.append(title, ornament(design.ornament), wear(design));
  return root;
};

const back = (design: CoverDesign): HTMLElement => {
  const root = art(design);
  const { wall, shelf, volume } = design.shelfMark;
  const mark = el('span', 'cover-mark', `${toRoman(wall)} · ${toRoman(shelf)} · ${toRoman(volume)}`);
  if (!design.modern) root.append(el('span', 'cover-frame frame-1'), wear(design));
  root.append(mark);
  return root;
};

/** Habille les plats extérieurs : couverture de devant (titre, fleuron) et de derrière (cote). */
export const dressCovers = (outside: { front: HTMLElement; back: HTMLElement }, design: CoverDesign): void => {
  outside.front.replaceChildren(front(design));
  outside.back.replaceChildren(back(design));
};
