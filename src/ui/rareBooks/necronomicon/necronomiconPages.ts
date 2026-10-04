import '@fontsource/caveat/600.css';
import { messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { shadeGutter } from '../../book/pageRender';
import { HAND } from '../draw';
import { PAGES_PER_BOOK } from '../../../systems/books';
import { almond, gold, rng, type Random } from './necronomiconDraw';
import { INK, RED, line, rosette, word } from './necronomiconScript';

/**
 * Les pages d'Al Azif (maquette .ai/maquette-necronomicon-pages.html) : un manuscrit. Papier crème semé de
 * paillettes d'or, cadre de filets or, rouge et bleu, l'écriture inventée (necronomiconScript.ts), rubriques
 * rouges, fleurons d'or. Pas de folio : en bas des pages de droite, le premier mot de la suivante (la
 * réclame). Une page de titre, puis dix chapitres ouverts par un bandeau enluminé, rien qui se lise.
 */

const { width: W, height: H } = PAGE_TEXTURE;
const BLUE = '#1f3f7a';
const LAPIS = '#18305e';
/** La page de titre, et la première ouverture de chapitre ; puis un chapitre toutes les 40 pages. */
const TITLE_PAGE = 1;
const FIRST_CHAPTER = 3;
const CHAPTER_EVERY = 40;
const CHAPTERS = 10;
/** Une page de gauche sur quinze environ porte une glose dans la marge. */
const GLOSS_ODDS = 1 / 15;

export const loadNecronomiconFonts = (): Promise<unknown> => document.fonts.load(`600 25px ${HAND}`);

/** Le papier : crème, plus sombre vers les bords, des paillettes d'or, quelques rousseurs ; puis la gouttière. */
const paper = (context: CanvasRenderingContext2D, seed: number, spineOnLeft: boolean): void => {
  const shade = context.createRadialGradient(W / 2, H / 2, 60, W / 2, H / 2, 520);
  shade.addColorStop(0, '#f1e4c4');
  shade.addColorStop(1, '#dcc89c');
  context.fillStyle = shade;
  context.fillRect(0, 0, W, H);
  const random = rng(seed);
  for (let speck = 0; speck < 2600; speck++) {
    context.fillStyle = `rgba(120,90,40,${random() * 0.06})`;
    context.fillRect(random() * W, random() * H, 1.5, 1.5);
  }
  for (let flake = 0; flake < 70; flake++) {
    context.fillStyle = `rgba(214,170,70,${0.35 + random() * 0.4})`;
    context.beginPath();
    context.arc(random() * W, random() * H, 0.8 + random() * 1.6, 0, Math.PI * 2);
    context.fill();
  }
  for (let fox = 0; fox < 9; fox++) {
    context.fillStyle = `rgba(150,100,40,${0.04 + random() * 0.05})`;
    context.beginPath();
    context.arc(random() * W, random() * H, 4 + random() * 14, 0, Math.PI * 2);
    context.fill();
  }
  shadeGutter(context, spineOnLeft);
};

/** Le cadre du texte (jadwal) : filet noir, bande d'or, filet rouge, filet bleu. */
const FRAME = { x0: 92, y0: 96, x1: 548, y1: 712 };
const jadwal = (context: CanvasRenderingContext2D): void => {
  const { x0, y0, x1, y1 } = FRAME;
  context.strokeStyle = INK;
  context.lineWidth = 1;
  context.strokeRect(x0 - 7.5, y0 - 7.5, x1 - x0 + 15, y1 - y0 + 15);
  context.strokeStyle = gold(context, y0, y1);
  context.lineWidth = 4;
  context.strokeRect(x0 - 3, y0 - 3, x1 - x0 + 6, y1 - y0 + 6);
  context.strokeStyle = RED;
  context.lineWidth = 1;
  context.strokeRect(x0 + 0.5, y0 + 0.5, x1 - x0 - 1, y1 - y0 - 1);
  context.strokeStyle = BLUE;
  context.strokeRect(x0 + 3.5, y0 + 3.5, x1 - x0 - 7, y1 - y0 - 7);
};

/** Le texte du cadre : lignes de `y0` jusqu'au bas, paragraphes, rubriques, fleurons. */
const LEAD = 31;
const textBlock = (context: CanvasRenderingContext2D, random: Random, y0: number): void => {
  const [x0, x1] = [FRAME.x0 + 18, FRAME.x1 - 18];
  let fresh = true;
  for (let y = y0; y < FRAME.y1 - 14; y += LEAD) {
    // Un paragraphe ne finit jamais sur sa première ligne.
    const end: boolean = !fresh && random() < 0.12;
    const left = line(context, random, x0, x1, y, { red: fresh ? 1 + Math.floor(random() * 2) : 0, last: end });
    if (!end && random() < 0.18) rosette(context, x0 + (x1 - x0) * (0.2 + random() * 0.6), y - 6);
    if (end) rosette(context, left - 14, y - 6);
    fresh = end;
  }
};

/** La réclame : le premier mot de la page suivante, sous le cadre, de biais. */
const catchword = (context: CanvasRenderingContext2D, random: Random): void => {
  context.save();
  context.translate(FRAME.x0 - 10, FRAME.y1 + 40);
  context.rotate(-0.25);
  context.lineWidth = 2;
  context.lineCap = 'round';
  context.strokeStyle = context.fillStyle = INK;
  word(context, random, 30, 0, 44);
  context.restore();
};

/** Le bandeau enluminé (unwan) : bande d'or, fond lapis, rinceaux, cartouche central, palmettes. */
const unwan = (context: CanvasRenderingContext2D, random: Random, x0: number, y0: number, x1: number, y1: number): void => {
  const ink = gold(context, y0, y1);
  context.fillStyle = ink;
  context.fillRect(x0, y0, x1 - x0, y1 - y0);
  context.fillStyle = LAPIS;
  context.fillRect(x0 + 8, y0 + 8, x1 - x0 - 16, y1 - y0 - 16);
  context.strokeStyle = ink;
  context.lineWidth = 1.3;
  for (let x = x0 + 24; x < x1 - 16; x += 26)
    for (const y of [y0 + 24, y1 - 24]) {
      context.beginPath();
      context.arc(x, y, 6, 0.2, Math.PI * 1.8);
      context.stroke();
      context.beginPath();
      context.arc(x + 8, y, 2, 0, Math.PI * 2);
      context.stroke();
    }
  const [cx, cy, hw, hh] = [(x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * 0.3, (y1 - y0) * 0.26];
  const cartouche = (): void => {
    context.beginPath();
    context.moveTo(cx - hw, cy);
    context.quadraticCurveTo(cx - hw + 10, cy - hh, cx - hw + 34, cy - hh);
    context.lineTo(cx + hw - 34, cy - hh);
    context.quadraticCurveTo(cx + hw - 10, cy - hh, cx + hw, cy);
    context.quadraticCurveTo(cx + hw - 10, cy + hh, cx + hw - 34, cy + hh);
    context.lineTo(cx - hw + 34, cy + hh);
    context.quadraticCurveTo(cx - hw + 10, cy + hh, cx - hw, cy);
    context.closePath();
  };
  cartouche();
  context.fillStyle = '#f3e3b6';
  context.fill();
  context.strokeStyle = ink;
  context.lineWidth = 3;
  context.stroke();
  context.save();
  cartouche();
  context.clip();
  context.lineWidth = 2.4;
  context.strokeStyle = context.fillStyle = RED;
  const width = hw * 1.3;
  word(context, random, cx + width / 2, cy + 6, width, 1.3);
  context.restore();
  // Les palmettes aux deux bouts, qui débordent dans la marge.
  for (const [x, side] of [
    [x0, -1],
    [x1, 1],
  ]) {
    context.fillStyle = ink;
    context.beginPath();
    context.moveTo(x, cy - 16);
    context.quadraticCurveTo(x + side * 30, cy - 18, x + side * 34, cy);
    context.quadraticCurveTo(x + side * 30, cy + 18, x, cy + 16);
    context.closePath();
    context.fill();
    context.fillStyle = LAPIS;
    context.beginPath();
    context.arc(x + side * 14, cy, 5, 0, Math.PI * 2);
    context.fill();
  }
};

/** Le sceau de la Bibliothèque, tamponné à l'encre brun-rouge, à moitié pris (à part : les manques ne trouent pas la page). */
const stamp = (target: CanvasRenderingContext2D, random: Random, cx: number, cy: number, size: number): void => {
  const node = document.createElement('canvas');
  node.width = node.height = Math.ceil(size * 2.6);
  const context = node.getContext('2d')!;
  context.translate(node.width / 2, node.height / 2);
  context.rotate(-0.12);
  context.strokeStyle = context.fillStyle = 'rgba(130,40,30,0.55)';
  const hexagon = (radius: number): void => {
    context.beginPath();
    for (let corner = 0; corner < 6; corner++) {
      const angle = (Math.PI / 3) * corner - Math.PI / 2;
      if (corner) context.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
      else context.moveTo(radius * Math.cos(angle), radius * Math.sin(angle));
    }
    context.closePath();
  };
  context.lineWidth = 3;
  hexagon(size);
  context.stroke();
  context.lineWidth = 1.2;
  hexagon(size * 0.84);
  context.stroke();
  hexagon(size * 0.32);
  context.stroke();
  context.lineWidth = 1.6;
  for (let side = 0; side < 6; side++) {
    const angle = (Math.PI / 3) * side;
    word(context, random, Math.cos(angle) * size * 0.58 + 9, Math.sin(angle) * size * 0.58 + 3, 18, 0.5);
  }
  context.globalCompositeOperation = 'destination-out';
  for (let gap = 0; gap < 40; gap++) {
    context.fillStyle = `rgba(0,0,0,${0.4 + random() * 0.6})`;
    context.beginPath();
    context.arc((random() - 0.5) * size * 2.2, (random() - 0.5) * size * 2.2, 2 + random() * 6, 0, Math.PI * 2);
    context.fill();
  }
  target.drawImage(node, cx - node.width / 2, cy - node.height / 2);
};

/** La note au crayon d'un lecteur venu avant, de travers, dans la marge du haut. */
const pencil = (context: CanvasRenderingContext2D, [first, second, signed]: string[]): void => {
  context.save();
  context.translate(W / 2, 74);
  context.rotate(-0.025);
  context.font = `600 25px ${HAND}`;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillStyle = 'rgba(70,70,74,0.78)';
  context.fillText(first, 0, 0);
  context.fillText(second, 6, 28);
  context.textAlign = 'right';
  context.fillText(signed, 250, 58);
  context.restore();
};

/** La page de titre : la note au crayon, le médaillon enluminé et son titre en signes d'or, le sceau tamponné. */
const titlePage = (context: CanvasRenderingContext2D): void => {
  pencil(context, messages().rareBooks.necronomicon.note);
  const [cx, cy] = [W / 2, 390];
  const ink = gold(context, cy - 220, cy + 220);
  almond(context, cx, cy, 170, 210);
  context.fillStyle = LAPIS;
  context.fill();
  context.strokeStyle = ink;
  context.lineWidth = 5;
  context.stroke();
  almond(context, cx, cy, 152, 190);
  context.lineWidth = 1.5;
  context.stroke();
  context.lineWidth = 2.5;
  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(cx, cy + side * 210);
    context.lineTo(cx, cy + side * 236);
    context.stroke();
    context.fillStyle = ink;
    context.beginPath();
    context.ellipse(cx, cy + side * 252, 12, 16, 0, 0, Math.PI * 2);
    context.fill();
  }
  // Les rinceaux d'or pâle le long du bord intérieur.
  context.save();
  almond(context, cx, cy, 148, 186);
  context.clip();
  context.strokeStyle = 'rgba(214,176,90,0.35)';
  context.lineWidth = 1.2;
  const swirls = rng(5);
  for (let swirl = 0; swirl < 70; swirl++) {
    const [angle, depth] = [swirls() * Math.PI * 2, 0.75 + swirls() * 0.2];
    context.beginPath();
    context.arc(cx + Math.cos(angle) * 130 * depth, cy + Math.sin(angle) * 165 * depth, 5, 0, Math.PI * 1.6);
    context.stroke();
  }
  // Le titre : trois lignes de signes d'or, plus grande au milieu.
  const random = rng(730);
  context.lineCap = 'round';
  context.strokeStyle = context.fillStyle = ink;
  context.lineWidth = 2.6;
  word(context, random, cx + 70, cy - 46, 140, 1.4);
  context.lineWidth = 3.6;
  word(context, random, cx + 104, cy + 14, 208, 2);
  context.lineWidth = 2.2;
  word(context, random, cx + 56, cy + 72, 112, 1.1);
  rosette(context, cx, cy - 110, 9);
  rosette(context, cx, cy + 128, 9);
  context.restore();
  stamp(context, rng(9), 480, 690, 46);
};

/** Le chapitre qu'ouvre la page `page` (0 à 9), ou null. */
const chapterAt = (page: number): number | null => {
  const chapter = (page - FIRST_CHAPTER) / CHAPTER_EVERY;
  return Number.isInteger(chapter) && chapter >= 0 && chapter < CHAPTERS ? chapter : null;
};

/** L'ouverture d'un chapitre : le bandeau, le titre à l'encre rouge entre deux fleurons, le texte. */
const chapterPage = (context: CanvasRenderingContext2D, random: Random): void => {
  unwan(context, random, FRAME.x0 + 10, FRAME.y0 + 10, FRAME.x1 - 10, FRAME.y0 + 124);
  context.lineWidth = 2.6;
  context.lineCap = 'round';
  context.strokeStyle = context.fillStyle = RED;
  word(context, random, W / 2 + 110, FRAME.y0 + 172, 220, 1.35);
  rosette(context, W / 2 - 132, FRAME.y0 + 164, 6);
  rosette(context, W / 2 + 132, FRAME.y0 + 164, 6);
  textBlock(context, random, FRAME.y0 + 222);
};

/** La glose : un trait rouge au-dessus d'un mot et, dans la marge, une ligne de biais d'une autre main. */
const gloss = (context: CanvasRenderingContext2D, random: Random): void => {
  const [y, x] = [FRAME.y0 + 36 + LEAD * 7, FRAME.x0 + 200];
  context.strokeStyle = RED;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(x - 30, y - 22);
  context.lineTo(x + 30, y - 22);
  context.stroke();
  context.save();
  context.translate(FRAME.x0 - 34, y + 40);
  context.rotate(-Math.PI / 2 + 0.08);
  context.strokeStyle = context.fillStyle = '#4a3a6a';
  word(context, random, 60, 0, 120, 0.8);
  context.restore();
};

/**
 * Dessine la page `page` sur le contexte (repère de la texture). La page 2, verso du titre, reste nue ; les
 * pages de droite (impaires) portent la réclame, sauf la dernière.
 */
export const paintNecronomiconPage = (context: CanvasRenderingContext2D, page: number, spineOnLeft: boolean): void => {
  paper(context, 1000 + page, spineOnLeft);
  if (page === TITLE_PAGE) return titlePage(context);
  if (page === TITLE_PAGE + 1) return;
  jadwal(context);
  const random = rng(page * 7919 + 13);
  if (chapterAt(page) !== null) chapterPage(context, random);
  else textBlock(context, random, FRAME.y0 + 36);
  const right = page % 2 === 1;
  if (right && page < PAGES_PER_BOOK - 1) catchword(context, random);
  if (!right && random() < GLOSS_ODDS) gloss(context, random);
};
