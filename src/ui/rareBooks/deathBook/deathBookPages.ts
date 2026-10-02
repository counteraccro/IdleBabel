import '@fontsource/caveat/400.css';
import { messages } from '../../../i18n';
import { hashText, seeded } from '../../../core/random';
import { withReaderName } from '../../../systems/readerName';
import { PEN_FONT } from '../../options/notebookInk';
import { highlightFinds, preparePageTexture, type PageFind, type Paper } from '../../book/pageRender';
import { HAND, PAGE_CENTER, wrap } from '../draw';
import { deathName } from './deathNames';

/** Papier d'un cahier : blanc cassé, un peu gris. */
export const DEATH_PAPER: Paper = ['#f1efe9', '#e9e6de', '#dedad0'];
/** Lignes du cahier, de haut en bas. */
const FIRST_LINE = 120;
const LINE_STEP = 34;
const LINES = 19;
const MARGIN = 60;
/** Bord droit de l'écriture. */
const RIGHT = 600;
const RULE = 'rgba(110, 130, 160, 0.28)';
const INK = '20, 20, 20';

/** Pages écrites (la suite du cahier attend, vide) ; la page du joueur ; les noms énormes, griffonnés. */
const WRITTEN = 41;
export const SCENARIO_PAGE = 15;
const GIANT_PAGES = [6, 11, 22, 29, 37];
const READING_THIS_PAGE = 33;

const lineY = (line: number): number => FIRST_LINE + line * LINE_STEP;

/** Écrit à la main sur la ligne `line` (le bas des lettres posé sur la ligne), un peu de travers. */
const scribble = (context: CanvasRenderingContext2D, text: string, x: number, line: number, size: number, random: () => number): void => {
  context.save();
  context.translate(x, lineY(line) - 5);
  context.rotate((random() - 0.5) * 0.02);
  context.font = `${size}px ${HAND}`;
  context.fillStyle = `rgba(${INK}, ${0.82 + random() * 0.15})`;
  context.textBaseline = 'alphabetic';
  // Une ligne trop longue se serre un peu plutôt que de sortir de la page.
  context.fillText(text, 0, 0, RIGHT - x);
  context.restore();
};

/**
 * Une page de noms, un par ligne ; parfois les circonstances, à la ligne, un peu en retrait (jamais deux
 * fois les mêmes sur une page). Page 33, le dernier nom est mort « en lisant ce cahier » : une seule fois.
 */
const names = (context: CanvasRenderingContext2D, page: number, random: () => number): void => {
  const { circumstances, readingThis } = messages().rareBooks.deathBook;
  const pool = [...circumstances];
  const draw = (): string => pool.splice(Math.floor(random() * pool.length), 1)[0] ?? circumstances[0];
  // La dernière page écrite s'arrête en chemin.
  const last = page === WRITTEN ? 5 + Math.floor(random() * 5) : LINES;
  const end = page === READING_THIS_PAGE ? last - 2 : last;
  for (let line = 0; line < end; line++) {
    scribble(context, deathName(random), MARGIN + random() * 8, line, 30, random);
    if (line + 1 < end && random() < 0.3) scribble(context, draw(), MARGIN + 50, ++line, 25, random);
  }
  if (end < last) {
    scribble(context, deathName(random), MARGIN + random() * 8, end, 30, random);
    scribble(context, readingThis, MARGIN + 50, end + 1, 25, random);
  }
};

/** Un seul nom, énorme, de travers, par-dessus les lignes, repassé trois ou quatre fois d'une main nerveuse. */
const giant = (context: CanvasRenderingContext2D, random: () => number): void => {
  // Prénom et nom, l'un sous l'autre : le nom prend toute la page.
  const lines = deathName(random).split(' ');
  context.save();
  context.font = `200px ${PEN_FONT}`;
  const size = Math.min(200, (200 * 520) / Math.max(...lines.map((line) => context.measureText(line).width)));
  context.font = `${size}px ${PEN_FONT}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.lineJoin = 'round';
  context.translate(PAGE_CENTER + (random() - 0.5) * 40, 400 + (random() - 0.5) * 120);
  context.rotate((random() - 0.5) * 0.7);
  const passes = 3 + Math.floor(random() * 2);
  for (let pass = 0; pass < passes; pass++) {
    context.save();
    context.translate((random() - 0.5) * 14, (random() - 0.5) * 10);
    context.rotate((random() - 0.5) * 0.05);
    context.fillStyle = `rgba(${INK}, ${0.55 + random() * 0.3})`;
    lines.forEach((line, index) => context.fillText(line, 0, (index - 0.5) * size * 0.85));
    context.strokeStyle = `rgba(${INK}, ${0.4 + random() * 0.3})`;
    context.lineWidth = 1 + random() * 2.5;
    lines.forEach((line, index) => context.strokeText(line, 0, (index - 0.5) * size * 0.85));
    context.restore();
  }
  context.restore();
};

/**
 * La page du joueur : ce qui lui arrive, phrase après phrase, son nom surligné comme une trouvaille.
 * Lignes droites (pas de travers) : le surlignage se pose exactement sur le nom.
 */
const scenario = (canvas: HTMLCanvasElement, context: CanvasRenderingContext2D, random: () => number): void => {
  const font = `31px ${HAND}`;
  const name = withReaderName('{name}');
  const found: PageFind[] = [];
  context.font = font;
  context.textBaseline = 'alphabetic';
  let line = 1;
  for (const sentence of messages().rareBooks.deathBook.scenario) {
    for (const part of wrap(context, withReaderName(sentence), 640 - 2 * MARGIN)) {
      const y = lineY(line++) - 5;
      let x = MARGIN;
      part.split(name).forEach((piece, index) => {
        if (index > 0) {
          found.push({ text: name, x, y });
          x += context.measureText(name).width;
        }
        context.fillStyle = `rgba(${INK}, ${0.82 + random() * 0.15})`;
        context.fillText(piece, x, y);
        x += context.measureText(piece).width;
      });
    }
    line++;
  }
  highlightFinds(canvas, context, found, font);
};

/**
 * Une page du DeathBook : du papier ligné, des listes de noms, quelques noms énormes, et à la page 15 le
 * joueur ; après la page 41, plus rien.
 */
export const paintDeathPage = (page: number, canvas: HTMLCanvasElement, spineOnLeft: boolean): void => {
  const context = preparePageTexture(canvas, spineOnLeft, DEATH_PAPER);
  context.fillStyle = RULE;
  for (let line = 0; line < LINES; line++) context.fillRect(40, lineY(line), 560, 1);
  if (page > WRITTEN) return;
  const random = seeded(hashText(`deathBook:${page}`));
  if (page === SCENARIO_PAGE) scenario(canvas, context, random);
  else if (GIANT_PAGES.includes(page)) giant(context, random);
  else names(context, page, random);
};

/** Les polices des pages : chargées avant le premier dessin. */
export const loadDeathFonts = (): Promise<unknown> =>
  Promise.all([document.fonts.load(`30px ${HAND}`), document.fonts.load(`60px ${PEN_FONT}`)]);
