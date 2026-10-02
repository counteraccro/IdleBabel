import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/caveat/400.css';
import { messages } from '../../../i18n';
import { babelDigits } from '../../../core/format';
import { babelTextWidth, drawBabelText } from '../../babelDigits';
import { CQW, HAND, HEIGHT, SANS, WIDTH, board, wrap, write } from '../draw';
import type * as THREE from 'three';

/** Bleu ardoise de la toile, le titre crème, la feuille, l'encre de la plume. */
export const SLATE = '#3b4a52';
export const SLATE_EDGE = '#232d33';
const CREAM = '#f2ecdf';
const SHEET = '#f7f3ea';
const PEN_INK = '#2b2b45';
const BLOT = '#20203a';
/** Le romain des essais sérieux. */
export const GARAMOND = "'Cormorant Garamond', Georgia, serif";

/** Les polices de la couverture et des pages : chargées avant de les dessiner. */
export const loadBlankPageFonts = (): Promise<unknown> =>
  Promise.all([`600 40px ${GARAMOND}`, `italic 40px ${GARAMOND}`, `40px ${HAND}`].map((font) => document.fonts.load(font)));

/** Une tache d'encre et deux éclaboussures, centrée en (x, y), de rayon `size`. */
const blot = (context: CanvasRenderingContext2D, x: number, y: number, size: number): void => {
  context.fillStyle = BLOT;
  context.beginPath();
  context.ellipse(x, y, size, size * 0.73, 0.4, 0, Math.PI * 2);
  context.fill();
  const splashes: [number, number, number][] = [
    [1.36, -0.8, 0.23],
    [-1, 1, 0.14],
  ];
  for (const [dx, dy, radius] of splashes) {
    context.beginPath();
    context.arc(x + dx * size, y + dy * size, radius * size, 0, Math.PI * 2);
    context.fill();
  }
};

/** La feuille posée de travers au milieu du plat : un premier mot raturé, une tache d'encre. */
const sheet = (context: CanvasRenderingContext2D): void => {
  const [width, height] = [59 * CQW, 78 * CQW];
  context.save();
  context.translate(WIDTH / 2, 66 * CQW);
  context.rotate(-0.05);
  context.shadowColor = 'rgba(0, 0, 0, 0.45)';
  context.shadowBlur = 3 * CQW;
  context.shadowOffsetY = 1.2 * CQW;
  context.fillStyle = SHEET;
  context.fillRect(-width / 2, -height / 2, width, height);
  context.restore();

  context.save();
  context.translate(WIDTH / 2, 66 * CQW);
  context.rotate(-0.05);
  const struck = messages().rareBooks.blankPage.struck;
  const font = `${5.3 * CQW}px ${HAND}`;
  const [left, top] = [-19 * CQW, -31 * CQW];
  write(context, struck, left, top, { font, color: PEN_INK, align: 'left' });
  context.font = font;
  const strokeWidth = context.measureText(struck).width;
  context.strokeStyle = PEN_INK;
  context.lineWidth = 0.45 * CQW;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(left - 0.6 * CQW, top + 3.4 * CQW);
  context.lineTo(left + strokeWidth + 0.6 * CQW, top + 3 * CQW);
  context.stroke();
  blot(context, 17 * CQW, 23 * CQW, 3.4 * CQW);
  context.restore();
};

/** La couverture : l'auteur et le titre en haut, la feuille blanche au milieu, le sous-titre en bas. */
export const blankPageFront = (): THREE.CanvasTexture =>
  board(SLATE, SLATE_EDGE, (context) => {
    const { author, title, subtitle } = messages().rareBooks.blankPage;
    write(context, author.toUpperCase(), WIDTH / 2, 4 * CQW, { font: `${3.4 * CQW}px ${GARAMOND}`, color: '#d8cdb5', spacing: 0.6 * CQW });
    write(context, title, WIDTH / 2, 9.5 * CQW, { font: `600 ${8.4 * CQW}px ${GARAMOND}`, color: CREAM, spacing: 0.5 * CQW });
    sheet(context);
    write(context, subtitle, WIDTH / 2, 111 * CQW, { font: `italic ${5.3 * CQW}px ${GARAMOND}`, color: '#d8cdb5' });
  });

/** Un code-barres d'éditeur, en bas à gauche du plat arrière : des barres tirées de l'ISBN, l'ISBN dessous. */
const barcode = (context: CanvasRenderingContext2D, left: number, top: number, isbn: string): void => {
  const [width, height] = [26 * CQW, 13 * CQW];
  context.fillStyle = '#f7f3ea';
  context.fillRect(left, top, width, height);
  context.fillStyle = '#1b1a17';
  const digits = isbn.replace(/\D/g, '');
  let x = left + 2 * CQW;
  for (let bar = 0; x < left + width - 2.5 * CQW; bar++) {
    const thickness = (1 + (Number(digits[bar % digits.length]) % 3)) * 0.18 * CQW;
    context.fillRect(x, top + 1.5 * CQW, thickness, height - 5.5 * CQW);
    x += thickness + (bar % 2 ? 0.45 : 0.25) * CQW;
  }
  write(context, isbn, left + width / 2, top + height - 3.6 * CQW, { font: `${1.9 * CQW}px ${SANS}`, color: '#1b1a17' });
};

/** Le prix imprimé, en chiffres de Babel (les mêmes que la notation du compteur). */
const PRICE = '410';

/** Le prix, aligné à droite sur `right` : le libellé, puis le montant en chiffres de Babel. */
const price = (context: CanvasRenderingContext2D, label: string, right: number, top: number): void => {
  const size = 3 * CQW;
  const amount = babelDigits(PRICE);
  context.font = `${size}px ${GARAMOND}`;
  context.fillStyle = '#d8cdb5';
  const text = `${label} ${amount}`;
  drawBabelText(context, text, right - babelTextWidth(context, text, size), top, size);
};

/** Le plat arrière : un résumé d'essai, deux avis de la critique, le code-barres et le prix. */
export const blankPageBack = (): THREE.CanvasTexture =>
  board(SLATE, SLATE_EDGE, (context) => {
    const { blurb, reviews, isbn, price: cost } = messages().rareBooks.blankPage.back;
    const font = `italic ${4.2 * CQW}px ${GARAMOND}`;
    context.font = font;
    const lines = wrap(context, blurb, 72 * CQW);
    lines.forEach((line, index) => write(context, line, WIDTH / 2, 14 * CQW + index * 6 * CQW, { font, color: CREAM }));
    let y = 14 * CQW + lines.length * 6 * CQW + 6 * CQW;
    context.fillStyle = '#d8cdb5';
    context.fillRect(WIDTH / 2 - 5 * CQW, y, 10 * CQW, 0.25 * CQW);
    y += 6 * CQW;
    for (const [quote, source] of reviews) {
      write(context, quote, WIDTH / 2, y, { font: `600 ${4.4 * CQW}px ${GARAMOND}`, color: CREAM });
      write(context, source, WIDTH / 2, y + 6 * CQW, { font: `${3 * CQW}px ${GARAMOND}`, color: '#d8cdb5', spacing: 0.3 * CQW });
      y += 15 * CQW;
    }
    blot(context, WIDTH / 2, 104 * CQW, 1.2 * CQW);
    barcode(context, 8 * CQW, 108 * CQW, isbn);
    price(context, cost, 92 * CQW, 116 * CQW);
  });

/**
 * Le dos : le titre et l'auteur couchés dans la longueur, une tache d'encre en bas. La peau du dos est tendue sur un dos
 * étroit (`thickness`, la hauteur du livre faisant 1) : le dessin y est élargi d'autant pour ne pas s'écraser.
 */
export const blankPageSpine = (thickness: number): THREE.CanvasTexture =>
  board(SLATE, SLATE_EDGE, (context) => {
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch, 1);
    blot(context, 0, 112 * CQW, 1.2 * CQW);
    context.translate(0, 12 * CQW);
    context.rotate(Math.PI / 2);
    context.fillStyle = CREAM;
    context.textBaseline = 'middle';
    context.font = `600 ${7 * CQW}px ${GARAMOND}`;
    context.letterSpacing = `${0.4 * CQW}px`;
    context.fillText(messages().rareBooks.blankPage.title, 0, 0);
    // L'auteur plus bas, plus petit.
    context.font = `${4 * CQW}px ${GARAMOND}`;
    context.fillStyle = '#d8cdb5';
    context.fillText(messages().rareBooks.blankPage.author, 60 * CQW, 0);
    context.restore();
  });
