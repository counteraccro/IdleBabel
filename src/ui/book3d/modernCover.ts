import { createWear } from '../book/coverWear';
import { shelfMarkText, type CoverDesign } from '../../systems/coverDesign';
import { coverTitle, hasMeaningfulTitle } from '../../systems/coverTitle';
import { CQW, HEIGHT, WIDTH, canvas, type LeatherCover } from './leatherCover';
import { canvasTexture, svgImage } from './textures';
import type { Binding } from '../book/bindings';
import { MODERN_PAPER } from '../book/pageRender';
import {
  autobiographyBack,
  autobiographyFront,
  autobiographyInside,
  autobiographySpine,
  loadAutobiographyFonts,
} from './ordinary/autobiography';
import { comicBack, comicFront, comicInside, comicSpine, loadComicFonts } from './ordinary/comic';
import { libraryStamp } from './ordinary/endpapers';
import { MH, MW, SPINE_W, mockupCanvas, rng } from './ordinary/mockup';
import { babelWord, gloss as mockupGloss } from './ordinary/modernDraw';
import { spineWear } from './ordinary/ordinarySpine';
import type { CoverDetails } from '../../systems/coverDetails';

/** Encre claire des aplats, et encre sombre (sur le bandeau clair, les carrés). */
const LIGHT = '#f6f3ec';
const DARK = '#1d1d1b';
const SANS = `'Helvetica Neue', Arial, sans-serif`;

const capitalize = (word: string): string => word.charAt(0).toUpperCase() + word.slice(1);

/** Toile unie de la couleur de la reliure, et son usure légère (une couverture pelliculée s'use peu). */
const cloth = async (context: CanvasRenderingContext2D, design: CoverDesign, binding: Binding): Promise<void> => {
  context.fillStyle = binding.leather;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  const svg = createWear(design, { strength: 0.3, grain: false }).querySelector('svg')!;
  context.drawImage(await svgImage(svg, WIDTH, HEIGHT), 0, 0, WIDTH, HEIGHT);
};

/** Vernis : un reflet en biais, comme sur une couverture pelliculée. */
const gloss = (context: CanvasRenderingContext2D): void => {
  // 125° en CSS : du haut à gauche vers le bas à droite.
  const angle = ((125 - 90) * Math.PI) / 180;
  const half = (Math.abs(WIDTH * Math.cos(angle)) + Math.abs(HEIGHT * Math.sin(angle))) / 2;
  const [dx, dy] = [Math.cos(angle) * half, Math.sin(angle) * half];
  const shine = context.createLinearGradient(WIDTH / 2 - dx, HEIGHT / 2 - dy, WIDTH / 2 + dx, HEIGHT / 2 + dy);
  shine.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  shine.addColorStop(0.32, 'rgba(255, 255, 255, 0)');
  shine.addColorStop(0.68, 'rgba(255, 255, 255, 0)');
  shine.addColorStop(1, 'rgba(255, 255, 255, 0.08)');
  context.fillStyle = shine;
  context.fillRect(0, 0, WIDTH, HEIGHT);
};

/** Texte en caractères bâton, en haut à gauche au point (x, y) (en cqw), réduit s'il est trop large. */
const text = (
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  style: { size: number; weight: number; color: string; spacing?: number; room?: number },
): void => {
  context.save();
  context.font = `${style.weight} ${style.size * CQW}px ${SANS}`;
  context.letterSpacing = `${(style.spacing ?? 0) * style.size * CQW}px`;
  context.fillStyle = style.color;
  context.textBaseline = 'top';
  const room = (style.room ?? 100 - 2 * x) * CQW;
  const width = context.measureText(value).width;
  context.translate(x * CQW, y * CQW);
  if (width > room) context.scale(room / width, 1);
  context.fillText(value, 0, 0);
  context.restore();
};

/** Titre : un mot par ligne, serré, très gras. */
const title = (context: CanvasRenderingContext2D, design: CoverDesign, top: number, size: number, color: string): void => {
  // Un vrai titre garde sa casse ; les mots de Babel prennent une majuscule.
  const casing = hasMeaningfulTitle(design) ? (line: string) => line : capitalize;
  coverTitle(design).forEach((word, index) => {
    text(context, casing(word), 8, top + index * size * 0.95, { size, weight: 800, color, spacing: -0.02 });
  });
};

const author = (context: CanvasRenderingContext2D, design: CoverDesign, top: number, color: string): void =>
  text(context, design.author.map(capitalize).join(' ').toUpperCase(), 8, top, { size: 4.2, weight: 500, color, spacing: 0.14 });

/** Marque d'éditeur générique : un cercle et un point, sans nom (6 cqw de côté, coin haut gauche en cqw). */
const publisher = (context: CanvasRenderingContext2D, x: number, y: number, color: string): void => {
  const unit = (6 * CQW) / 20;
  const [cx, cy] = [(x + 3) * CQW, (y + 3) * CQW];
  context.save();
  context.globalAlpha = 0.9;
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 1.6 * unit;
  context.beginPath();
  context.arc(cx, cy, 8.5 * unit, 0, 2 * Math.PI);
  context.stroke();
  context.beginPath();
  context.arc(cx, cy, 3.2 * unit, 0, 2 * Math.PI);
  context.fill();
  context.restore();
};

const rect = (context: CanvasRenderingContext2D, color: string, x: number, y: number, width: number, height: number): void => {
  context.fillStyle = color;
  context.fillRect(x * CQW, y * CQW, width * CQW, height * CQW);
};

/** Les trois mises en page d'éditeur. */
const LAYOUTS: ((context: CanvasRenderingContext2D, design: CoverDesign) => void)[] = [
  // Visuel géométrique : titre en haut, grand disque qui déborde en bas à droite, son ombre décalée.
  (context, design) => {
    context.fillStyle = 'rgba(20, 20, 20, 0.35)';
    context.beginPath();
    context.arc((85 - 14) * CQW, (97 + 20) * CQW, 37 * CQW, 0, 2 * Math.PI);
    context.fill();
    context.fillStyle = 'rgba(246, 243, 236, 0.92)';
    context.beginPath();
    context.arc(85 * CQW, 97 * CQW, 45 * CQW, 0, 2 * Math.PI);
    context.fill();
    author(context, design, 9, LIGHT);
    title(context, design, 17, 12, LIGHT);
    publisher(context, 86, 9, LIGHT);
  },
  // Composition typographique : auteur en haut, grand titre, filet épais, trois carrés.
  (context, design) => {
    rect(context, LIGHT, 8, 62, 84, 1.6);
    rect(context, DARK, 8, 68.6, 84 * 0.2, 11);
    rect(context, 'rgba(246, 243, 236, 0.9)', 8 + 84 * 0.26, 68.6, 84 * 0.2, 11);
    author(context, design, 9, LIGHT);
    title(context, design, 18, 13, LIGHT);
    publisher(context, 86, 9, LIGHT);
  },
  // Bandeau clair au tiers haut, titre sombre dedans, rayures fines au-dessus.
  (context, design) => {
    rect(context, '#f4efe4', 0, 22, 100, 42);
    rect(context, '#f4efe4', 6.6, 18.6, 86.8, 1.4);
    rect(context, '#f4efe4', 11, 15, 78, 1);
    author(context, design, 26, DARK);
    title(context, design, 34, 11, DARK);
    publisher(context, 8, 125 - 12, LIGHT);
  },
];

/** Coupe un texte en lignes de la largeur `room` (en pixels), au plus `max` lignes. */
const wrap = (context: CanvasRenderingContext2D, value: string, room: number, max: number): string[] => {
  const lines: string[] = [];
  let line = '';
  for (const word of value.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width <= room || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
    if (lines.length === max) return lines;
  }
  if (line) lines.push(line);
  return lines.slice(0, max);
};

/** Dos : résumé, code-barres, et l'étiquette de la Bibliothèque avec la cote. */
const back = (context: CanvasRenderingContext2D, design: CoverDesign): void => {
  context.save();
  context.font = `${3.4 * CQW}px ${SANS}`;
  context.fillStyle = LIGHT;
  context.globalAlpha = 0.9;
  context.textBaseline = 'top';
  wrap(context, design.blurb, 80 * CQW, 9).forEach((line, index) => context.fillText(line, 10 * CQW, (12 + index * 3.4 * 1.45) * CQW));
  context.restore();

  // Code-barres : étiquette blanche en bas à droite, barres puis chiffres.
  const [x, width] = [58, 34];
  const [barsTop, barsHeight] = [125 - 8 - 1 - 2.6 * 1.3 - 11, 11];
  rect(context, '#fff', x, barsTop - 2, width, barsHeight + 2 + 2.6 * 1.3 + 1);
  const scale = (width - 5) / 100;
  context.fillStyle = '#111';
  [...design.barcode].forEach((digit, index) => {
    const bar = 0.6 + (Number(digit) % 4) * 0.45;
    rect(context, '#111', x + 2.5 + index * 7.6 * scale, barsTop, bar * scale, barsHeight);
    rect(context, '#111', x + 2.5 + (index * 7.6 + 3.2) * scale, barsTop, (2.6 - bar / 2) * scale, barsHeight);
  });
  context.save();
  context.font = `${2.6 * CQW}px ${SANS}`;
  context.letterSpacing = `${0.08 * 2.6 * CQW}px`;
  context.textAlign = 'center';
  context.textBaseline = 'top';
  context.fillStyle = '#111';
  context.fillText(design.barcode.replace(/^(\d)(\d{6})(\d{6})$/, '$1 $2 $3'), (x + width / 2) * CQW, (barsTop + barsHeight + 0.3) * CQW);
  context.restore();

  // Étiquette de la Bibliothèque, collée de travers.
  context.save();
  context.font = `${3.6 * CQW}px Georgia, 'Times New Roman', serif`;
  context.letterSpacing = `${0.12 * 3.6 * CQW}px`;
  const label = shelfMarkText(design);
  const [labelWidth, labelHeight] = [context.measureText(label).width + 6 * CQW, 3.6 * 1.2 * CQW + 3.2 * CQW];
  context.translate(8 * CQW + labelWidth / 2, (125 - 10) * CQW - labelHeight / 2);
  context.rotate((-3 * Math.PI) / 180);
  context.shadowColor = 'rgba(0, 0, 0, 0.25)';
  context.shadowBlur = 0.8 * CQW;
  context.shadowOffsetY = 0.4 * CQW;
  context.fillStyle = '#f3efe2';
  context.beginPath();
  context.roundRect(-labelWidth / 2, -labelHeight / 2, labelWidth, labelHeight, 1.2 * CQW);
  context.fill();
  context.shadowColor = 'transparent';
  context.lineWidth = 0.5 * CQW;
  context.strokeStyle = '#b8a47a';
  context.stroke();
  context.fillStyle = '#3a2a18';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, 0, 0);
  context.restore();
};

/**
 * Plats d'un livre moderne en texture, pour le livre 3D : couverture
 * d'éditeur lisse et brillante, peu usée, dans l'une des trois mises en page ; au dos, résumé,
 * code-barres et cote. Le dos et l'intérieur : la toile unie.
 */
export const modernCover = async (design: CoverDesign, binding: Binding): Promise<LeatherCover> => {
  const details = design.details;
  if (details && details.kind !== 'none') return modernKind(design, details);
  const [front, frontContext] = canvas();
  await cloth(frontContext, design, binding);
  LAYOUTS[design.layout % LAYOUTS.length](frontContext, design);
  if (details?.band) band(frontContext, details);
  gloss(frontContext);

  const [backCanvas, backContext] = canvas();
  await cloth(backContext, design, binding);
  back(backContext, design);
  gloss(backContext);

  const [plain, plainContext] = canvas();
  await cloth(plainContext, design, binding);
  if (!details) return { front: canvasTexture(front), back: canvasTexture(backCanvas), plain: canvasTexture(plain) };

  return {
    front: canvasTexture(front),
    back: canvasTexture(backCanvas),
    plain: canvasTexture(plain),
    spine: canvasTexture(await modernSpine(design, binding)),
    inside: canvasTexture(whiteEndpaper(design)),
  };
};

/** Bandeau d'éditeur : une bande de papier rouge autour du bas du livre, un mot de Babel en grand. */
const band = (context: CanvasRenderingContext2D, details: CoverDetails): void => {
  const random = rng(details.seed + 23);
  context.save();
  context.shadowColor = 'rgba(0, 0, 0, 0.35)';
  context.shadowBlur = 1.2 * CQW;
  context.shadowOffsetY = -0.3 * CQW;
  context.fillStyle = '#c9221d';
  context.fillRect(0, 101 * CQW, WIDTH, HEIGHT - 101 * CQW);
  context.restore();
  text(context, babelWord(random).toUpperCase(), 8, 104.5, { size: 8.5, weight: 800, color: '#fff', spacing: 0.02 });
  text(context, `${babelWord(random)} ${babelWord(random)} ${babelWord(random)}`, 8, 115.5, {
    size: 3.4,
    weight: 500,
    color: '#fff',
    spacing: 0.06,
  });
};

/** Dos d'une couverture d'éditeur (maquette : 134 × 800) : le titre et l'auteur en long, la marque au pied. */
const modernSpine = async (design: CoverDesign, binding: Binding): Promise<HTMLCanvasElement> => {
  const [node, context] = mockupCanvas(SPINE_W, MH);
  context.fillStyle = binding.leather;
  context.fillRect(0, 0, SPINE_W, MH);
  await spineWear(context, design, 0.3, false);
  context.save();
  context.translate(SPINE_W / 2, 40);
  context.rotate(Math.PI / 2);
  context.fillStyle = LIGHT;
  context.textBaseline = 'middle';
  context.font = `800 40px ${SANS}`;
  const casing = hasMeaningfulTitle(design) ? (word: string) => word : capitalize;
  const title = coverTitle(design).map(casing).join(' ');
  const width = context.measureText(title).width;
  context.save();
  if (width > 470) context.scale(470 / width, 1);
  context.fillText(title, 0, 0);
  context.restore();
  context.font = `500 22px ${SANS}`;
  context.letterSpacing = '3px';
  context.fillText(design.author.join(' ').toUpperCase(), 500, 0);
  context.restore();
  context.strokeStyle = LIGHT;
  context.fillStyle = LIGHT;
  context.lineWidth = 4;
  context.beginPath();
  context.arc(SPINE_W / 2, MH - 50, 20, 0, 2 * Math.PI);
  context.stroke();
  context.beginPath();
  context.arc(SPINE_W / 2, MH - 50, 7.5, 0, 2 * Math.PI);
  context.fill();
  mockupGloss(context, SPINE_W, MH);
  return node;
};

/** Garde blanche d'un livre moderne, et le tampon de la Bibliothèque. */
const whiteEndpaper = (design: CoverDesign): HTMLCanvasElement => {
  const [node, context] = mockupCanvas(MW, MH);
  const paper = context.createLinearGradient(0, 0, 0, MH);
  paper.addColorStop(0, MODERN_PAPER[0]);
  paper.addColorStop(1, MODERN_PAPER[2]);
  context.fillStyle = paper;
  context.fillRect(0, 0, MW, MH);
  libraryStamp(context, design, MW * 0.68, MH * 0.2);
  return node;
};

/** Une autobiographie ou une bande dessinée : tout est dessiné d'après la maquette. */
const modernKind = async (design: CoverDesign, details: CoverDetails): Promise<LeatherCover> => {
  const comic = details.kind === 'comic';
  await (comic ? loadComicFonts() : loadAutobiographyFonts());
  const [front, back, spine, inside] = comic
    ? [comicFront(design, details), comicBack(design, details), comicSpine(design, details), comicInside(details)]
    : [autobiographyFront(design, details), autobiographyBack(design, details), autobiographySpine(design), autobiographyInside(details)];
  // Le cuir des chants : la garde de l'album (ses couleurs), un plat sans rien de plus.
  return {
    front: canvasTexture(front),
    back: canvasTexture(back),
    plain: canvasTexture(inside),
    spine: canvasTexture(spine),
    inside: canvasTexture(inside),
  };
};
