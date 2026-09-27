import './coverModern.css';
import { el } from '../dom';
import { createWear } from './coverWear';
import { coverTitle, hasMeaningfulTitle } from '../../systems/coverTitle';
import { shelfMarkText, type CoverDesign } from '../../systems/coverDesign';

/**
 * Livre moderne (voir coverModern.css) : couverture d'éditeur, lisse et brillante, peu usée.
 * Trois mises en page : visuel géométrique, composition typographique, bandeau.
 */
const LAYOUTS = ['modern-geometric', 'modern-swiss', 'modern-band'];

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/** Marque d'éditeur générique : un cercle et un point, sans nom. */
const publisherMark = (): HTMLElement => {
  const mark = el('span', 'modern-publisher');
  mark.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8.5" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="10" r="3.2" fill="currentColor"/></svg>';
  return mark;
};

const surface = (design: CoverDesign, className: string): HTMLElement => {
  const root = el('span', `cover-art modern ${className}`);
  root.append(el('span', 'modern-gloss'), createWear(design, { strength: 0.3, grain: false }));
  return root;
};

export const modernFront = (design: CoverDesign): HTMLElement => {
  const root = surface(design, LAYOUTS[design.layout]);
  const title = el('span', 'modern-title');
  // Un vrai titre garde sa casse ; les mots de Babel prennent une majuscule.
  const casing = hasMeaningfulTitle(design) ? (line: string) => line : capitalize;
  for (const word of coverTitle(design)) title.append(el('span', undefined, casing(word)));
  const author = el('span', 'modern-author', design.author.map(capitalize).join(' '));
  root.prepend(el('span', 'modern-graphic'));
  root.append(author, title, publisherMark());
  return root;
};

/** Dos : résumé, code-barres, et l'étiquette de la Bibliothèque avec la cote. */
export const modernBack = (design: CoverDesign): HTMLElement => {
  const root = surface(design, 'modern-back');
  const barcode = el('span', 'modern-barcode');
  const bars = [...design.barcode]
    .flatMap((digit, index) => {
      const width = 0.6 + (Number(digit) % 4) * 0.45;
      return [`<rect x="${(index * 7.6).toFixed(1)}" width="${width.toFixed(2)}" height="30"/>`, `<rect x="${(index * 7.6 + 3.2).toFixed(1)}" width="${(2.6 - width / 2).toFixed(2)}" height="30"/>`];
    })
    .join('');
  barcode.innerHTML = `<svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>`;
  barcode.append(el('span', undefined, design.barcode.replace(/^(\d)(\d{6})(\d{6})$/, '$1 $2 $3')));
  root.append(el('span', 'modern-blurb', design.blurb), barcode, el('span', 'modern-sticker', shelfMarkText(design)));
  return root;
};
