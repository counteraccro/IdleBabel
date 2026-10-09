import '@fontsource/caveat/600.css';
import { messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { HAND } from '../draw';
import { CHAPTERS, CHAPTER_FIRST, CHAPTER_PAGES, TERMS_FIRST, TRAPS, chapterStart } from '../../../systems/darkPatterns';
import { PAGES_PER_BOOK } from '../../../systems/books';
import {
  GREEN,
  GROTESK,
  PINK,
  SANS,
  SERIF,
  VIOLET,
  YELLOW,
  fit,
  gradient,
  hexagon,
  loadDarkPatternsFonts,
  random,
  roundRect,
  text,
} from './darkPatternsDraw';
import { paintExample } from './darkPatternsExamples';
import { INK, PAPER, SOFT, lines, paragraph } from './darkPatternsText';

/**
 * Les pages des « Dark patterns par l'exemple » (maquette .ai/maquette-dark-patterns-pages.html) : l'intérieur du
 * best-seller, papier blanc, titres en Space Grotesk, texte en Inter. Titre, mentions, préface (p. 3-4), sommaire
 * (le signet), mode d'emploi ; dix chapitres de quatre pages (ouverture en couleur, motif, exemple, exercice) ;
 * les conditions générales de lecture jusqu'à la p. 409 ; la sortie, p. 410. Mesures de la maquette (page 640 × 800,
 * celle de la texture).
 */

const W = PAGE_TEXTURE.width;
const H = PAGE_TEXTURE.height;
const LEFT = 62;
const TEXT_WIDTH = W - 2 * LEFT;
const FAINT = '#b9b5c0';

/** La page du sommaire, où est glissé le signet. */
export const CONTENTS_PAGE = 5;

export const loadDarkPatternsPageFonts = (): Promise<unknown> =>
  Promise.all([loadDarkPatternsFonts(), document.fonts.load(`600 40px Caveat`)]);

const texts = () => messages().rareBooks.darkPatterns.pages;

/** Le folio, en bas, côté tranche. */
const folio = (context: CanvasRenderingContext2D, page: number, color = SOFT): void => {
  const right = page % 2 === 1;
  text(context, String(page), right ? W - LEFT : LEFT, H - 40, `500 16px ${GROTESK}`, color, right ? 'right' : 'left');
};

/** Titre courant : le livre à gauche, le chapitre à droite, un filet rose. */
const runningHead = (context: CanvasRenderingContext2D, page: number, chapter: string): void => {
  const right = page % 2 === 1;
  text(
    context,
    right ? chapter.toUpperCase() : texts().running,
    right ? W - LEFT : LEFT,
    46,
    `500 12px ${GROTESK}`,
    SOFT,
    right ? 'right' : 'left',
    2,
  );
  context.fillStyle = PINK;
  context.fillRect(LEFT, 56, TEXT_WIDTH, 2);
};

/** Un intertitre en petites capitales espacées ; renvoie la ligne de base du texte qui suit. */
const heading = (context: CanvasRenderingContext2D, label: string, y: number, color = VIOLET): number => {
  text(context, label.toUpperCase(), LEFT, y, `700 15px ${GROTESK}`, color, 'left', 3);
  return y + 32;
};

/** Un grand titre de page (préface, sommaire, mode d'emploi), souligné de rose. */
const pageTitle = (context: CanvasRenderingContext2D, label: string): void => {
  text(context, label, LEFT, 150, `60px ${SERIF}`, VIOLET, 'left');
  context.fillStyle = PINK;
  context.fillRect(LEFT, 176, 60, 4);
};

const titlePage = (context: CanvasRenderingContext2D): void => {
  const book = messages().rareBooks.darkPatterns;
  context.fillStyle = gradient(context, 0, 0, W, 0);
  context.fillRect(0, 0, W, 14);
  text(context, book.title[0].toUpperCase(), W / 2, 250, `700 92px ${GROTESK}`, VIOLET, 'center', -3);
  text(context, book.title[1].toUpperCase(), W / 2, 340, `700 92px ${GROTESK}`, VIOLET, 'center', -3);
  text(context, book.title[2], W / 2, 410, `52px ${SERIF}`, PINK);
  // Le petit interrupteur de la couverture, déjà sur « oui ».
  roundRect(context, W / 2 - 46, 460, 92, 44, 22);
  context.fillStyle = GREEN;
  context.fill();
  context.beginPath();
  context.arc(W / 2 + 24, 482, 17, 0, Math.PI * 2);
  context.fillStyle = '#ffffff';
  context.fill();
  text(context, book.on, W / 2 - 22, 489, `700 18px ${GROTESK}`, '#ffffff');
  text(context, book.authors.toUpperCase(), W / 2, 590, `700 22px ${GROTESK}`, INK, 'center', 4);
  text(context, texts().edition, W / 2, 626, `italic 400 17px ${SANS}`, SOFT);
  hexagon(context, W / 2 - 104, 714, 12, 3, INK, INK);
  hexagon(context, W / 2 - 104, 714, 5, 2, PAPER);
  text(context, book.mark, W / 2 + 12, 720, `500 17px ${GROTESK}`, INK, 'center', 1);
};

const legalPage = (context: CanvasRenderingContext2D): void => {
  const { legal } = texts();
  let y = H - 90 - (legal.length - 1) * 21;
  legal.forEach((line, index) => {
    text(context, line, LEFT, y, `${index < 1 ? 600 : 400} 14px ${SANS}`, index < 3 ? INK : SOFT, 'left');
    y += 21;
  });
};

/** La préface de Tom : son début page 3, sous le titre ; sa fin page 4, et sa signature. */
const prefacePage = (context: CanvasRenderingContext2D, page: number): void => {
  const { preface, prefaceText, prefaceMore, prefaceBy } = texts();
  let y = 140;
  if (page === 3) {
    pageTitle(context, preface);
    y = 240;
  }
  const paragraphs = page === 3 ? prefaceText : prefaceMore;
  paragraphs.forEach((label, index) => {
    // La dernière phrase, en gras : « Il y en a toujours une. »
    const last = page === 4 && index === paragraphs.length - 1;
    y = paragraph(context, label, LEFT, y, TEXT_WIDTH, `${last ? 600 : 400} 19px ${SANS}`, 30, INK) + 16;
  });
  if (page === 4) {
    y += 20;
    text(context, prefaceBy[0], W - LEFT, y, `600 48px ${HAND}`, VIOLET, 'right');
    text(context, prefaceBy[1], W - LEFT, y + 30, `italic 400 15px ${SANS}`, SOFT, 'right');
  }
  folio(context, page);
};

const contentsPage = (context: CanvasRenderingContext2D): void => {
  const pages = texts();
  pageTitle(context, pages.contents);
  const entries: [string, string, number][] = [
    ['', pages.preface, 3],
    ['', pages.howTo, 6],
    ...pages.chapters.map((chapter, index): [string, string, number] => [
      String(index + 1).padStart(2, '0'),
      chapter.name,
      chapterStart(index),
    ]),
    ['', pages.terms, TERMS_FIRST],
    ['', pages.exit, PAGES_PER_BOOK],
  ];
  let y = 236;
  entries.forEach(([number, name, page], index) => {
    if (number) text(context, number, LEFT, y, `700 17px ${GROTESK}`, PINK, 'left');
    const x = LEFT + (number ? 40 : 0);
    const font = `${number ? 600 : 400} 17px ${SANS}`;
    text(context, name, x, y, font, INK, 'left');
    context.save();
    context.font = font;
    const end = x + context.measureText(name).width + 10;
    context.restore();
    context.fillStyle = FAINT;
    for (let dot = end; dot < W - LEFT - 44; dot += 9) context.fillRect(dot, y - 4, 2, 2);
    text(context, String(page), W - LEFT, y, `500 17px ${GROTESK}`, SOFT, 'right');
    y += number ? 34 : 38;
    // Un peu d'air après le mode d'emploi, et après le dernier chapitre.
    if (index === 1 || index === CHAPTERS + 1) y += 10;
  });
  folio(context, CONTENTS_PAGE);
};

const howToPage = (context: CanvasRenderingContext2D): void => {
  const { howTo, howToText } = texts();
  pageTitle(context, howTo);
  let y = 250;
  howToText.forEach((label, index) => {
    // La dernière : « Presque toujours. », en italique.
    const aside = index === howToText.length - 1;
    y = paragraph(context, label, LEFT, y, TEXT_WIDTH, `${aside ? 'italic 400' : '400'} 20px ${SANS}`, 31, aside ? SOFT : INK) + 18;
  });
  folio(context, 6);
};

/** L'ouverture d'un chapitre (page de droite) : le dégradé de la couverture, son numéro en grand, son nom. */
const openerPage = (context: CanvasRenderingContext2D, chapter: number): void => {
  const page = chapterStart(chapter);
  const { chapters, chapter: label } = texts();
  context.fillStyle = gradient(context, 0, 0, W * 0.4, H);
  context.fillRect(0, 0, W, H);
  const fold = context.createLinearGradient(0, 0, 60, 0);
  fold.addColorStop(0, 'rgba(20,0,30,0.35)');
  fold.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = fold;
  context.fillRect(0, 0, 60, H);
  text(context, label, LEFT, 150, `500 18px ${GROTESK}`, 'rgba(255,255,255,0.75)', 'left', 6);
  context.save();
  context.font = `700 260px ${GROTESK}`;
  context.lineWidth = 4;
  context.strokeStyle = 'rgba(255,255,255,0.85)';
  context.letterSpacing = '-8px';
  context.textBaseline = 'alphabetic';
  context.strokeText(String(chapter + 1).padStart(2, '0'), LEFT - 8, 400);
  context.restore();
  let y = 520;
  for (const line of lines(context, chapters[chapter].name, `700 54px ${GROTESK}`, TEXT_WIDTH)) {
    text(context, line, LEFT, y, `700 54px ${GROTESK}`, '#ffffff', 'left', -1);
    y += 60;
  }
  context.fillStyle = YELLOW;
  context.fillRect(LEFT, y - 26, 50, 5);
  text(context, chapters[chapter].real, LEFT, y + 22, `italic 400 22px ${SANS}`, 'rgba(255,255,255,0.85)', 'left');
  folio(context, page, 'rgba(255,255,255,0.7)');
};

/** Le motif, pourquoi il marche, et l'encadré jaune « À retenir ». */
const motifPage = (context: CanvasRenderingContext2D, chapter: number): void => {
  const page = chapterStart(chapter) + 1;
  const pages = texts();
  const { name, motif, why, keep } = pages.chapters[chapter];
  runningHead(context, page, name);
  let y = heading(context, pages.motif, 130);
  y = paragraph(context, motif, LEFT, y, TEXT_WIDTH, `400 19px ${SANS}`, 30, INK) + 30;
  y = heading(context, pages.why, y);
  y = paragraph(context, why, LEFT, y, TEXT_WIDTH, `400 19px ${SANS}`, 30, INK) + 34;
  const kept = lines(context, keep, `600 20px ${SANS}`, TEXT_WIDTH - 48);
  const height = 70 + kept.length * 30;
  context.fillStyle = '#fff6d0';
  context.fillRect(LEFT, y, TEXT_WIDTH, height);
  context.fillStyle = YELLOW;
  context.fillRect(LEFT, y, 6, height);
  text(context, pages.keep.toUpperCase(), LEFT + 24, y + 36, `700 13px ${GROTESK}`, '#a07a00', 'left', 3);
  kept.forEach((line, index) => text(context, line, LEFT + 24, y + 70 + index * 30, `600 20px ${SANS}`, INK, 'left'));
  folio(context, page);
};

/** L'exemple : une page web dessinée ; `foiled` : le piège déjoué, son tampon par-dessus. */
const examplePage = (context: CanvasRenderingContext2D, chapter: number, foiled: boolean): void => {
  const page = chapterStart(chapter) + 2;
  const pages = texts();
  runningHead(context, page, pages.chapters[chapter].name);
  const y = heading(context, pages.example, 130);
  paintExample(context, chapter, LEFT, y - 6, TEXT_WIDTH, 500);
  if (chapter < TRAPS) text(context, pages.interactive, LEFT, y + 530, `italic 400 14px ${SANS}`, SOFT, 'left');
  if (foiled) stamp(context, W / 2 + 60, 380, pages.stamp);
  folio(context, page);
};

/** Le tampon « Déjoué », un peu de travers, posé par-dessus l'exemple d'un piège déjoué. */
const stamp = (context: CanvasRenderingContext2D, x: number, y: number, label: string): void => {
  const red = '#e8392c';
  context.save();
  context.translate(x, y);
  context.rotate(-0.16);
  context.globalAlpha = 0.82;
  context.strokeStyle = red;
  context.lineWidth = 5;
  roundRect(context, -110, -40, 220, 80, 8);
  context.stroke();
  context.lineWidth = 2;
  roundRect(context, -102, -32, 204, 64, 5);
  context.stroke();
  const size = fit(context, label, GROTESK, 40, 180, 6);
  text(context, label, 0, size * 0.35, `700 ${size}px ${GROTESK}`, red, 'center', 6);
  context.restore();
};

/** L'exercice, et des lignes pour les notes du lecteur. */
const exercisePage = (context: CanvasRenderingContext2D, chapter: number): void => {
  const page = chapterStart(chapter) + 3;
  const pages = texts();
  runningHead(context, page, pages.chapters[chapter].name);
  let y = heading(context, pages.exercise, 130, PINK);
  y = paragraph(context, pages.chapters[chapter].exercise, LEFT, y, TEXT_WIDTH, `600 21px ${SANS}`, 31, INK) + 26;
  // La case à ne pas cocher (chapitre 9).
  if (chapter === 8) {
    context.strokeStyle = INK;
    context.lineWidth = 2;
    context.strokeRect(LEFT, y - 14, 26, 26);
    y += 40;
  }
  context.fillStyle = '#e4e1ea';
  for (let line = y + 20; line < H - 90; line += 38) context.fillRect(LEFT, line, TEXT_WIDTH, 1);
  text(context, pages.notes, LEFT, y, `500 13px ${GROTESK}`, FAINT, 'left', 2);
  // Le mot « sortie », minuscule, à toucher (chapitre 2).
  if (chapter === 1) text(context, pages.smallExit, W - LEFT - 2, H - 62, `400 7px ${SANS}`, FAINT, 'right');
  folio(context, page);
};

/** Les conditions générales de lecture : deux colonnes d'articles en petits caractères, tirés du numéro de la page. */
const termsPage = (context: CanvasRenderingContext2D, page: number): void => {
  const pages = texts();
  runningHead(context, page, pages.terms);
  const words = pages.termsWords.split(' ');
  const next = random(page * 7919);
  let article = 1 + (page - TERMS_FIRST) * 6;
  let y = 96;
  if (page === TERMS_FIRST) {
    text(context, pages.terms, LEFT, 140, `40px ${SERIF}`, VIOLET, 'left');
    y = 190;
  }
  const column = (TEXT_WIDTH - 24) / 2;
  for (const side of [0, 1]) {
    let line = y;
    const x = LEFT + side * (column + 24);
    while (line < H - 80) {
      text(context, `${pages.article} ${article++}.`, x, line, `700 9px ${SANS}`, INK, 'left');
      line += 13;
      const count = 30 + Math.floor(next() * 50);
      const body = Array.from({ length: count }, () => words[Math.floor(next() * words.length)]).join(' ') + '.';
      for (const row of lines(context, body[0].toUpperCase() + body.slice(1), `400 8.5px ${SANS}`, column)) {
        if (line > H - 80) break;
        text(context, row, x, line, `400 8.5px ${SANS}`, '#4a4752', 'left');
        line += 11.5;
      }
      line += 7;
    }
  }
  folio(context, page);
};

/** La sortie : la dernière page, une porte ouverte. */
const lastPage = (context: CanvasRenderingContext2D): void => {
  const { end, endSmall } = texts();
  let y = 330;
  end.forEach((line, index) => {
    text(context, line, W / 2, y, index ? `400 24px ${SANS}` : `34px ${SERIF}`, index ? INK : VIOLET);
    y += index ? 38 : 56;
  });
  context.strokeStyle = PINK;
  context.lineWidth = 4;
  context.lineJoin = 'round';
  context.strokeRect(W / 2 - 34, 520, 68, 110);
  context.beginPath();
  context.moveTo(W / 2 - 34, 520);
  context.lineTo(W / 2 - 4, 534);
  context.lineTo(W / 2 - 4, 642);
  context.lineTo(W / 2 - 34, 630);
  context.closePath();
  context.fillStyle = gradient(context, W / 2 - 34, 520, W / 2, 640);
  context.fill();
  context.stroke();
  text(context, endSmall, W / 2, 700, `italic 400 15px ${SANS}`, SOFT);
  folio(context, PAGES_PER_BOOK);
};

/** Dessine la page `page` ; `foiled(chapter)` : le piège de ce chapitre a été déjoué (son exemple porte le tampon). */
export const paintDarkPatternsPage = (context: CanvasRenderingContext2D, page: number, foiled: (chapter: number) => boolean): void => {
  context.textBaseline = 'alphabetic';
  if (page === 1) return titlePage(context);
  if (page === 2) return legalPage(context);
  if (page === 3 || page === 4) return prefacePage(context, page);
  if (page === CONTENTS_PAGE) return contentsPage(context);
  if (page === 6) return howToPage(context);
  if (page < TERMS_FIRST) {
    const chapter = Math.floor((page - CHAPTER_FIRST) / CHAPTER_PAGES);
    const step = (page - CHAPTER_FIRST) % CHAPTER_PAGES;
    if (step === 0) return openerPage(context, chapter);
    if (step === 1) return motifPage(context, chapter);
    if (step === 2) return examplePage(context, chapter, foiled(chapter));
    return exercisePage(context, chapter);
  }
  if (page < PAGES_PER_BOOK) return termsPage(context, page);
  if (page === PAGES_PER_BOOK) lastPage(context);
};
