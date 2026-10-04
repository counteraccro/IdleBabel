import { el } from '../dom';

const range = (count: number, part: (index: number) => string): string => Array.from({ length: count }, (_, index) => part(index)).join('');

/** Une feuille de laurier sur le cercle de rayon 15, à l'angle `angle`, penchée de `lean` degrés. */
const laurel = (angle: number, lean: number): string => {
  const [x, y] = [(20 + 15 * Math.cos(angle)).toFixed(2), (20 + 15 * Math.sin(angle)).toFixed(2)];
  return `<ellipse cx="${x}" cy="${y}" rx="1.8" ry="4.2" transform="rotate(${((angle * 180) / Math.PI + lean).toFixed(1)} ${x} ${y})"/>`;
};

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
  // fleur de lys
  '<path d="M20 3 C24.5 9 24.5 16 20 22 C15.5 16 15.5 9 20 3Z"/><path d="M18.5 22 C11 22.5 5 18 7 11 C9 15 13 16.5 18 18Z"/><path d="M21.5 22 C29 22.5 35 18 33 11 C31 15 27 16.5 22 18Z"/><rect x="11.5" y="22.5" width="17" height="3" rx="1"/><path d="M17.5 26 L22.5 26 L23 33 L20 37.5 L17 33Z"/>',
  // l'hexagone de la Bibliothèque
  `<polygon fill="none" stroke="currentColor" stroke-width="1.6" points="${range(6, (i) => `${(20 + 17 * Math.cos((i * Math.PI) / 3 + Math.PI / 6)).toFixed(2)},${(20 + 17 * Math.sin((i * Math.PI) / 3 + Math.PI / 6)).toFixed(2)} `)}"/>` +
    `<polygon points="${range(6, (i) => `${(20 + 8 * Math.cos((i * Math.PI) / 3 + Math.PI / 6)).toFixed(2)},${(20 + 8 * Math.sin((i * Math.PI) / 3 + Math.PI / 6)).toFixed(2)} `)}"/>` +
    range(
      6,
      (i) =>
        `<circle cx="${(20 + 12.5 * Math.cos((i * Math.PI) / 3)).toFixed(2)}" cy="${(20 + 12.5 * Math.sin((i * Math.PI) / 3)).toFixed(2)}" r="1.3"/>`,
    ),
  // couronne de laurier
  range(7, (i) => laurel(Math.PI * (0.62 + i * 0.13), 60)) +
    range(7, (i) => laurel(Math.PI * (0.38 - i * 0.13), -60)) +
    '<circle cx="20" cy="20" r="3.4"/><circle cx="20" cy="9" r="1.5"/>',
  // soleil
  '<circle cx="20" cy="20" r="6.5"/>' +
    range(12, (i) => {
      const angle = (i * Math.PI) / 6;
      const tip = i % 2 ? 14 : 18;
      const point = (radius: number, at: number): string =>
        `${(20 + radius * Math.cos(at)).toFixed(2)},${(20 + radius * Math.sin(at)).toFixed(2)}`;
      return `<polygon points="${point(8, angle - 0.16)} ${point(tip, angle)} ${point(8, angle + 0.16)}"/>`;
    }),
];

/** Fers d'angle (maquette .ai/maquette-livres-ordinaires.html) : le coin en (0, 0), tournés vers le milieu du plat. */
const CORNERS = [
  // quart de rosace
  '<path d="M2 2 L24 2 A22 22 0 0 1 2 24 Z" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 2 L13 2 A11 11 0 0 1 2 13 Z"/>' +
    range(5, (i) => {
      const angle = (Math.PI / 2) * ((i + 0.5) / 5);
      return `<circle cx="${(2 + 28 * Math.cos(angle)).toFixed(2)}" cy="${(2 + 28 * Math.sin(angle)).toFixed(2)}" r="1.4"/>`;
    }),
  // trois feuilles en éventail
  range(3, (i) => `<ellipse cx="15" cy="2" rx="11" ry="3.2" transform="rotate(${15 + i * 30} 2 2)"/>`) +
    '<circle cx="3" cy="3" r="3"/><circle cx="30" cy="30" r="1.6"/>',
  // fleuron pointé vers le milieu
  '<path d="M2 2 L17 9 L28 28 L9 17 Z"/><path d="M8 8 L14 11 L19 19 L11 14Z" fill="#000" fill-opacity="0.35"/><circle cx="33" cy="33" r="2"/><circle cx="20" cy="4" r="1.3"/><circle cx="4" cy="20" r="1.3"/>',
  // équerre
  '<path d="M2 2 H28 M2 2 V28" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M8 8 H21 M8 8 V21" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="14" cy="14" r="2.6"/><circle cx="30" cy="2" r="1.5"/><circle cx="2" cy="30" r="1.5"/>',
];

/** Un fer d'angle, en SVG dessiné en `currentColor`. */
export const cornerOrnament = (index: number): HTMLElement => {
  const root = el('span', 'cover-ornament');
  root.innerHTML = `<svg viewBox="0 0 40 40" fill="currentColor" aria-hidden="true">${CORNERS[index]}</svg>`;
  return root;
};

/** Un fleuron, en SVG dessiné en `currentColor` (la couverture 3D le peint en or : leatherCover.ts). */
export const ornament = (index: number): HTMLElement => {
  const root = el('span', 'cover-ornament');
  root.innerHTML = `<svg viewBox="0 0 40 40" fill="currentColor" aria-hidden="true">${ORNAMENTS[index]}</svg>`;
  return root;
};
