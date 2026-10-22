import { getLocale } from '../../../i18n';
import { coverDesign, rareCover } from '../../../systems/coverDesign';
import { coverFront } from '../../book3d/coverFront';
import { idle } from '../slowDrawing';
import { C, HAND, INK, POP, SANS, SERIF, shorten, text } from './albumDraw';
import type { GameState } from '../../../core/state';

/**
 * Les autocollants de l'album : la couverture d'un livre lu, dessinée par le jeu (coverFront.ts, ou celle du livre rare),
 * réduite et gardée. Les pages se peignent tout de suite ; une image pas encore prête est demandée, dessinée dans un moment
 * libre du navigateur, et la page la montre quand elle se redessine (le livre ouvert est « live », rareBookArt.ts).
 */

/**
 * Taille d'un autocollant sur la page (repère 640 × 800), et de son image gardée : un peu plus fine que la page (l'autocollant
 * ne fait jamais plus d'une centaine de pixels à l'écran).
 */
export const STICKER_W = 118;
export const STICKER_H = 147.5;
const IMAGE_W = Math.round(1.25 * STICKER_W);
const IMAGE_H = Math.round(1.25 * STICKER_H);
/**
 * Images gardées (~110 Ko chacune, 13 Mo en tout) : la double page ouverte et ses voisines, que le livre peint à l'avance
 * (jusqu'à 28 cases par double page). Moins, elles se chasseraient l'une l'autre à chaque fois que la page se redessine.
 */
const KEEP = 120;
/** Demandes en attente : au-delà, les plus anciennes (des pages tournées depuis) sont oubliées. */
const WAITING = 60;

/** Les images prêtes (null : le dessin a échoué), des plus anciennes aux plus récentes. */
const images = new Map<string, HTMLCanvasElement | null>();
const waiting: { key: string; draw: () => Promise<CanvasImageSource> }[] = [];
let working = false;

const shrink = (source: CanvasImageSource): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = IMAGE_W;
  canvas.height = IMAGE_H;
  canvas.getContext('2d')!.drawImage(source, 0, 0, IMAGE_W, IMAGE_H);
  return canvas;
};

/** Dessine les images demandées, dans l'ordre (la page ouverte est peinte avant ses voisines), une par moment libre. */
const work = async (): Promise<void> => {
  if (working) return;
  working = true;
  while (waiting.length) {
    const { key, draw } = waiting.shift()!;
    if (images.has(key)) continue;
    await idle();
    let image: HTMLCanvasElement | null = null;
    try {
      image = shrink(await draw());
    } catch {
      image = null;
    }
    images.set(key, image);
    while (images.size > KEEP) images.delete(images.keys().next().value!);
  }
  working = false;
};

const request = (key: string, draw: () => Promise<CanvasImageSource>): HTMLCanvasElement | null | undefined => {
  const image = images.get(key);
  if (image !== undefined) {
    // Revue : elle redevient la plus récente.
    images.delete(key);
    images.set(key, image);
    return image;
  }
  if (!waiting.some((entry) => entry.key === key)) {
    waiting.push({ key, draw });
    if (waiting.length > WAITING) waiting.shift();
    void work();
  }
  return undefined;
};

/**
 * L'image de l'autocollant du livre n° `book` (`rare` : le livre rare trouvé là) ; undefined : pas encore prête (demandée),
 * null : impossible à dessiner. Les titres dépendent de la langue (les mots qui ont un sens) : une image par langue.
 */
export const stickerImage = (state: GameState, book: number, rare?: string): HTMLCanvasElement | null | undefined => {
  const key = `${state.seed}:${getLocale()}:${rare ?? book}`;
  if (!rare) return request(key, () => coverFront(book));
  return request(key, async () => {
    // arts.ts range aussi l'album : chargé ici seulement, pour ne pas tourner en rond.
    const { rareBookArt } = await import('../arts');
    const look = await rareBookArt(rare).look(state, rareCover(coverDesign(book), rare));
    return look.cover.image as CanvasImageSource;
  });
};

/** Une case de l'album, prête à dessiner. */
export interface Cell {
  /** Le numéro écrit en grand dans la case vide. */
  number: number;
  /** Sous la case : « 12 · Bordeaux » (`numbered`), ou le nom seul (« Mes livres »). */
  name: string;
  numbered: boolean;
  /** Le livre d'où vient l'autocollant ; rien : la case est vide. */
  book?: number;
  doubles: number;
  /** Un livre rare : l'autocollant brillant. */
  rare?: string;
  /** Sous une case vide, en petit : ce qu'elle attend (les introuvables). */
  hint?: string;
  /** Sous un autocollant : « livre n° 1 204 · 37 doubles » ; rien dans « Mes livres ». */
  from?: string;
}

/** Un petit hasard tiré d'un nombre (la pente d'un autocollant). */
const tilt = (seed: number): number => {
  const a = Math.imul(seed ^ 0x9e3779b9, 2654435761) >>> 0;
  return (a / 4294967296 - 0.5) * 0.06;
};

/** Une case vide : le numéro en grand, la place de l'autocollant en creux. */
const emptySlot = (context: CanvasRenderingContext2D, x: number, y: number, number: number): void => {
  context.beginPath();
  context.roundRect(x, y, STICKER_W, STICKER_H, 6);
  context.fillStyle = 'rgba(80,60,30,0.07)';
  context.fill();
  context.setLineDash([5, 4]);
  context.strokeStyle = 'rgba(80,60,30,0.35)';
  context.lineWidth = 1.5;
  context.stroke();
  context.setLineDash([]);
  const label = String(number);
  text(context, label, x + STICKER_W / 2, y + STICKER_H / 2 + 16, `${label.length > 3 ? 38 : 46}px ${POP}`, 'rgba(80,60,30,0.22)');
};

/**
 * Un autocollant collé : bord blanc, coins ronds, un peu de travers, un reflet ; irisé pour un livre rare. Sans image (pas
 * encore dessinée) : le bord blanc sur un fond gris, le temps qu'elle arrive.
 */
export const sticker = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  number: number,
  image: CanvasImageSource | null | undefined,
  shiny: boolean,
  seed: number,
): void => {
  context.save();
  context.translate(x + STICKER_W / 2, y + STICKER_H / 2);
  context.rotate(tilt(seed));
  context.translate(-STICKER_W / 2, -STICKER_H / 2);
  context.shadowColor = 'rgba(40,25,10,0.35)';
  context.shadowBlur = 6;
  context.shadowOffsetY = 2;
  context.beginPath();
  context.roundRect(0, 0, STICKER_W, STICKER_H, 6);
  context.fillStyle = '#fff';
  context.fill();
  context.shadowColor = 'transparent';
  context.save();
  context.beginPath();
  context.roundRect(5, 5, STICKER_W - 10, STICKER_H - 10, 3);
  context.clip();
  if (image) context.drawImage(image, 5, 5, STICKER_W - 10, STICKER_H - 10);
  else {
    context.fillStyle = '#e4e0d8';
    context.fillRect(0, 0, STICKER_W, STICKER_H);
  }
  if (shiny) {
    // Le brillant : des couleurs irisées en biais, et des bandes de lumière.
    context.globalCompositeOperation = 'overlay';
    const foil = context.createLinearGradient(0, 0, STICKER_W, STICKER_H);
    ['#ff6ad5', '#ffe56a', '#6affc1', '#6ac8ff', '#c46aff', '#ff6ad5'].forEach((color, i, all) =>
      foil.addColorStop(i / (all.length - 1), color),
    );
    context.fillStyle = foil;
    context.globalAlpha = 0.75;
    context.fillRect(0, 0, STICKER_W, STICKER_H);
    context.globalCompositeOperation = 'screen';
    context.globalAlpha = 0.25;
    context.fillStyle = '#fff';
    for (let i = -3; i < 10; i += 2) {
      context.beginPath();
      context.moveTo(i * 22, 0);
      context.lineTo(i * 22 + 12, 0);
      context.lineTo(i * 22 - 28, STICKER_H);
      context.lineTo(i * 22 - 40, STICKER_H);
      context.fill();
    }
  }
  context.globalCompositeOperation = 'source-over';
  context.globalAlpha = 1;
  const gloss = context.createLinearGradient(0, 0, STICKER_W * 0.7, STICKER_H * 0.5);
  gloss.addColorStop(0, 'rgba(255,255,255,0.35)');
  gloss.addColorStop(0.45, 'rgba(255,255,255,0)');
  context.fillStyle = gloss;
  context.fillRect(0, 0, STICKER_W, STICKER_H);
  context.restore();
  // Le numéro de l'autocollant, dans le bord blanc.
  text(context, String(number), STICKER_W - 9, STICKER_H - 0.5, `9px ${SANS}`, '#888', 'right');
  context.restore();
};

const label = (context: CanvasRenderingContext2D, x: number, y: number, cell: Cell): void => {
  context.font = `bold 11.5px ${SANS}`;
  const line = cell.numbered ? `${cell.number} · ${cell.name}` : cell.name;
  text(context, shorten(context, line, STICKER_W + 16), x + STICKER_W / 2, y + STICKER_H + 17, `bold 11.5px ${SANS}`, INK);
  if (cell.book !== undefined && cell.from) text(context, cell.from, x + STICKER_W / 2, y + STICKER_H + 33, `600 15px ${HAND}`, '#7a6248');
  else if (cell.book === undefined && cell.hint) {
    context.font = `italic 11px ${SERIF}`;
    text(context, shorten(context, cell.hint, STICKER_W + 18), x + STICKER_W / 2, y + STICKER_H + 31, `italic 11px ${SERIF}`, '#7a6248');
  }
};

/** Hauteur d'une rangée de cases, légende comprise. */
export const ROW_H = STICKER_H + 42;

/**
 * Une grille de cases, 4 colonnes, centrée en hauteur entre `top` et `bottom` ; les images manquantes sont demandées. Trop de
 * rangées pour la place (les seize mots qui ont un sens) : toute la grille est réduite.
 */
export const grid = (context: CanvasRenderingContext2D, state: GameState, cells: Cell[], top: number, bottom: number): void => {
  const columns = 4;
  const gap = 22;
  const rows = Math.ceil(cells.length / columns);
  const scale = Math.min(1, (bottom - top) / (rows * ROW_H));
  context.save();
  context.translate(C, top);
  context.scale(scale, scale);
  context.translate(-C, -top);
  const y0 = top + Math.max(0, ((bottom - top) / scale - rows * ROW_H) / 2);
  cells.forEach((cell, i) => {
    const row = Math.floor(i / columns);
    const inRow = Math.min(columns, cells.length - row * columns);
    const x = C - (inRow * STICKER_W + (inRow - 1) * gap) / 2 + (i % columns) * (STICKER_W + gap);
    const y = y0 + row * ROW_H;
    if (cell.book === undefined) emptySlot(context, x, y, cell.number);
    else
      sticker(context, x, y, cell.number, stickerImage(state, cell.book, cell.rare), cell.rare !== undefined, cell.number * 97 + cell.book);
    label(context, x, y, cell);
  });
  context.restore();
};
