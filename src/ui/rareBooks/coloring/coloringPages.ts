import { messages } from '../../../i18n';
import { COLORING_DRAWINGS, type ColoringDrawingId } from '../../../data/coloring';
import { GARA, LINE, RAINBOW, ROUND, W, fit, folio, paperGrain, pencil, roundLetters, scattered, text } from './coloringDraw';
import { coloringDrawing } from './coloringDrawings';
import { paintDrawing } from './coloringShapes';
import type { GameState } from '../../../core/state';

/**
 * Les pages de « Colorie la Bibliothèque » (maquette .ai/maquette-coloriage.html, « Dedans ») : une page de garde,
 * « Ce cahier appartient à : » et la page de titre, puis un dessin par double page (à gauche, sa boîte de crayons et
 * la gomme ; à droite, le dessin et ses couleurs), puis le papier blanc jusqu'au bout du cahier.
 */

export const OWNER_PAGE = 2;
export const TITLE_PAGE = 3;
/** La boîte de crayons du premier dessin (page de gauche) ; son dessin est en face. */
export const FIRST_DRAWING_PAGE = 4;
/** La gomme, à la place d'une couleur. */
export const ERASER = 'eraser';

const texts = () => messages().rareBooks.coloring;

/** Le dessin de la double page où est `page`, s'il y en a un. */
export const drawingOf = (page: number): ColoringDrawingId | undefined =>
  page >= FIRST_DRAWING_PAGE ? COLORING_DRAWINGS[Math.floor((page - FIRST_DRAWING_PAGE) / 2)]?.id : undefined;

/** Le crayon sorti de la boîte de chaque dessin (le premier, au début) : pas gardé dans la partie. */
const chosen = new Map<ColoringDrawingId, string>();

export const chosenPencil = (id: ColoringDrawingId): string =>
  chosen.get(id) ?? COLORING_DRAWINGS.find((drawing) => drawing.id === id)!.palette[0];

export const choosePencil = (id: ColoringDrawingId, color: string): void => void chosen.set(id, color);

interface Hit {
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Les crayons de la boîte et leur place ; le crayon choisi sort de 70. */
const pencils = (palette: readonly string[], selected: string) => {
  const [count, width, gap, top] = [palette.length, 50, 12, 400];
  const total = count * width + (count - 1) * gap;
  const left = (W - total) / 2 - 22;
  return {
    total,
    left,
    top,
    hits: palette.map((color, i): Hit => {
      const lift = selected === color ? 70 : 0;
      return { color, x: left + 22 + i * (width + gap), y: top - 20 - lift, w: width, h: 300 + lift };
    }),
  };
};

/** La gomme, posée sous la boîte ; elle se soulève un peu, choisie. */
const eraser = (selected: string): Hit => ({ color: ERASER, x: W / 2 - 110, y: 716 - (selected === ERASER ? 14 : 0), w: 120, h: 60 });

/** Le crayon (ou la gomme) sous (x, y) sur la page de la boîte du dessin `id`. */
export const pencilAt = (id: ColoringDrawingId, x: number, y: number): string | undefined => {
  const drawing = COLORING_DRAWINGS.find((entry) => entry.id === id)!;
  const selected = chosenPencil(id);
  return [...pencils(drawing.palette, selected).hits, eraser(selected)].find(
    (hit) => x >= hit.x && x <= hit.x + hit.w && y >= hit.y && y <= hit.y + hit.h,
  )?.color;
};

const paintBox = (context: CanvasRenderingContext2D, index: number): void => {
  const { id, palette } = COLORING_DRAWINGS[index];
  const book = texts();
  const selected = chosenPencil(id);
  paperGrain(context, 12 + index);
  // Le numéro dans sa pastille, le nom du dessin.
  context.fillStyle = '#d8492f';
  context.beginPath();
  context.arc(W / 2, 128, 40, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = LINE;
  context.lineWidth = 4;
  context.stroke();
  text(context, String(index + 1), W / 2, 146, `700 50px ${ROUND}`, '#fff8e8');
  const name = book.names[index];
  text(context, name, W / 2, 238, `600 ${fit(context, name, (px) => `600 ${px}px ${ROUND}`, 46, W - 110)}px ${ROUND}`, LINE);
  text(
    context,
    book.howTo,
    W / 2,
    290,
    `italic ${fit(context, book.howTo, (px) => `italic ${px}px ${GARA}`, 26, W - 110)}px ${GARA}`,
    '#6a5a44',
  );
  // La boîte : le fond, les crayons (le choisi sorti), le devant.
  const { total, left, top, hits } = pencils(palette, selected);
  context.fillStyle = '#b8322a';
  context.fillRect(left - 6, top + 40, total + 56, 240);
  for (const hit of hits) pencil(context, hit.x, hit.y, hit.w, 300, hit.color);
  const front = context.createLinearGradient(0, top + 150, 0, top + 300);
  front.addColorStop(0, '#e2483a');
  front.addColorStop(1, '#b8322a');
  context.fillStyle = front;
  context.beginPath();
  context.moveTo(left - 14, top + 150);
  context.lineTo(left + total + 58, top + 150);
  context.lineTo(left + total + 50, top + 300);
  context.lineTo(left - 6, top + 300);
  context.closePath();
  context.fill();
  context.strokeStyle = LINE;
  context.lineWidth = 3;
  context.stroke();
  context.fillStyle = '#f4c430';
  context.fillRect(left - 2, top + 196, total + 52, 54);
  const label = book.box.replace('{n}', String(palette.length));
  const size = fit(context, label, (px) => `700 ${px}px ${ROUND}`, 26, total + 30);
  text(context, label, left + (total + 50) / 2, top + 233, `700 ${size}px ${ROUND}`, '#b8322a', 'center', 1.5);
  // La gomme, posée à côté.
  const rubber = eraser(selected);
  context.save();
  context.translate(rubber.x + 60, rubber.y + 24);
  context.rotate(-0.06);
  context.fillStyle = '#f2b8c0';
  context.fillRect(-60, -24, 76, 48);
  context.fillStyle = '#5a7ac8';
  context.fillRect(16, -24, 44, 48);
  context.strokeStyle = LINE;
  context.lineWidth = 3;
  context.strokeRect(-60, -24, 120, 48);
  context.restore();
  text(context, book.eraser, rubber.x + 140, rubber.y + 32, `italic 26px ${GARA}`, '#6a5a44', 'left');
};

const paintOwner = (context: CanvasRenderingContext2D): void => {
  paperGrain(context, 5);
  text(
    context,
    texts().owner,
    W / 2,
    330,
    `500 ${fit(context, texts().owner, (px) => `500 ${px}px ${ROUND}`, 38, W - 120)}px ${ROUND}`,
    LINE,
  );
  context.strokeStyle = '#8a7a60';
  context.lineWidth = 2;
  context.setLineDash([3, 7]);
  context.beginPath();
  context.moveTo(120, 430);
  context.lineTo(W - 120, 430);
  context.stroke();
  context.setLineDash([]);
  scattered(context, [
    [220, 620, -1.3, '#d8492f'],
    [420, 640, 1.2, '#4f9fd8'],
  ]);
};

const paintTitle = (context: CanvasRenderingContext2D): void => {
  const book = texts();
  paperGrain(context, 6);
  roundLetters(context, book.big, W / 2, 300, 86, RAINBOW, W - 80);
  text(context, book.small, W / 2, 368, `600 46px ${ROUND}`, LINE);
  text(context, book.subtitle, W / 2, 450, `italic 30px ${GARA}`, '#6a5a44');
  text(context, book.publisher, W / 2, 700, `600 20px ${ROUND}`, '#8a7a60', 'center', 4);
};

/** Dessine la page `page` (le papier est déjà posé) ; les dessins prennent les couleurs de la partie. */
export const paintColoringPage = (context: CanvasRenderingContext2D, page: number, state: GameState): void => {
  if (page === OWNER_PAGE) return paintOwner(context);
  if (page === TITLE_PAGE) return paintTitle(context);
  const id = drawingOf(page);
  if (!id) return paperGrain(context, 30 + (page % 7));
  const index = COLORING_DRAWINGS.findIndex((drawing) => drawing.id === id);
  if (page % 2 === 0) paintBox(context, index);
  else {
    paperGrain(context, 22 + index);
    paintDrawing(context, coloringDrawing(id), state.coloring[id] ?? {});
  }
  folio(context, page, page % 2 === 0);
};
