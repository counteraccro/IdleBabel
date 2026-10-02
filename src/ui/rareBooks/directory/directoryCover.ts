import '@fontsource/oswald/200.css';
import '@fontsource/oswald/600.css';
import '@fontsource/oswald/700.css';
import { messages } from '../../../i18n';
import { CQW, HEIGHT, SANS, WIDTH, board, write } from '../draw';
import type * as THREE from 'three';

/** Jaune de l'annuaire, et ses encres : le bleu du titre, l'étiquette bleue et rouge, les puces vertes. */
export const YELLOW = '#f2c531';
export const YELLOW_EDGE = '#d9a91c';
export const INK = '#1b1a17';
const BLUE = '#1f3f9a';
const LABEL_BLUE = '#6f86c8';
const RED = '#d8352a';
const GREEN = '#2d8a7a';
/** Capitales étroites des annuaires des années 90. */
const CONDENSED = "'Oswald', 'Arial Narrow', sans-serif";

/** Les polices de la couverture : chargées avant de la dessiner. */
export const loadDirectoryFonts = (): Promise<unknown> =>
  Promise.all([200, 600, 700].map((weight) => document.fonts.load(`${weight} 40px ${CONDENSED}`)));

/** Le petit hexagone de la Bibliothèque, au trait (`fill` : plein). */
export const hexagon = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  width: number,
  color = INK,
  fill?: string,
): void => {
  context.save();
  context.beginPath();
  for (let side = 0; side < 6; side++) {
    const angle = (Math.PI / 3) * side - Math.PI / 2;
    context[side === 0 ? 'moveTo' : 'lineTo'](x + radius * Math.cos(angle), y + radius * Math.sin(angle));
  }
  context.closePath();
  if (fill) {
    context.fillStyle = fill;
    context.fill();
  }
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke();
  context.restore();
};

/** L'étiquette du haut, centrée en `x` : `top` sur fond bleu (l'édition), `bottom` sur fond rouge (la zone). */
const label = (
  context: CanvasRenderingContext2D,
  [top, bottom]: readonly [string, string],
  x: number,
  y: number,
  width: number,
  height: number,
  size: number,
): void => {
  context.fillStyle = LABEL_BLUE;
  context.fillRect(x - width / 2, y, width, height);
  context.fillStyle = RED;
  context.fillRect(x - width / 2, y + height, width, height);
  const style = { font: `600 ${size}px ${CONDENSED}`, color: '#fff', spacing: size * 0.08 };
  write(context, top, x, y + (height - size * 1.2) / 2, style);
  write(context, bottom, x, y + height + (height - size * 1.2) / 2, style);
};

/** Le sceau de la Bibliothèque, en bas à gauche, à la place du logo de l'opérateur. */
const mark = (context: CanvasRenderingContext2D, x: number, y: number): void => {
  hexagon(context, x + 2.3 * CQW, y + 1.6 * CQW, 2.3 * CQW, 0.5 * CQW, BLUE, BLUE);
  hexagon(context, x + 2.3 * CQW, y + 1.6 * CQW, 1 * CQW, 0.4 * CQW, YELLOW);
  write(context, messages().rareBooks.directory.mark, x + 6 * CQW, y, { font: `600 ${3.3 * CQW}px ${SANS}`, color: BLUE, align: 'left' });
};

/** Les puces, en bas à droite : une ligne en gras, la suivante en maigre. */
const bullets = (context: CanvasRenderingContext2D, x: number, top: number): void => {
  messages().rareBooks.directory.bullets.forEach(([bold, plain], index) => {
    const y = top + index * 8 * CQW;
    context.fillStyle = GREEN;
    context.beginPath();
    context.arc(x, y + 1.6 * CQW, 0.9 * CQW, 0, Math.PI * 2);
    context.fill();
    write(context, bold, x + 2.5 * CQW, y, { font: `bold ${2.6 * CQW}px ${SANS}`, color: INK, align: 'left' });
    write(context, plain, x + 2.5 * CQW, y + 3.2 * CQW, { font: `${2.6 * CQW}px ${SANS}`, color: INK, align: 'left' });
  });
};

/** L'article fin puis le titre géant, étiré en hauteur, sur toute la largeur de `left` à `right`. */
const title = (context: CanvasRenderingContext2D, left: number, right: number, baseline: number): void => {
  const { article, title: word } = messages().rareBooks.directory;
  context.save();
  context.fillStyle = BLUE;
  context.textBaseline = 'alphabetic';
  context.font = `200 100px ${CONDENSED}`;
  const articleWidth = context.measureText(article).width;
  context.font = `700 100px ${CONDENSED}`;
  const size = (100 * (right - left)) / (articleWidth + context.measureText(word).width);
  context.translate(left, baseline);
  context.scale(1, 1.6);
  context.font = `200 ${size}px ${CONDENSED}`;
  context.fillText(article, 0, 0);
  context.font = `700 ${size}px ${CONDENSED}`;
  context.fillText(word, (articleWidth * size) / 100, 0);
  context.restore();
};

/** La couverture, comme un annuaire des années 90 : étiquette, titre géant, puces, sceau. */
export const directoryFront = (): THREE.CanvasTexture =>
  board(YELLOW, YELLOW_EDGE, (context) => {
    const { label: edition, zone } = messages().rareBooks.directory;
    label(context, [edition, zone], WIDTH / 2, 4 * CQW, 38 * CQW, 6 * CQW, 3.5 * CQW);
    write(context, messages().rareBooks.directory.tagline, WIDTH / 2, 17 * CQW, { font: `italic ${3 * CQW}px ${SANS}`, color: INK });
    title(context, 6 * CQW, 94 * CQW, HEIGHT * 0.47);
    bullets(context, 65 * CQW, 86 * CQW);
    mark(context, 6 * CQW, 115 * CQW);
  });

/** Le plat arrière : une publicité encadrée en haut, les numéros utiles en bas (aucun, sauf le vôtre). */
export const directoryBack = (): THREE.CanvasTexture =>
  board(YELLOW, YELLOW_EDGE, (context) => {
    const { ad, usefulTitle, useful } = messages().rareBooks.directory;
    const [left, right] = [8 * CQW, 92 * CQW];
    // La publicité.
    context.strokeStyle = BLUE;
    context.lineWidth = 1 * CQW;
    context.strokeRect(left, 8 * CQW, right - left, 46 * CQW);
    hexagon(context, WIDTH / 2, 17 * CQW, 4 * CQW, 0.8 * CQW, BLUE);
    // Le nom de l'annonceur, à la largeur du cadre au plus.
    context.font = `700 ${7 * CQW}px ${CONDENSED}`;
    const adSize = Math.min(7 * CQW, (7 * CQW * (right - left - 8 * CQW)) / context.measureText(ad[0]).width);
    write(context, ad[0], WIDTH / 2, 24 * CQW, { font: `700 ${adSize}px ${CONDENSED}`, color: BLUE });
    write(context, ad[1], WIDTH / 2, 35 * CQW, { font: `600 ${6 * CQW}px ${CONDENSED}`, color: RED });
    write(context, ad[2], WIDTH / 2, 45 * CQW, { font: `italic ${3.2 * CQW}px ${SANS}`, color: INK });
    // Les numéros utiles : un bandeau, puis une ligne par service, des points jusqu'au numéro.
    context.fillStyle = BLUE;
    context.fillRect(left, 62 * CQW, right - left, 8 * CQW);
    write(context, usefulTitle, WIDTH / 2, 63.2 * CQW, { font: `600 ${4.5 * CQW}px ${CONDENSED}`, color: '#fff', spacing: 0.4 * CQW });
    useful.forEach(([service, number], index) => {
      const y = 75 * CQW + index * 5.8 * CQW;
      const last = index === useful.length - 1;
      context.font = `bold ${3.4 * CQW}px ${SANS}`;
      const serviceWidth = context.measureText(service).width;
      write(context, service, left + CQW, y, { font: context.font, color: INK, align: 'left' });
      const numberFont = `700 ${4 * CQW}px ${CONDENSED}`;
      context.font = numberFont;
      const numberWidth = context.measureText(number).width;
      write(context, number, right - CQW, y - 0.4 * CQW, { font: numberFont, color: last ? RED : INK, align: 'right' });
      context.fillStyle = 'rgba(27, 26, 23, 0.5)';
      for (let dot = left + 2 * CQW + serviceWidth; dot < right - 2 * CQW - numberWidth; dot += 1.2 * CQW)
        context.fillRect(dot, y + 3 * CQW, 0.3 * CQW, 0.3 * CQW);
    });
    mark(context, 6 * CQW, 115 * CQW);
  });

/**
 * Le dos : l'étiquette en haut, le titre couché dans la longueur, le sceau et « ∞ » en rouge en bas (à la
 * place du numéro de département). La peau du dos est tendue sur un dos étroit (`thickness`, la hauteur
 * du livre faisant 1) : le dessin y est élargi d'autant pour ne pas s'écraser.
 */
export const directorySpine = (thickness: number): THREE.CanvasTexture =>
  board(YELLOW, YELLOW_EDGE, (context) => {
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const { article, title: word } = messages().rareBooks.directory;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch, 1);
    // Sur le dos, l'étiquette se resserre : l'année, les lettres.
    label(context, ['1941', 'A-Z'], 0, 3 * CQW, 7.5 * CQW, 4 * CQW, 1.5 * CQW);
    hexagon(context, 0, 106 * CQW, 1.4 * CQW, 0.3 * CQW, BLUE, BLUE);
    hexagon(context, 0, 106 * CQW, 0.6 * CQW, 0.25 * CQW, YELLOW);
    // Oswald n'a pas de « ∞ » : une police qui l'a.
    write(context, '∞', 0, 112 * CQW, { font: `bold ${6 * CQW}px ${SANS}`, color: RED });
    context.translate(0, 15 * CQW);
    context.rotate(Math.PI / 2);
    context.fillStyle = BLUE;
    context.textBaseline = 'middle';
    context.font = `200 ${6.5 * CQW}px ${CONDENSED}`;
    const articleWidth = context.measureText(article).width;
    context.fillText(article, 0, 0);
    context.font = `700 ${8 * CQW}px ${CONDENSED}`;
    context.fillText(word, articleWidth, 0);
    context.restore();
  });
