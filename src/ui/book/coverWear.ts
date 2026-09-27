import { el } from '../dom';
import type { CoverDesign } from '../../systems/coverDesign';

let wearId = 0;

/**
 * Usure du cuir (SVG, repère 100 × 125 : la proportion d'un plat) : un grain fin sur tout le plat ;
 * avec l'âge, des plaques frottées aux contours irréguliers (bruit procédural), surtout sur les bords
 * et les coins, et quelques éraflures. Tout est tiré de la couverture : même livre, même usure.
 */
export const createWear = (design: CoverDesign, { strength = 1, grain = true } = {}): HTMLElement => {
  const id = `wear-${wearId++}`;
  const seed = Math.round(design.scuffs[0].x * 997 + design.scuffs[0].y * 389);
  const scratches = design.scuffs
    .map(({ x, y, size }, index) => {
      const angle = (x * 5 + y * 3 + index) % Math.PI;
      const length = 6 + size * 40;
      const x1 = x * 100;
      const y1 = y * 125;
      const x2 = x1 + Math.cos(angle) * length;
      const y2 = y1 + Math.sin(angle) * length;
      const bend = (size - 0.18) * 20;
      return `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} q${((x2 - x1) / 2 + bend).toFixed(1)} ${((y2 - y1) / 2 - bend).toFixed(1)} ${(x2 - x1).toFixed(1)} ${(y2 - y1).toFixed(1)}"/>`;
    })
    .join('');
  const patches = design.scuffs
    .map(({ x, y, size }) => `<ellipse cx="${(x * 100).toFixed(1)}" cy="${(y * 125).toFixed(1)}" rx="${(size * 30).toFixed(1)}" ry="${(size * 20).toFixed(1)}"/>`)
    .join('');
  const root = el('span', 'cover-wear');
  root.innerHTML = `<svg viewBox="0 0 100 125" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <filter id="${id}-grain" x="0" y="0" width="1" height="1">
      <feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="${seed}"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 -0.2"/>
    </filter>
    <filter id="${id}-rub" x="0" y="0" width="1" height="1">
      <feTurbulence type="fractalNoise" baseFrequency="0.22 0.28" numOctaves="4" seed="${seed + 1}"/>
      <feColorMatrix values="0 0 0 0 0.45  0 0 0 0 0.34  0 0 0 0 0.25  0 0 0 2.2 -0.85"/>
    </filter>
    <filter id="${id}-soft"><feGaussianBlur stdDeviation="3"/></filter>
    <mask id="${id}-where">
      <g fill="none" stroke="#fff" filter="url(#${id}-soft)">
        <rect x="0" y="0" width="100" height="125" stroke-width="7"/>
      </g>
      <g fill="#fff" filter="url(#${id}-soft)">
        <circle cx="0" cy="0" r="12"/><circle cx="100" cy="0" r="12"/><circle cx="0" cy="125" r="12"/><circle cx="100" cy="125" r="12"/>
      </g>
      <g fill="#fff" fill-opacity="0.35" filter="url(#${id}-soft)">${patches}</g>
    </mask>
  </defs>
  ${grain ? `<rect width="100" height="125" filter="url(#${id}-grain)"/>` : ''}
  <g opacity="${(design.wear * 0.85 * strength).toFixed(2)}">
    <rect width="100" height="125" filter="url(#${id}-rub)" mask="url(#${id}-where)"/>
    <g fill="none" stroke="rgb(170, 140, 105)" stroke-opacity="0.5" stroke-width="0.3" stroke-linecap="round">${scratches}</g>
  </g>
</svg>`;
  return root;
};
