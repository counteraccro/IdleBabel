import { PAGE_TEXTURE } from '../../book/pageLayout';
import { LETTERS } from '../../../systems/babelText';
import { FELL, FELL_SC, rng, type Context } from './sandDraw';
import { PLATES, type Plate } from './sandPlates';

/**
 * Les pages du Livre de sable (maquette .ai/maquette-sable-pages.html) : un livre saint imprimé à bon marché,
 * papier jauni et piqué, deux colonnes de versets numérotés en rouge, du charabia de Babel. Aucune page ne
 * dit où l'on est : pas de titre, la première commence au milieu d'un mot, les numéros n'ont aucune suite.
 * Chaque fois qu'une page est dessinée, elle est tirée à nouveau : on ne retrouve jamais une page.
 */

const { width: W, height: H } = PAGE_TEXTURE;
type Rgb = readonly [number, number, number];
const INK: Rgb = [34, 26, 20];
const RED: Rgb = [140, 48, 34];
const SAND = ['#d8b878', '#c7a060', '#b88c52', '#e3c88e'];

/** Le numéro que tout livre de Babel a pour dernière page ; ici, un tirage sur dix. */
export const LAST_FOLIO = '410';
const LAST_FOLIO_CHANCE = 1 / 10;
/** Une page sur cent environ porte une gravure. */
const PLATE_CHANCE = 1 / 100;

const M = { head: 62, body: 104, bottom: 748, inner: 74, outer: 54, gap: 26, line: 21, size: 17.5 };
const BODY = `${M.size}px ${FELL}`;
const VERSE = `${M.size * 0.62}px ${FELL}`;

/** Un mot de Babel : 1 à 9 lettres, parfois suivi d'une virgule ou d'un point. */
const word = (random: () => number): string => {
  let s = '';
  const n = 1 + Math.floor(random() * random() * 9) + Math.floor(random() * 2);
  for (let i = 0; i < n; i++) s += LETTERS[Math.floor(random() * LETTERS.length)];
  const p = random();
  return p < 0.06 ? `${s},` : p < 0.09 ? `${s}.` : s;
};

/** Un folio : de 1 à 12 chiffres, groupés par trois ; jamais 410 par hasard. */
const folio = (random: () => number): string => {
  const digits = 1 + Math.floor(random() * 12);
  let n = String(1 + Math.floor(random() * 9));
  for (let i = 1; i < digits; i++) n += Math.floor(random() * 10);
  if (n === LAST_FOLIO) n = '411';
  return n.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

/** Papier bon marché : jauni, plus foncé sur les bords, piqué de rousseurs ; un peu de sable dans le pli. */
const paper = (context: Context, random: () => number, spineOnLeft: boolean): void => {
  context.fillStyle = '#e9dcbc';
  context.fillRect(0, 0, W, H);
  const edge = context.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 560);
  edge.addColorStop(0, 'rgba(160,120,60,0)');
  edge.addColorStop(1, 'rgba(150,105,45,0.32)');
  context.fillStyle = edge;
  context.fillRect(0, 0, W, H);
  for (let i = 0; i < 2600; i++) {
    context.fillStyle = `rgba(110,80,40,${0.03 + random() * 0.05})`;
    context.fillRect(random() * W, random() * H, 1, 1);
  }
  for (let i = 0; i < 18; i++) {
    const [x, y, s] = [random() * W, random() * H, 2 + random() * 7];
    const g = context.createRadialGradient(x, y, 0, x, y, s);
    g.addColorStop(0, 'rgba(150,95,40,0.28)');
    g.addColorStop(1, 'rgba(150,95,40,0)');
    context.fillStyle = g;
    context.fillRect(x - s, y - s, s * 2, s * 2);
  }
  // Le pli : ombre, et le sable qui s'y est glissé.
  const fold = context.createLinearGradient(spineOnLeft ? 0 : W, 0, spineOnLeft ? 70 : W - 70, 0);
  fold.addColorStop(0, 'rgba(80,55,25,0.38)');
  fold.addColorStop(1, 'rgba(80,55,25,0)');
  context.fillStyle = fold;
  context.fillRect(spineOnLeft ? 0 : W - 70, 0, 70, H);
  for (let i = 0; i < 140; i++) {
    const [d, y, s] = [Math.pow(random(), 2.2) * 26, H - Math.pow(random(), 1.6) * H * 0.75, 1.4 + random() * 1.8];
    const x = spineOnLeft ? 3 + d : W - 3 - d - s;
    context.fillStyle = 'rgba(60,40,15,0.35)';
    context.fillRect(x + 0.7, y + 0.7, s, s);
    context.fillStyle = SAND[Math.floor(random() * SAND.length)];
    context.fillRect(x, y, s, s);
  }
};

/** Impression à bon marché : chaque mot un peu plus ou moins encré. */
export const printed = (
  context: Context,
  value: string,
  x: number,
  y: number,
  font: string,
  random: () => number,
  color: Rgb = INK,
  align: CanvasTextAlign = 'left',
  base = 0.86,
): void => {
  context.save();
  context.font = font;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${base - random() * 0.22})`;
  context.fillText(value, x, y);
  context.restore();
};

interface Piece {
  text: string;
  w: number;
  verse?: boolean;
}

/**
 * Une colonne de versets, de `y0` à `y1` ; `cut` : elle commence au milieu d'un mot (sans numéro de verset).
 * `skip` : une bande laissée vide (la gravure). Rend le numéro du verset suivant.
 */
const column = (
  context: Context,
  x: number,
  w: number,
  y0: number,
  y1: number,
  random: () => number,
  verse: number,
  cut: boolean,
  skip: [number, number] | null,
): number => {
  context.font = BODY;
  const space = context.measureText(' ').width;
  let [y, line, lineW, first] = [y0, [] as Piece[], 0, true];
  const flush = (justify: boolean): void => {
    if (!line.length) return;
    let cx = x;
    const extra = justify && line.length > 1 ? (w - lineW) / (line.length - 1) : space;
    for (const piece of line) {
      if (piece.verse) printed(context, piece.text, cx, y - 1, VERSE, random, RED, 'left', 0.9);
      else printed(context, piece.text, cx, y, BODY, random);
      cx += piece.w + extra;
    }
    [line, lineW] = [[], 0];
    y += M.line;
    while (skip && y > skip[0] && y - M.line < skip[1]) y += M.line;
  };
  while (y < y1) {
    // Un verset : son numéro, puis 12 à 60 mots.
    const n = 12 + Math.floor(random() * 48);
    const pieces: Piece[] = [];
    if (!(first && cut)) {
      const v = String(verse++);
      context.font = VERSE;
      pieces.push({ text: v, w: context.measureText(v).width, verse: true });
    }
    for (let i = 0; i < n; i++) {
      const t = word(random);
      context.font = BODY;
      pieces.push({ text: t, w: context.measureText(t).width });
    }
    first = false;
    for (const piece of pieces) {
      const add = (line.length ? space : 0) + piece.w;
      if (lineW + add > w) {
        flush(true);
        if (y >= y1) break;
      }
      lineW += (line.length ? space : 0) + piece.w;
      line.push(piece);
    }
    if (y < y1) flush(false);
  }
  return verse;
};

/** Ce qu'on a tiré pour une page (les tests et le sceau le lisent). */
export interface SandPage {
  folio: string;
  plate: Plate | null;
}

/** Tire une page : son folio (410 une fois sur dix), une gravure parfois. */
export const drawLots = (random: () => number): SandPage => ({
  folio: random() < LAST_FOLIO_CHANCE ? LAST_FOLIO : folio(random),
  plate: random() < PLATE_CHANCE ? PLATES[Math.floor(random() * PLATES.length)] : null,
});

/**
 * Dessine une page tirée au hasard ; `first` : la première page du livre, qui commence au milieu d'un mot.
 * Rend ce qui a été tiré.
 */
export const paintSandPage = (context: Context, spineOnLeft: boolean, first: boolean, seed: number): SandPage => {
  const random = rng(seed);
  const lots = drawLots(random);
  paper(context, random, spineOnLeft);
  const [left, right] = [spineOnLeft ? M.inner : M.outer, W - (spineOnLeft ? M.outer : M.inner)];
  // Le folio côté tranche, le titre courant au milieu, un filet double.
  printed(context, lots.folio, spineOnLeft ? right : left, M.head, `20px ${FELL}`, random, INK, spineOnLeft ? 'right' : 'left', 0.92);
  const head = [word(random), word(random)].map((w) => w.replace(/[.,]/, '')).join(' ');
  printed(context, head.toUpperCase(), (left + right) / 2, M.head, `15px ${FELL_SC}`, random, INK, 'center', 0.8);
  context.fillStyle = 'rgba(34,26,20,0.75)';
  context.fillRect(left, M.head + 12, right - left, 1.2);
  context.fillRect(left, M.head + 15, right - left, 0.6);
  // Deux colonnes, un filet entre elles ; la gravure, s'il y en a une, en travers des deux.
  const cw = (right - left - M.gap) / 2;
  context.fillStyle = 'rgba(34,26,20,0.45)';
  context.fillRect(left + cw + M.gap / 2, M.body - 14, 0.8, M.bottom - M.body + 4);
  const plateBox = { y: 300, h: 210 };
  // Sous la gravure, sa légende « fig. » a sa ligne (dans la maquette, le texte la chevauchait).
  const skip: [number, number] | null = lots.plate ? [plateBox.y - 8, plateBox.y + plateBox.h + 32] : null;
  const verse = column(context, left, cw, M.body, M.bottom, random, 1 + Math.floor(random() * 60), first, skip);
  column(context, left + cw + M.gap, cw, M.body, M.bottom, random, verse, false, skip);
  lots.plate?.(context, left, right, plateBox.y, plateBox.h, random);
  return lots;
};
