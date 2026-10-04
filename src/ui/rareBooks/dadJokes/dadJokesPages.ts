import '@fontsource/caveat/600.css';
import '@fontsource/oswald/300.css';
import '@fontsource/oswald/400.css';
import { messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { HAND } from '../draw';
import { BLACK, RED, YELLOW } from './dadJokesCover';
import { CONDENSED, ROUND, burst, hexagon, loadDadJokesFonts, moustache, outlined, text } from './dadJokesDraw';
import { FIRST_JOKE_PAGE, LAST_PAGE, jokeOrder, pagesOf } from './dadJokesOrder';

/**
 * Les pages des Jokes de Papa (maquette .ai/maquette-jokes-papa-pages.html, piste B « la réponse en lettres de
 * couverture ») : papier blanc, le jaune, le rouge et le noir du plat. Page de titre, mentions, mode d'emploi,
 * puis une blague par page, numérotées de 1 à 407 (« + de 400 blagues ») : la question, une moustache, la
 * réponse en rouge dans les lettres rondes de la couverture. Mesures de la maquette (page 640 × 800, celle de
 * la texture).
 */

const W = PAGE_TEXTURE.width;
const H = PAGE_TEXTURE.height;
const C = W / 2;
const SOFT = '#7a7268';
const PAPER = '#f8f6f0';
const PENCIL = '#55555e';

/** La page où un lecteur venu avant a ri, puis barré son rire : la trouver est un secret (dadJokes.ts). */
export const LAUGH_PAGE = 25;

export const loadDadJokesPageFonts = (): Promise<unknown> =>
  Promise.all([
    loadDadJokesFonts(),
    ...['300 40px Oswald', 'italic 300 40px Oswald', '400 40px Oswald', '600 40px Caveat'].map((font) => document.fonts.load(font)),
  ]);

const texts = () => messages().rareBooks.dadJokes;

/** L'ordre des blagues et les pages de la chaise, par liste (une par langue). */
const orders = new WeakMap<readonly (readonly string[])[], { pages: Map<number, number>; chair: number[] }>();
const orderOf = (jokes: readonly (readonly string[])[]) => {
  let order = orders.get(jokes);
  if (!order) {
    // La dernière : celle qui cite des numéros de page (« Oui. Page 12. Et page 40… »).
    const last = jokes.findIndex(([, answer]) => /\b12\b/.test(answer));
    const pages = jokeOrder(jokes.length, last);
    order = { pages, chair: pagesOf(pages, 0, 3) };
    orders.set(jokes, order);
  }
  return order;
};

/** Lignes de `label` d'au plus `width` ; la ponctuation haute (« ? », « ! », « : », « » ») reste avec son mot. */
const wrap = (context: CanvasRenderingContext2D, label: string, font: string, width: number): string[] => {
  context.save();
  context.font = font;
  const lines: string[] = [];
  let line = '';
  for (const word of label
    .replace(/ ([?!:;»])/g, ' $1')
    .replace(/« /g, '« ')
    .split(' ')) {
    const tried = line ? `${line} ${word}` : word;
    if (line && context.measureText(tried).width > width) {
      lines.push(line);
      line = word;
    } else line = tried;
  }
  context.restore();
  return line ? [...lines, line] : lines;
};

/** Le bandeau jaune, le titre courant côté tranche et le folio dans une pastille jaune, en bas côté tranche. */
const frame = (context: CanvasRenderingContext2D, page: number): void => {
  const right = page % 2 === 1;
  const outer = right ? W - 62 : 62;
  context.fillStyle = YELLOW;
  context.fillRect(0, 0, W, 14);
  text(context, texts().pages.running, outer, 62, `20px ${ROUND}`, RED, right ? 'right' : 'left', 2);
  const folio = outer + (right ? -18 : 18);
  context.fillStyle = YELLOW;
  context.beginPath();
  context.arc(folio, H - 58, 24, 0, Math.PI * 2);
  context.fill();
  text(context, String(page), folio, H - 50, `22px ${ROUND}`, BLACK);
};

const titlePage = (context: CanvasRenderingContext2D): void => {
  const { title, pages, mark } = texts();
  context.fillStyle = YELLOW;
  context.fillRect(0, 0, W, 14);
  const [small, big, below] = title;
  outlined(context, small, C, 210, `${small.length > 6 ? 40 : 54}px ${ROUND}`, BLACK, BLACK, 1);
  context.save();
  context.translate(C, 340);
  context.rotate(-0.05);
  outlined(context, big, 0, 0, `150px ${ROUND}`, RED, BLACK, 14, BLACK, 6);
  context.restore();
  context.save();
  context.translate(C, 420);
  context.rotate(-0.05);
  outlined(context, below, 0, 0, `72px ${ROUND}`, YELLOW, BLACK, 12, BLACK, 6);
  context.restore();
  moustache(context, C, 530, 90, BLACK);
  text(context, pages.subtitle, C, 610, `italic 300 26px ${CONDENSED}`, SOFT);
  hexagon(context, C, 690, 18, 4, BLACK, BLACK);
  hexagon(context, C, 690, 8, 3, PAPER);
  text(context, mark.toUpperCase(), C, 740, `400 18px ${CONDENSED}`, SOFT, 'center', 6);
};

const legalPage = (context: CanvasRenderingContext2D): void => {
  let y = 380;
  texts().pages.legal.forEach((line, index) => {
    if (index === 0) text(context, line, 92, y, `500 20px ${CONDENSED}`, BLACK, 'left', 2);
    else text(context, line, 92, y, `300 19px ${CONDENSED}`, SOFT, 'left');
    y += 26;
  });
};

const howToPage = (context: CanvasRenderingContext2D): void => {
  const { howTo, steps } = texts().pages;
  frame(context, 3);
  text(context, howTo, C, 200, `44px ${ROUND}`, RED, 'center', 2);
  moustache(context, C, 250, 40, BLACK);
  let y = 340;
  steps.forEach((step, index) => {
    burst(context, 112, y - 10, 24, 10, YELLOW, 0.2);
    text(context, String(index + 1), 112, y, `26px ${ROUND}`, BLACK);
    for (const line of wrap(context, step, `400 27px ${CONDENSED}`, 400)) {
      text(context, line, 152, y, `400 27px ${CONDENSED}`, BLACK, 'left');
      y += 36;
    }
    y += 32;
  });
};

/** Le numéro de la blague, dans une pastille jaune cernée de noir, à peine penchée. */
const jokeNumber = (context: CanvasRenderingContext2D, page: number): void => {
  const label = `${texts().pages.number} ${page - FIRST_JOKE_PAGE + 1}`;
  context.save();
  context.font = `24px ${ROUND}`;
  context.letterSpacing = '2px';
  const width = context.measureText(label).width + 44;
  context.restore();
  context.save();
  context.translate(C, 168);
  context.rotate(-0.03);
  context.fillStyle = YELLOW;
  context.beginPath();
  context.roundRect(-width / 2, -24, width, 48, 24);
  context.fill();
  context.lineWidth = 4;
  context.strokeStyle = BLACK;
  context.stroke();
  text(context, label, 0, 9, `24px ${ROUND}`, BLACK, 'center', 2);
  context.restore();
};

/** Au crayon, sous la réponse (sa dernière ligne finit à `y`), le « ha ! » d'un lecteur venu avant, barré. */
const crossedLaugh = (context: CanvasRenderingContext2D, y: number): void => {
  context.save();
  context.translate(C + 140, y + 50);
  context.rotate(-0.12);
  context.globalAlpha = 0.8;
  text(context, texts().pages.ha, 0, 0, `600 64px ${HAND}`, PENCIL);
  context.strokeStyle = PENCIL;
  context.lineWidth = 4;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(-50, -16);
  context.quadraticCurveTo(0, -26, 52, -20);
  context.stroke();
  context.restore();
};

/** Une page de blague : le numéro, la question, la moustache, la réponse ; le bloc centré dans la page. */
const jokePage = (context: CanvasRenderingContext2D, page: number): void => {
  const { jokes } = texts();
  const { pages, chair } = orderOf(jokes);
  frame(context, page);
  jokeNumber(context, page);
  const [question, printed] = jokes[pages.get(page)!];
  // La dernière : ses numéros sont ceux des pages où la chaise est vraiment imprimée.
  let found = 0;
  const answer = page === LAST_PAGE ? printed.replace(/\d+/g, () => String(chair[found++] ?? '')) : printed;
  const questionFont = `500 42px ${CONDENSED}`;
  const answerFont = `38px ${ROUND}`;
  const questionLines = wrap(context, question, questionFont, 470);
  const answerLines = wrap(context, answer, answerFont, 470);
  const gap = 110;
  let y = 430 - (questionLines.length * 54 + gap + answerLines.length * 48) / 2 + 30;
  for (const line of questionLines) {
    text(context, line, C, y, questionFont, BLACK);
    y += 54;
  }
  moustache(context, C, y + gap / 2 - 30, 34, BLACK);
  y += gap - 10;
  for (const line of answerLines) {
    text(context, line, C, y, answerFont, RED, 'center', 1);
    y += 48;
  }
  if (page === LAUGH_PAGE) crossedLaugh(context, y);
};

export const paintDadJokesPage = (context: CanvasRenderingContext2D, page: number): void => {
  context.textBaseline = 'alphabetic';
  if (page === 1) titlePage(context);
  else if (page === 2) legalPage(context);
  else if (page === 3) howToPage(context);
  else if (page <= LAST_PAGE) jokePage(context, page);
};
