import { messages } from '../../i18n';
import { PAGE_TEXTURE } from '../book/pageLayout';
import { PAGE_CENTER, wrap, write } from './draw';
import { INK, MODERN, MONO } from './alexHCover';

/**
 * Après l'épilogue, comme les pages « Notes » de certains livres : des pages laissées au lecteur pour
 * ouvrir sa propre PR du livre. La première est un formulaire, les suivantes sont lignées et numérotées
 * comme un éditeur de code.
 */

const { width: WIDTH, height: HEIGHT } = PAGE_TEXTURE;
const LEFT = 70;
const RIGHT = WIDTH - 62;
const RULE = 'rgba(0, 0, 0, 0.18)';
const NUMBER = 'rgba(0, 0, 0, 0.3)';
/** Les lignes à écrire : leur écart, la première, la dernière. */
const STEP = 30;
const FIRST = 90;
const LAST = HEIGHT - 80;

/** Une case à cocher, vide, puis son libellé. */
const checkbox = (context: CanvasRenderingContext2D, label: string, x: number, y: number): void => {
  context.strokeStyle = INK;
  context.lineWidth = 1.5;
  context.strokeRect(x, y + 2, 16, 16);
  write(context, label, x + 26, y, { font: `16px ${MODERN}`, color: INK, align: 'left' });
};

/** Le formulaire : le titre, quelques mots, les champs à remplir (une ligne chacun), le verdict à cocher. */
export const reviewFormPage = (context: CanvasRenderingContext2D): void => {
  const { title, intro, fields, verdict, choices } = messages().rareBooks.alexH.review;
  write(context, title.toUpperCase(), PAGE_CENTER, 100, { font: `900 26px ${MODERN}`, color: INK, spacing: 4 });
  context.font = `italic 18px Georgia, serif`;
  wrap(context, intro, WIDTH - 160).forEach((line, index) =>
    write(context, line, PAGE_CENTER, 160 + index * 27, { font: context.font, color: '#444444' }),
  );
  fields.forEach((field, index) => {
    const y = 300 + index * 70;
    write(context, field, LEFT, y, { font: `500 16px ${MODERN}`, color: INK, align: 'left' });
    context.fillStyle = RULE;
    context.fillRect(LEFT, y + 46, RIGHT - LEFT, 1.5);
  });
  write(context, verdict, LEFT, 600, { font: `500 16px ${MODERN}`, color: INK, align: 'left' });
  choices.forEach((choice, index) => checkbox(context, choice, LEFT + 10, 636 + index * 34));
};

/** Une page lignée, chaque ligne numérotée dans la marge ; `first` : le numéro de sa première ligne. */
export const reviewLinesPage = (context: CanvasRenderingContext2D, first: number): void => {
  let number = first;
  for (let y = FIRST; y <= LAST; y += STEP, number++) {
    write(context, String(number), LEFT - 12, y - 16, { font: `11px ${MONO}`, color: NUMBER, align: 'right' });
    context.fillStyle = RULE;
    context.fillRect(LEFT, y, RIGHT - LEFT, 1.5);
  }
};

/** Le nombre de lignes d'une page lignée. */
export const REVIEW_LINES = Math.floor((LAST - FIRST) / STEP) + 1;
