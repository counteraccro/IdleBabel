import { getLocale, t } from '../../i18n';
import { CARD_CELLS } from '../../systems/stamps';
import { SERIF_FONT, folio, heading, type Item } from '../strangeBook/pageItems';
import { PENCIL, PENCIL_FADED, dateStamp, handText, seeded, stampDate } from './taskDrawing';
import { pencilNumber } from './taskPages';
import type { GameState } from '../../core/state';

/**
 * La carte de lecteur (maquette validée .ai/maquette-guichet.html, ses mesures reprises) : un bristol de bibliothèque
 * glissé dans le livre blanc, partie V. Un tampon dateur violet par tâche faite, ce qu'elle a rapporté au crayon à côté ;
 * en bas, ce qu'il reste à dépenser. Une carte pleine est rangée : seul son numéro reste.
 */

const CARD_WIDTH = 500;
const CARD_HEIGHT = 520;
const COLUMNS = 4;
const ROWS = CARD_CELLS / COLUMNS;
const GRID_X = 24;
const GRID_Y = 104;
const CELL_HEIGHT = 60;
/** L'encre imprimée de la carte, brun-rouge. */
const CARD_INK = '#6b3b2a';

/** Un texte imprimé sur la carte, calé par le haut. */
const printed = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  style: { align?: CanvasTextAlign; italic?: boolean; spacing?: number } = {},
): void => {
  context.font = `${style.italic ? 'italic ' : ''}${size}px ${SERIF_FONT}`;
  context.letterSpacing = `${style.spacing ?? 0}px`;
  context.fillStyle = CARD_INK;
  context.textAlign = style.align ?? 'left';
  context.textBaseline = 'top';
  context.fillText(text, x, y);
};

/** Ce qu'il reste à dépenser, au crayon (les chiffres à la main restent des chiffres, même en notation de Babel). */
const leftText = (balance: number): string =>
  balance === 0
    ? t('whiteBook.tasks.card.leftNone')
    : balance === 1
      ? t('whiteBook.tasks.card.leftOne')
      : t('whiteBook.tasks.card.left').replace('{n}', pencilNumber(balance, true));

const drawCard = (context: CanvasRenderingContext2D, state: GameState): void => {
  const { card, cells, balance } = state.tasks.stamps;
  const random = seeded(41 + card);
  context.save();
  context.translate(320, 430);
  context.rotate(-0.018);
  // Le bristol : un peu saumon, coins arrondis, légèrement de travers.
  context.shadowColor = 'rgba(60,40,10,0.35)';
  context.shadowBlur = 12;
  context.shadowOffsetY = 5;
  const paper = context.createLinearGradient(0, -CARD_HEIGHT / 2, 0, CARD_HEIGHT / 2);
  paper.addColorStop(0, '#f2dfc6');
  paper.addColorStop(1, '#e5ccae');
  context.fillStyle = paper;
  context.beginPath();
  context.roundRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT, 10);
  context.fill();
  context.shadowColor = 'transparent';
  context.translate(-CARD_WIDTH / 2, -CARD_HEIGHT / 2);
  printed(context, t('whiteBook.tasks.card.library'), CARD_WIDTH / 2, 18, 13, { align: 'center', spacing: 5 });
  printed(context, t('whiteBook.tasks.card.name'), CARD_WIDTH / 2, 36, 22, { align: 'center', italic: true });
  printed(context, t('whiteBook.tasks.card.number'), 30, 72, 14);
  handText(context, String(card), 56, 64, { size: 26 });
  printed(context, t('whiteBook.tasks.card.hexagon'), CARD_WIDTH - 170, 72, 14);
  handText(context, '—', CARD_WIDTH - 90, 64, { size: 26, color: PENCIL_FADED });
  // Les cases imprimées : 4 × 6.
  const cellWidth = (CARD_WIDTH - 2 * GRID_X) / COLUMNS;
  context.strokeStyle = 'rgba(107,59,42,0.45)';
  context.lineWidth = 1;
  for (let i = 0; i <= COLUMNS; i++) {
    context.beginPath();
    context.moveTo(GRID_X + i * cellWidth, GRID_Y);
    context.lineTo(GRID_X + i * cellWidth, GRID_Y + ROWS * CELL_HEIGHT);
    context.stroke();
  }
  for (let j = 0; j <= ROWS; j++) {
    context.beginPath();
    context.moveTo(GRID_X, GRID_Y + j * CELL_HEIGHT);
    context.lineTo(CARD_WIDTH - GRID_X, GRID_Y + j * CELL_HEIGHT);
    context.stroke();
  }
  const locale = getLocale();
  cells.forEach((cell, index) => {
    const x = GRID_X + (index % COLUMNS) * cellWidth + cellWidth / 2 - 12;
    const y = GRID_Y + Math.floor(index / COLUMNS) * CELL_HEIGHT + CELL_HEIGHT / 2;
    dateStamp(context, x, y, stampDate(cell.at, locale), (random() - 0.5) * 0.3, 0.72, card * 100 + index);
    handText(context, `+${cell.n}`, x + 46, y - 6, { size: 20 });
  });
  handText(context, leftText(balance), CARD_WIDTH / 2, CARD_HEIGHT - 50, { size: 30, align: 'center', color: PENCIL });
  context.restore();
};

/** La page de la carte de lecteur (à gauche, chapitre V). */
export const readerCardItems = (state: GameState, number: number): Item[] => {
  const { card, cells, balance } = state.tasks.stamps;
  const key = JSON.stringify([getLocale(), card, cells.length, cells.at(-1)?.at, balance]);
  return [
    ...heading(t('whiteBook.tasks.card.title'), 5),
    { kind: 'drawing', key, draw: (context) => drawCard(context, state) },
    folio(number),
  ];
};
