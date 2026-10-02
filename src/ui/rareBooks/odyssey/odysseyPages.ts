import { hashText, seeded } from '../../../core/random';
import { messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGE_CENTER } from '../draw';
import { rng } from '../arabianNights/arabianNightsOrnaments';
import { GARAMOND } from './odysseyBinding';
import type { Paper } from '../../book/pageRender';

/**
 * Les pages de l'édition Lemerre (1893, le scan de Wikisource) : sa page de titre, l'ouverture des rhapsodies
 * (« RHAPSODIE I » bien bas, lettrine ornée sur quatre lignes), son papier. Mesures de .ai/maquette-odyssee.html
 * (y : lignes de base).
 */
export const PAPER: Paper = ['#f4ecd8', '#ebdfc3', '#e3d4b2'];
export const INK = '#221c16';

const print = (context: CanvasRenderingContext2D, text: string, y: number, font: string, spacing: number, color = INK): void => {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${spacing}px`;
  context.fillText(text, PAGE_CENTER, y);
  context.letterSpacing = '0px';
};

/** Le papier de la maquette : grain et rousseurs (toujours les mêmes pour une page). */
export const foxing = (context: CanvasRenderingContext2D, page: number): void => {
  const random = seeded(hashText(`odyssey:paper:${page}`));
  const { width, height } = PAGE_TEXTURE;
  for (let speck = 0; speck < (width * height) / 120; speck++) {
    context.fillStyle = `rgba(110, 80, 30, ${random() * 0.07})`;
    context.fillRect(random() * width, random() * height, 1.5, 1.5);
  }
  for (let spot = 0; spot < 14; spot++) {
    context.fillStyle = `rgba(150, 100, 40, ${0.05 + random() * 0.08})`;
    context.beginPath();
    context.arc(random() * width, random() * height, 1 + random() * 3.5, 0, Math.PI * 2);
    context.fill();
  }
};

/** La page de titre de l'édition de 1893, ligne par ligne : [y, sorte, texte]. */
export const odysseyTitlePage = (context: CanvasRenderingContext2D): void => {
  const fonts: Record<string, [string, number]> = {
    author: [`24px ${GARAMOND}`, 3],
    title: [`78px ${GARAMOND}`, 5],
    translation: [`italic 18px ${GARAMOND}`, 0.5],
    by: [`9px ${GARAMOND}`, 3],
    translator: [`20px ${GARAMOND}`, 3],
    city: [`22px ${GARAMOND}`, 4],
    publisher: [`17px ${GARAMOND}`, 2],
    address: [`11px ${GARAMOND}`, 1.5],
    year: [`11px ${GARAMOND}`, 2],
  };
  for (const [y, kind, text] of messages().rareBooks.odyssey.titlePage as [number, string, string][]) print(context, text, y, ...fonts[kind]);
};

/** L'ouverture d'une rhapsodie : son titre en capitales grasses, bien bas sur la page. */
export const odysseyHead = (context: CanvasRenderingContext2D, title: string): void =>
  print(context, title.toUpperCase(), 290, `700 26px ${GARAMOND}`, 2.5);

/** La lettrine : un carré de quatre lignes (25 de haut chacune), moins le blanc sous la dernière. */
export const DROP_CAP = 4 * 25 - 6;

/** La lettrine ornée : la lettre en réserve dans un carré noir, sur des rinceaux. Son haut : 19 au-dessus de la 1re ligne de base. */
export const odysseyDropCap = (context: CanvasRenderingContext2D, letter: string, x: number, baseline: number): void => {
  const [size, y] = [DROP_CAP, baseline - 19];
  context.save();
  context.fillStyle = INK;
  context.fillRect(x, y, size, size);
  context.strokeStyle = PAPER[0];
  context.lineWidth = 1.1;
  const random = rng(5);
  for (let curl = 0; curl < 14; curl++) {
    const [cx, cy, radius] = [x + random() * size, y + random() * size, 5 + random() * 9];
    const start = random() * 6;
    context.beginPath();
    context.arc(cx, cy, radius, start, random() * 6 + 3.5);
    context.stroke();
  }
  context.strokeRect(x + 3, y + 3, size - 6, size - 6);
  context.fillStyle = INK;
  context.fillRect(x + size * 0.2, y + size * 0.14, size * 0.6, size * 0.72);
  context.font = `700 ${size * 0.82}px ${GARAMOND}`;
  context.fillStyle = PAPER[0];
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillText(letter, x + size / 2, y + size * 0.8);
  context.restore();
};
