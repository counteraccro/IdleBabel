import { messages } from '../../../i18n';
import { hashText, seeded } from '../../../core/random';
import { LETTERS } from '../../../systems/babelText';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { BRIBE_PAGES } from '../../../data/trueStory';
import { HAND, PAGE_CENTER, SERIF, wrap, write } from '../draw';
import type { PageLink } from '../rareBookArt';

/**
 * Les pages de « Mon histoire vraie » (maquette .ai/maquette-faux-livre.html, mesures reprises de sa page de 370 × 500) :
 * du charabia pâle, comme dans tous les livres de la Bibliothèque, et sur sa page, chaque bribe remontée, en clair,
 * surlignée comme une trouvaille. La page 410 s'arrête après la sienne, et quelqu'un y a écrit au crayon. On ne tourne
 * jamais de charabia : la page de titre mène à chaque bribe, et ‹ › d'une bribe à l'autre.
 */
const INK = 'rgb(48, 38, 30)';
const PALE = 'rgba(48, 38, 30, 0.36)';
const HIGHLIGHT = 'rgba(232, 196, 96, 0.38)';
const PENCIL = 'rgba(80, 70, 62, 0.78)';
/** De la page de la maquette (370 × 500) à la texture (640 × 800) : en largeur, et pour le reste. */
const KX = PAGE_TEXTURE.width / 370;
const K = PAGE_TEXTURE.height / 500;
const SIZE = 13 * K;
const LINE = 19 * K;
const LINES = 23;
const TOP = 34 * K;
const LEFT = 35 * KX;
const WIDTH = PAGE_TEXTURE.width - 70 * KX;
const FOLIO = 470 * K;

/** Du charabia : des mots de une à neuf lettres, parfois une virgule ou un point (toujours les mêmes pour une page). */
const gibberish = (page: number, count: number): string[] => {
  const random = seeded(hashText(`trueStory:${page}`));
  return Array.from({ length: count }, () => {
    let word = '';
    const length = 1 + Math.floor(random() * 9);
    for (let i = 0; i < length; i++) word += LETTERS[Math.floor(random() * LETTERS.length)];
    return random() < 0.08 ? word + (random() < 0.5 ? ',' : '.') : word;
  });
};

/** La bribe de la page `page`, si elle est remontée (`count` : les bribes remontées). */
const bribeAt = (page: number, count: number): number => {
  const index = BRIBE_PAGES.indexOf(page as (typeof BRIBE_PAGES)[number]);
  return index >= 0 && index < count ? index : -1;
};
const LAST = BRIBE_PAGES.length - 1;

/** La page de titre, et ses signets : chaque bribe remontée, un clic y mène. */
const TITLE_PAGE = 1;
const MARKS_TOP = 330;
const MARKS_STEP = 44;

const titlePage = (context: CanvasRenderingContext2D, count: number): void => {
  const { name, page } = messages().rareBooks.trueStory;
  write(context, name, PAGE_CENTER, 170, { font: `44px ${SERIF}`, color: INK });
  context.fillStyle = PALE;
  context.fillRect(PAGE_CENTER - 30, 250, 60, 1.5);
  BRIBE_PAGES.slice(0, count).forEach((target, index) =>
    write(context, page.replace('{n}', String(target)), PAGE_CENTER, MARKS_TOP + index * MARKS_STEP, {
      font: `italic 24px ${SERIF}`,
      color: INK,
    }),
  );
};

/** ‹ et › : vers la bribe d'avant, celle d'après (si elle est remontée), en bas de la page, de part et d'autre du folio. */
const ARROW_Y = FOLIO - 10;
const ARROW_W = 60;
/** Le bord de chaque flèche, en retrait : un lien de livre rare ne se prend pas dans les 10 % du bord (rareBook3d.ts). */
const ARROW_IN = 100;
const arrows = (index: number, count: number): { left?: number; right?: number } => ({
  left: index > 0 ? BRIBE_PAGES[index - 1] : undefined,
  right: index + 1 < count ? BRIBE_PAGES[index + 1] : undefined,
});

/** Une page : du charabia ; sur la page d'une bribe remontée, ses lignes en clair, surlignées. */
export const paintTrueStoryPage = (context: CanvasRenderingContext2D, page: number, count: number): void => {
  if (page === TITLE_PAGE) return titlePage(context, count);
  const index = bribeAt(page, count);
  const last = index === LAST;
  context.font = `${SIZE}px ${SERIF}`;
  const filler = wrap(context, gibberish(page, 400).join(' '), WIDTH);
  const clear = index >= 0 ? wrap(context, messages().rareBooks.trueStory.bribes[index], WIDTH) : [];
  const from = index < 0 ? LINES : last ? 9 : 7 + (page % 6);
  const lines = last ? from + clear.length : LINES;
  for (let i = 0, f = 0; i < lines; i++) {
    const y = TOP + i * LINE;
    if (i >= from && i < from + clear.length) {
      const text = clear[i - from];
      context.font = `${SIZE}px ${SERIF}`;
      context.fillStyle = HIGHLIGHT;
      context.fillRect(LEFT - 3 * KX, y + K, context.measureText(text).width + 6 * KX, LINE - 2 * K);
      write(context, text, LEFT, y, { font: `${SIZE}px ${SERIF}`, color: INK, align: 'left' });
    } else write(context, filler[f++] ?? '', LEFT, y, { font: `${SIZE}px ${SERIF}`, color: PALE, align: 'left' });
  }
  if (last)
    write(context, messages().rareBooks.trueStory.pencil, PAGE_TEXTURE.width - 40 * KX, TOP + (lines + 2) * LINE, {
      font: `${24 * K}px ${HAND}`,
      color: PENCIL,
      align: 'right',
    });
  write(context, String(page), PAGE_CENTER, FOLIO, { font: `${11 * K}px ${SERIF}`, color: PALE });
  if (index < 0) return;
  const { left, right } = arrows(index, count);
  const arrow = { font: `${34}px ${SERIF}`, color: INK };
  if (left !== undefined) write(context, '‹', ARROW_IN + ARROW_W / 2, ARROW_Y, arrow);
  if (right !== undefined) write(context, '›', PAGE_TEXTURE.width - ARROW_IN - ARROW_W / 2, ARROW_Y, arrow);
};

/** Les signets de la page de titre, et ‹ › sur la page d'une bribe. */
export const trueStoryLinks = (page: number, count: number): PageLink[] => {
  if (page === TITLE_PAGE)
    return BRIBE_PAGES.slice(0, count).map((target, index) => ({
      y: MARKS_TOP + index * MARKS_STEP - 8,
      height: MARKS_STEP - 4,
      target,
    }));
  const index = bribeAt(page, count);
  if (index < 0) return [];
  const { left, right } = arrows(index, count);
  const band = { y: ARROW_Y - 12, height: 56, width: ARROW_W };
  return [
    ...(left !== undefined ? [{ ...band, x: ARROW_IN, target: left }] : []),
    ...(right !== undefined ? [{ ...band, x: PAGE_TEXTURE.width - ARROW_IN - ARROW_W, target: right }] : []),
  ];
};
