import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/oswald/300.css';
import { messages } from '../../../i18n';
import { TITLE, WIDTH, board } from '../draw';
import { NIGHT, NIGHT_EDGE, SILVER, SILVER_DARK, cloth, hexagon, write } from './creditsCover';
import type * as THREE from 'three';

/**
 * Le plat arrière du livre des crédits : le dos d'un film qu'on vend, comme un livre moderne. En haut, les
 * critiques étoilées de la presse de Babel ; au milieu, le laurier d'un festival ; en bas, le bloc de crédits
 * serré des affiches de cinéma, et le petit hexagone d'argent.
 */

const QUOTE = "'EB Garamond', Georgia, serif";
const CONDENSED = "'Oswald', 'Arial Narrow', sans-serif";
const WHITE = '#e9edf4';

export const loadCreditsBackFonts = (): Promise<unknown> =>
  Promise.all([`italic 40px ${QUOTE}`, `300 40px ${CONDENSED}`].map((font) => document.fonts.load(font)));

/** Une branche de laurier : une tige courbe et ses feuilles, de part et d'autre du titre du festival. */
const branch = (context: CanvasRenderingContext2D, x: number, y: number, side: 1 | -1): void => {
  context.save();
  context.translate(x, y);
  context.scale(side, 1);
  context.strokeStyle = SILVER;
  context.fillStyle = SILVER;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(40, 0, 52, Math.PI * 0.62, Math.PI * 1.38);
  context.stroke();
  for (let i = 0; i < 7; i++) {
    const angle = Math.PI * (0.66 + i * 0.105);
    const [leafX, leafY] = [40 + 52 * Math.cos(angle), 52 * Math.sin(angle)];
    for (const tilt of [-0.75, 0.75]) {
      context.save();
      context.translate(leafX, leafY);
      context.rotate(angle + Math.PI / 2 + tilt);
      context.beginPath();
      context.ellipse(0, -9, 3.6, 9, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }
  context.restore();
};

/** Une ligne du bloc de crédits, serrée pour tenir dans `room` si elle est trop longue. */
const billingLine = (context: CanvasRenderingContext2D, line: string, y: number, room: number): void => {
  context.save();
  context.font = `300 17px ${CONDENSED}`;
  context.letterSpacing = '1px';
  const width = context.measureText(line).width;
  context.translate(WIDTH / 2, y);
  if (width > room) context.scale(room / width, 1);
  context.fillStyle = SILVER_DARK;
  context.textAlign = 'center';
  context.fillText(line, 0, 0);
  context.restore();
};

export const creditsBack = (): THREE.CanvasTexture =>
  board(NIGHT, NIGHT_EDGE, (context) => {
    const { reviews, laurel, billing } = messages().rareBooks.credits.back;
    cloth(context, WIDTH, 37);
    reviews.forEach(([quote, stars, source], i) => {
      const y = 120 + i * 150;
      write(context, stars, WIDTH / 2, y, { font: `600 22px ${TITLE}`, color: SILVER, spacing: 8 });
      write(context, quote, WIDTH / 2, y + 48, { font: `italic 34px ${QUOTE}`, color: WHITE });
      write(context, source, WIDTH / 2, y + 84, { font: `500 15px ${TITLE}`, color: SILVER_DARK, spacing: 3 });
    });
    // Le laurier du festival.
    branch(context, WIDTH / 2 - 150, 620, 1);
    branch(context, WIDTH / 2 + 150, 620, -1);
    write(context, laurel[0], WIDTH / 2, 612, { font: `600 17px ${TITLE}`, color: SILVER, spacing: 3 });
    write(context, laurel[1], WIDTH / 2, 642, { font: `500 14px ${TITLE}`, color: SILVER_DARK, spacing: 2 });
    billing.forEach((line, i) => billingLine(context, line, 790 + i * 26, 640));
    context.fillStyle = SILVER;
    hexagon(context, WIDTH / 2, 950, 7);
    context.fill();
  });
