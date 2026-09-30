import { PAGE_TEXTURE } from './pageLayout';
import { cssBaseline, preparePageTexture, type Paper } from './pageRender';
import { shelfMarkText, type CoverDesign } from '../../systems/coverDesign';
import { coverTitle, hasMeaningfulTitle } from '../../systems/coverTitle';

/**
 * Page de titre : la première page de droite d'un livre. Une seule mise en page (repère de la
 * texture, 640 × 800) sert à la page HTML et à la feuille qui tourne, pour qu'elles soient identiques.
 */
type Item =
  | {
      kind: 'text';
      text: string;
      y: number;
      size: number;
      family: string;
      italic?: boolean;
      bold?: boolean;
      spacing: number;
      color: string;
    }
  | { kind: 'rule'; y: number; width: number; thickness: number; color: string }
  | { kind: 'lozenge'; y: number; size: number; color: string }
  | { kind: 'mark'; y: number; size: number; color: string };

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Helvetica Neue', Arial, sans-serif";
const OLD_INK = 'rgba(52, 36, 22, 0.88)';
const MODERN_INK = '#1d1d1b';

const oldLayout = (design: CoverDesign): Item[] => {
  const items: Item[] = [];
  let y = 220;
  for (const word of coverTitle(design)) {
    items.push({ kind: 'text', text: word.toUpperCase(), y, size: 36, family: SERIF, spacing: 6, color: OLD_INK });
    y += 52;
  }
  items.push({ kind: 'rule', y: y + 12, width: 140, thickness: 1.5, color: OLD_INK });
  const subtitle = design.blurb.split(' ').slice(0, 6);
  items.push({
    kind: 'text',
    text: subtitle.slice(0, 3).join(' '),
    y: y + 42,
    size: 20,
    family: SERIF,
    italic: true,
    spacing: 0,
    color: OLD_INK,
  });
  items.push({
    kind: 'text',
    text: subtitle.slice(3).join(' '),
    y: y + 70,
    size: 20,
    family: SERIF,
    italic: true,
    spacing: 0,
    color: OLD_INK,
  });
  items.push({ kind: 'lozenge', y: 530, size: 22, color: OLD_INK });
  items.push({ kind: 'text', text: shelfMarkText(design), y: 690, size: 16, family: SERIF, spacing: 4, color: OLD_INK });
  return items;
};

const modernLayout = (design: CoverDesign): Item[] => {
  const items: Item[] = [];
  items.push({ kind: 'text', text: design.author.join(' ').toUpperCase(), y: 190, size: 17, family: SANS, spacing: 3, color: MODERN_INK });
  let y = 240;
  const meaningful = hasMeaningfulTitle(design);
  for (const word of coverTitle(design)) {
    items.push({
      kind: 'text',
      text: meaningful ? word : word.charAt(0).toUpperCase() + word.slice(1),
      y,
      size: 42,
      family: SANS,
      bold: true,
      spacing: 0,
      color: MODERN_INK,
    });
    y += 48;
  }
  items.push({ kind: 'rule', y: y + 18, width: 60, thickness: 4, color: MODERN_INK });
  items.push({ kind: 'mark', y: 680, size: 26, color: MODERN_INK });
  return items;
};

const layout = (design: CoverDesign): Item[] => (design.modern ? modernLayout(design) : oldLayout(design));

/** Police CSS ou canevas d'un texte, à la taille donnée. */
const font = (item: Extract<Item, { kind: 'text' }>, size: string): string =>
  `${item.italic ? 'italic ' : ''}${item.bold ? '800 ' : ''}${size} ${item.family}`;

export const drawTitlePageTexture = (canvas: HTMLCanvasElement, design: CoverDesign, paper: Paper): void => {
  const context = preparePageTexture(canvas, true, paper);
  const center = PAGE_TEXTURE.width / 2;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  for (const item of layout(design)) {
    context.fillStyle = item.color;
    context.strokeStyle = item.color;
    if (item.kind === 'text') {
      context.font = font(item, `${item.size}px`);
      context.letterSpacing = `${item.spacing}px`;
      // Le raccourci `font` de la page HTML remet line-height à normal.
      context.fillText(item.text, center, cssBaseline(context, item.y));
    } else if (item.kind === 'rule') {
      context.fillRect(center - item.width / 2, item.y, item.width, item.thickness);
    } else if (item.kind === 'lozenge') {
      const half = item.size / 2;
      context.beginPath();
      context.moveTo(center, item.y - half);
      context.lineTo(center + half * 0.7, item.y);
      context.lineTo(center, item.y + half);
      context.lineTo(center - half * 0.7, item.y);
      context.closePath();
      context.lineWidth = 1.5;
      context.stroke();
      context.fillRect(center - 2, item.y - 2, 4, 4);
    } else {
      context.lineWidth = 3;
      context.beginPath();
      context.arc(center, item.y, item.size / 2 - 1.5, 0, Math.PI * 2);
      context.stroke();
      context.beginPath();
      context.arc(center, item.y, item.size / 5, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.letterSpacing = '0px';
};
