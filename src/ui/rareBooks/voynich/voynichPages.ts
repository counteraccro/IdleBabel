import '@fontsource/caveat/600.css';
import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/im-fell-english-sc/400.css';
import { messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGES_PER_BOOK } from '../../../systems/books';
import { FELL, FELL_SC, HAND, PENCIL, pencil, star, text, vellum, type Tone } from './voynichDraw';
import { herb, type Flower, type Leaves, type Root } from './voynichHerb';
import { jarsPage, poolsPage, starsPage } from './voynichPlates';
import { RED_INK, rng, voynichLines, voynichWord, word, wordWidth } from './voynichScript';

/**
 * Les pages du Manuscrit de Voynich (maquette .ai/maquette-voynich-pages.html) : du vélin, l'écriture
 * inconnue, les parties du vrai manuscrit. Page 1 : du texte seul ; 2 : le revers, nu ; puis les plantes,
 * les cercles d'étoiles, les bassins, la pharmacie, les recettes ; page 410, un mot entouré au crayon (un
 * sceau secret, voynich.ts). Pas de titre courant : en haut à droite des pages de droite, un numéro de folio
 * ajouté plus tard. Un lecteur venu avant a laissé çà et là des notes au crayon.
 */

const { width: W, height: H } = PAGE_TEXTURE;
export const PAGE_TONE: Tone = ['#f1e9d3', '#e3d6b4', '#cbb88c'];
/** Où commence chaque partie. */
const HERBAL = 3;
const STARS = 131;
const POOLS = 171;
const JARS = 231;
const RECIPES = 281;
/** Le mot entouré, à la dernière page. */
export const LAST_PAGE = PAGES_PER_BOOK;
/** Quatre pages par signe : dix signes, de mars à décembre. */
const PAGES_PER_SIGN = 4;
/** Une page sur trente environ, le lecteur au crayon laisse un « ? » ; une sur trente, des bâtons. */
const PENCIL_ODDS = 1 / 30;

export const loadVoynichFonts = (): Promise<unknown> =>
  Promise.all([`24px ${FELL}`, `italic 30px ${FELL}`, `15px ${FELL_SC}`, `600 30px ${HAND}`].map((font) => document.fonts.load(font)));

type Context = CanvasRenderingContext2D;

/** Le vélin d'une page, la gouttière côté reliure, et le folio en haut à droite des pages de droite. */
const sheet = (context: Context, page: number, right: boolean): void => {
  vellum(context, W, H, 1000 + page, PAGE_TONE, true);
  const gutter = context.createLinearGradient(right ? 0 : W, 0, right ? 70 : W - 70, 0);
  gutter.addColorStop(0, 'rgba(60,40,15,0.28)');
  gutter.addColorStop(1, 'rgba(60,40,15,0)');
  context.fillStyle = gutter;
  context.fillRect(right ? 0 : W - 70, 0, 70, H);
  if (right) text(context, String((page + 1) / 2), W - 62, 58, `24px ${FELL}`, 'rgba(40,30,25,0.55)');
};

/** Un paragraphe : des lignes pleines, la dernière plus courte. Rend le y suivant. */
const paragraph = (context: Context, x0: number, x1: number, y: number, lines: number, u: number, lead: number, seed: number): number => {
  for (let i = 0; i < lines; i++) {
    const last = i === lines - 1;
    voynichLines(context, x0, last ? x0 + (x1 - x0) * (0.35 + rng(seed + i)() * 0.4) : x1, y, y, u, lead, seed + i * 13);
    y += lead;
  }
  return y;
};

/** Un tampon pâli : l'hexagone de la Bibliothèque, comme un ex-libris. */
const stamp = (context: Context, x: number, y: number): void => {
  context.save();
  context.translate(x, y);
  context.rotate(-0.12);
  context.strokeStyle = context.fillStyle = 'rgba(95,60,120,0.32)';
  for (const [radius, width] of [
    [44, 4],
    [34, 1.5],
  ]) {
    context.lineWidth = width;
    context.beginPath();
    for (let corner = 0; corner < 6; corner++) {
      const angle = (Math.PI / 3) * corner - Math.PI / 2;
      if (corner) context.lineTo(radius * Math.cos(angle), radius * Math.sin(angle));
      else context.moveTo(radius * Math.cos(angle), radius * Math.sin(angle));
    }
    context.closePath();
    context.stroke();
  }
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.font = `15px ${FELL_SC}`;
  context.fillText('BABEL', 0, 6);
  context.font = `13px ${FELL_SC}`;
  context.letterSpacing = '2px';
  context.fillText(messages().rareBooks.voynich.stamp, 0, 66);
  context.restore();
};

/** Folio 1 : la grande lettre à boucles, quatre paragraphes, la colonne de signes rouges, le tampon. */
const firstPage = (context: Context): void => {
  const random = rng(11);
  voynichWord(context, 'p', 86, 168, 36, random, 'rgba(62,36,18,0.9)');
  let y = 120;
  voynichLines(context, 150, 500, y, y + 52, 10, 26, 101);
  y += 78;
  y = paragraph(context, 80, 500, y, 3, 10, 26, 102);
  y = paragraph(context, 80, 500, y + 26, 5, 10, 26, 103);
  y = paragraph(context, 80, 500, y + 26, 4, 10, 26, 104);
  paragraph(context, 80, 500, y + 26, 3, 10, 26, 105);
  for (let row = 0; row < 4; row++) voynichWord(context, word(random).slice(0, 3), 528, 150 + row * 60, 9, random, RED_INK);
  stamp(context, W / 2, 690);
};

const LEAVES: readonly Leaves[] = ['lance', 'round', 'lobed'];
const FLOWERS: readonly Flower[] = ['cup', 'ball', 'star', 'none'];
const ROOTS: readonly Root[] = ['tuber', 'roots', 'bulb'];

/** Les plantes : une par page, jamais deux fois la même suite de feuilles, de fleur et de racine. */
const herbalPage = (context: Context, page: number): void => {
  voynichLines(context, 80, 560, 110, 162, 10, 26, page * 10 + 1);
  herb(context, W / 2 + 10, 560, 1.0, page * 10 + 2, {
    leaves: LEAVES[page % 3],
    flower: FLOWERS[page % 4],
    root: ROOTS[Math.floor(page / 5) % 3],
  });
  voynichLines(context, 80, 560, 240, 520, 10, 26, page * 10 + 3, () => [150, 490]);
  voynichLines(context, 80, 560, 700, 726, 10, 26, page * 10 + 4, () => [200, 440]);
};

/** Les recettes : de courts paragraphes, chacun marqué d'une étoile dans la marge. */
const recipesPage = (context: Context, page: number): void => {
  let y = 104;
  for (let block = 0; block < 9 && y < 720; block++) {
    star(context, 70, y - 5, 10);
    y = paragraph(context, 92, 565, y, 2 + ((block * 7) % 3), 9.5, 23, page * 10 + block * 31) + 10;
  }
};

/** Page 410 : quelques lignes, puis le mot entouré et les notes du lecteur au crayon. */
const lastPage = (context: Context): void => {
  const notes = messages().rareBooks.voynich.last;
  const y = paragraph(context, 80, 560, 110, 5, 10, 26, 4100);
  const random = rng(4101);
  const [circled, u, x, baseline] = ['oteos', 12, 200, y + 40];
  voynichWord(context, 'qokeedy', 80, baseline, u, random);
  voynichWord(context, circled, x, baseline, u, random);
  const width = wordWidth(circled, u);
  context.save();
  context.strokeStyle = PENCIL;
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(x + width / 2, baseline - 6, width / 2 + 18, 24, -0.05, 0, Math.PI * 2);
  context.stroke();
  context.restore();
  pencil(context, notes.except, x + 110, baseline + 4, 30, -0.04);
  pencil(context, notes.counted, W / 2 - 40, 560, 34, -0.03);
  pencil(context, notes.nothing, W / 2 - 150, 604, 34, -0.03);
};

/** Le lecteur au crayon, de temps en temps : un « ? » dans la marge, des bâtons pour compter. */
const pencilMarks = (context: Context, page: number, right: boolean): void => {
  const random = rng(page * 7919 + 13);
  // Le premier tirage d'un petit germe est toujours petit : on le jette.
  random();
  if (random() < PENCIL_ODDS) pencil(context, '?', right ? 30 : W - 52, 200 + random() * 400, 34);
  if (random() < PENCIL_ODDS) pencil(context, 'I'.repeat(3 + Math.floor(random() * 4)), right ? 588 : 14, 200 + random() * 400, 24, -0.1);
};

/** Dessine la page `page` (repère de la texture) ; les pages impaires sont à droite. */
export const paintVoynichPage = (context: Context, page: number): void => {
  const right = page % 2 === 1;
  sheet(context, page, right);
  if (page === 1) return firstPage(context);
  if (page < HERBAL) return;
  if (page === LAST_PAGE) return lastPage(context);
  if (page < STARS) herbalPage(context, page);
  else if (page < POOLS) starsPage(context, page, Math.floor((page - STARS) / PAGES_PER_SIGN));
  else if (page < JARS) poolsPage(context, page, right, PAGE_TONE[1]);
  else if (page < RECIPES) jarsPage(context, page);
  else recipesPage(context, page);
  pencilMarks(context, page, right);
};
