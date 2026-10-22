import { PAGE_TEXTURE } from '../../book/pageLayout';
import { GLASSES, bottle, glassOf } from './wiskyBottles';
import { AMBER, HAND, INK, PEN, RULE, SANS, SERIF, SOFT, drunkLine, ring, rng, splash, tumbler, wrap } from './wiskyDraw';
import { LAST_FICHE_PAGE, drunkenness, ficheAt, runningHeads, sipOf, type Fiche, type WiskyTexts } from './wiskyPlan';

/**
 * Les pages de fiches de WiskyPedia (maquette .ai/maquette-wiskypedia.html) : deux fiches par page, la bouteille
 * en photo, le nom, la distillerie, la gorgée et son heure, le paragraphe, puis nez, bouche, finale. L'ivresse de
 * la page fait pencher les lignes, dédouble les lettres, pose des ronds de verre et renverse des flaques.
 */

const W = PAGE_TEXTURE.width;
const H = PAGE_TEXTURE.height;
const COLUMN = 256;

/** Le titre courant côté tranche et le folio, un filet dessous. */
export const header = (context: CanvasRenderingContext2D, page: number, label: string, drunk: number, random: () => number): void => {
  const right = page % 2 === 1;
  const outer = right ? W - 48 : 48;
  drunkLine(
    context,
    right ? `${label}   ${page}` : `${page}   ${label}`,
    outer,
    46,
    `400 15px ${SANS}`,
    SOFT,
    drunk * 0.4,
    random,
    right ? 'right' : 'left',
  );
  context.fillStyle = RULE;
  context.fillRect(48, 58, W - 96, 1);
};

/** La taille de `font` (en px) réduite pour que `label` tienne dans `width`. */
const fitted = (context: CanvasRenderingContext2D, label: string, weight: string, size: number, family: string, width: number): string => {
  context.save();
  context.font = `${weight} ${size}px ${family}`;
  const measured = context.measureText(label).width;
  context.restore();
  return `${weight} ${measured > width ? (size * width) / measured : size}px ${family}`;
};

/** Une fiche dans sa colonne, à partir de `x`. */
const fiche = (
  context: CanvasRenderingContext2D,
  texts: WiskyTexts,
  entry: Fiche,
  x: number,
  drunk: number,
  random: () => number,
): void => {
  const center = x + COLUMN / 2;
  const tilt = (random() - 0.5) * drunk * drunk * 0.35;
  if ('glass' in entry) glassOf(context, center, 300, GLASSES[entry.glass].fill, GLASSES[entry.glass].angle, tilt);
  else bottle(context, center, 300, 1.1, entry.bottle, entry.label, tilt);
  let y = 340;
  drunkLine(context, entry.title, x, y, fitted(context, entry.title, '600', 22, SANS, COLUMN), INK, drunk, random);
  y += 22;
  drunkLine(context, entry.maker, x, y, fitted(context, entry.maker, 'italic 400', 15, SERIF, COLUMN), SOFT, drunk, random);
  y += 18;
  drunkLine(context, entry.kind, x, y, fitted(context, entry.kind, 'italic 400', 15, SERIF, COLUMN), SOFT, drunk, random);
  y += 19;
  const sip = texts.sip.replace('{n}', String(entry.sip)).replace('{time}', entry.time);
  tumbler(context, x + 6, y - 4, AMBER);
  drunkLine(context, sip, x + 18, y, fitted(context, sip, '500', 13, SANS, COLUMN - 18), AMBER, drunk, random);
  y += 25;
  const body = `400 16.5px ${SERIF}`;
  for (const line of wrap(context, entry.text, body, COLUMN)) {
    drunkLine(context, line, x, y, body, INK, drunk, random);
    y += 20.5;
  }
  y += 10;
  const font = `400 15.5px ${SERIF}`;
  const bold = `600 15.5px ${SERIF}`;
  texts.noteLabels.forEach((label, i) => {
    context.save();
    context.font = bold;
    const width = context.measureText(`${label} `).width;
    context.restore();
    drunkLine(context, label, x, y, bold, AMBER, drunk, random);
    const lines = wrap(context, entry.notes[i], font, COLUMN - width);
    lines.forEach((line, n) => drunkLine(context, line, n ? x : x + width, y + n * 19, font, INK, drunk, random));
    y += 19 * lines.length + 3;
  });
};

/** Les taches de la page, selon l'ivresse : un rond de verre, puis un autre et une flaque. */
const stains = (context: CanvasRenderingContext2D, drunk: number, random: () => number): void => {
  if (drunk > 0.3) ring(context, 120 + random() * 400, 120 + random() * 560, 46, drunk, random);
  if (drunk > 0.6) {
    ring(context, 100 + random() * 440, 200 + random() * 400, 44, drunk, random);
    splash(context, 140 + random() * 360, 560 + random() * 140, 70, random);
  }
};

/** Une page de deux fiches (13 à 407). */
export const fichesPage = (context: CanvasRenderingContext2D, texts: WiskyTexts, page: number): void => {
  const drunk = drunkenness(page);
  const random = rng(page * 31 + 3);
  header(context, page, runningHeads(texts, page)[page % 2 === 1 ? 'right' : 'left'], drunk, random);
  const left = page % 2 === 1 ? 64 : 48;
  for (const slot of [0, 1]) fiche(context, texts, ficheAt(texts, page, slot), left + slot * 280, drunk, random);
  stains(context, drunk, random);
};

/** Page 408 : la dernière fiche, et dans la marge, l'écriture qui lâche. */
export const lastFichePage = (context: CanvasRenderingContext2D, texts: WiskyTexts): void => {
  const page = LAST_FICHE_PAGE;
  const random = rng(77);
  header(context, page, runningHeads(texts, page).left, 1, random);
  fiche(context, texts, ficheAt(texts, page, 0), 48, 1, random);
  const scrawl = [texts.scrawlSip.replace('{n}', String(sipOf(page, 1))), ...texts.scrawl];
  let y = 340;
  scrawl.forEach((line, i) => {
    if (line) drunkLine(context, line, 380 + i * 6, y, `600 30px ${HAND}`, PEN, 0.9, random);
    y += 36;
  });
  // Le stylo glisse vers la page suivante.
  context.save();
  context.strokeStyle = PEN;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(380, 700);
  context.bezierCurveTo(470, 690, 520, 760, W, 790);
  context.stroke();
  context.restore();
  ring(context, 470, 200, 48, 1, random);
  ring(context, 500, 240, 46, 1, random);
  splash(context, 300, 690, 90, random);
};

/** Page 409 : le trou noir. La phrase s'efface mot à mot, le stylo glisse jusqu'en bas, puis plus rien. */
export const blackoutPage = (context: CanvasRenderingContext2D, texts: WiskyTexts): void => {
  const random = rng(88);
  let x = 90;
  let y = 140;
  texts.blackout.forEach((word, i) => {
    context.save();
    context.globalAlpha = Math.max(0.12, 1 - i * 0.13);
    drunkLine(context, word, x, y, `600 ${30 - i * 1.5}px ${HAND}`, PEN, 1, random);
    context.restore();
    context.save();
    context.font = `600 30px ${HAND}`;
    x += context.measureText(word).width + 10;
    context.restore();
    y += 10 + i * 4;
  });
  context.save();
  context.strokeStyle = 'rgba(58,53,80,0.5)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x, y);
  context.bezierCurveTo(x + 40, y + 60, 520, 300, 470, H);
  context.stroke();
  context.restore();
};
