import { messages } from '../../../i18n';
import { hashText, seeded } from '../../../core/random';
import { LETTERS } from '../../../systems/babelText';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { BRIBE_PAGES } from '../../../data/trueStory';
import { PAGE_CENTER, SERIF, wrap, write } from '../draw';
import { CONTENTS_PAGE, FOLIO, INK, PALE, colophon, contentsLinks, paintTomeFront } from './tomePages';
import type { PageLink } from '../rareBookArt';

/**
 * Les pages de « Mon histoire vraie » (maquette .ai/maquette-faux-livre.html, mesures reprises de sa page de 370 × 500) :
 * du charabia pâle, comme dans tous les livres de la Bibliothèque, et sur sa page, chaque bribe remontée, en clair,
 * surlignée comme une trouvaille. La page 410 s'arrête après la sienne : « Fin du tome I », et le titre du tome 2 (l'auteur,
 * 17/10 ; d'abord « Pas celui-ci. » au crayon, gardé pour le tome 11), puis l'achevé d'imprimer. Avant le texte, les pages
 * de toute la collection (tomePages.ts). Le livre arrive entier, ses neuf bribes remontées (l'auteur, 18/10 : acheté
 * « tout d'un coup » au Nord-Est de la Rose des vents). On ne tourne jamais de charabia : le sommaire mène à chaque bribe,
 * et ‹ › d'une bribe à l'autre.
 */
const HIGHLIGHT = 'rgba(232, 196, 96, 0.38)';
/** De la page de la maquette (370 × 500) à la texture (640 × 800) : en largeur, et pour le reste. */
const KX = PAGE_TEXTURE.width / 370;
const K = PAGE_TEXTURE.height / 500;
const SIZE = 13 * K;
const LINE = 19 * K;
const LINES = 23;
const TOP = 34 * K;
const LEFT = 35 * KX;
const WIDTH = PAGE_TEXTURE.width - 70 * KX;

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

/** La bribe de la page `page`, ou -1. */
const bribeAt = (page: number): number => BRIBE_PAGES.indexOf(page as (typeof BRIBE_PAGES)[number]);
const LAST = BRIBE_PAGES.length - 1;

/** ‹ et › : vers la bribe d'avant, celle d'après, en bas de la page, de part et d'autre du folio. */
const ARROW_Y = FOLIO - 10;
const ARROW_W = 60;
/** Le bord de chaque flèche, en retrait : un lien de livre rare ne se prend pas dans les 10 % du bord (rareBook3d.ts). */
const ARROW_IN = 100;
const arrows = (index: number): { left?: number; right?: number } => ({
  left: index > 0 ? BRIBE_PAGES[index - 1] : undefined,
  right: index < LAST ? BRIBE_PAGES[index + 1] : undefined,
});

/** Une page : celles d'avant le texte, ou du charabia ; sur la page d'une bribe, ses lignes en clair, surlignées. */
export const paintTrueStoryPage = (context: CanvasRenderingContext2D, page: number): void => {
  if (paintTomeFront(context, 0, page, BRIBE_PAGES)) return;
  if (page < BRIBE_PAGES[0]) return;
  const index = bribeAt(page);
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
  if (last) {
    const { endOfTome, next } = messages().rareBooks.trueStory;
    write(context, endOfTome, PAGE_CENTER, TOP + (lines + 2) * LINE, { font: `italic ${SIZE}px ${SERIF}`, color: INK });
    write(context, next.replace('{title}', messages().ui.endings.titles[1]), PAGE_CENTER, TOP + (lines + 3.5) * LINE, {
      font: `${12 * K}px ${SERIF}`,
      color: PALE,
    });
    colophon(context);
  }
  write(context, String(page), PAGE_CENTER, FOLIO, { font: `${11 * K}px ${SERIF}`, color: PALE });
  if (index < 0) return;
  const { left, right } = arrows(index);
  const arrow = { font: `${34}px ${SERIF}`, color: INK };
  if (left !== undefined) write(context, '‹', ARROW_IN + ARROW_W / 2, ARROW_Y, arrow);
  if (right !== undefined) write(context, '›', PAGE_TEXTURE.width - ARROW_IN - ARROW_W / 2, ARROW_Y, arrow);
};

/** Les lignes du sommaire, et ‹ › sur la page d'une bribe. */
export const trueStoryLinks = (page: number): PageLink[] => {
  if (page === CONTENTS_PAGE) return contentsLinks(BRIBE_PAGES);
  const index = bribeAt(page);
  if (index < 0) return [];
  const { left, right } = arrows(index);
  const band = { y: ARROW_Y - 12, height: 56, width: ARROW_W };
  return [
    ...(left !== undefined ? [{ ...band, x: ARROW_IN, target: left }] : []),
    ...(right !== undefined ? [{ ...band, x: PAGE_TEXTURE.width - ARROW_IN - ARROW_W, target: right }] : []),
  ];
};
