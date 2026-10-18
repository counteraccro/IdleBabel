import * as THREE from 'three';
import { messages } from '../../../i18n';
import { ROMAN, tomeIsbn } from '../../../data/sagaTomes';
import { PAGES_PER_BOOK } from '../../../systems/books';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { canvasTexture } from '../../book3d/textures';
import { canvas } from '../../book3d/leatherCover';
import { HEIGHT, PAGE_CENTER, SERIF, TITLE, WIDTH, write } from '../draw';
import { CLOTH_EDGE, SCRIPT } from './tomeCover';
import type { PageLink } from '../rareBookArt';

/**
 * Le standard des tomes de « L'histoire de Babel » (l'auteur, 18/10, maquette .ai/maquette-tome-standard.html, mesures
 * reprises de ses pages de 640 × 800) : des gardes aux hexagones dorés, puis, comme un vrai livre, le faux-titre (p. 1),
 * « Du même auteur » et les onze titres (p. 2 : on sait qu'il y en a d'autres), la page de titre (p. 3), les mentions
 * (p. 4 : « Tiré d'une histoire vraie »), la dédicace à quelqu'un du livre (p. 5), le sommaire (p. 6) ; en bas de la page
 * 410, la dernière, l'achevé d'imprimer. L'éditeur : les Éditions Quatre Cent Dix.
 */
export const INK = 'rgb(48, 38, 30)';
export const PALE = 'rgba(48, 38, 30, 0.36)';
const SOFT = 'rgba(48, 38, 30, 0.62)';
const W = PAGE_TEXTURE.width;
const H = PAGE_TEXTURE.height;
const C = PAGE_CENTER;
/** Le folio, en bas de page (470 sur la page de 500 de « Mon histoire vraie », .ai/maquette-faux-livre.html). */
export const FOLIO = (470 * H) / 500;

export const HALF_TITLE_PAGE = 1;
const SAME_AUTHOR_PAGE = 2;
const TITLE_PAGE = 3;
const MENTIONS_PAGE = 4;
const DEDICATION_PAGE = 5;
export const CONTENTS_PAGE = 6;

/** Un filet pâle, centré. */
const rule = (context: CanvasRenderingContext2D, y: number, width: number): void => {
  context.fillStyle = PALE;
  context.fillRect(C - width / 2, y, width, 1.5);
};

/** Un hexagone, pointe en haut, de rayon `r`, tracé. */
const hexagon = (context: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, width: number): void => {
  context.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    context.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
  }
  context.closePath();
  context.strokeStyle = color;
  context.lineWidth = width;
  context.stroke();
};

let endpaper: THREE.CanvasTexture | undefined;

/**
 * Les gardes, les mêmes pour toute la collection (piste A de la maquette) : la toile brune, semée d'hexagones dorés, fins.
 * Une seule texture pour les onze tomes, dessinée la première fois.
 */
export const tomeEndpaper = (): THREE.CanvasTexture => {
  if (endpaper) return endpaper;
  const [node, context] = canvas();
  const shade = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  shade.addColorStop(0, '#5b4a3a');
  shade.addColorStop(1, CLOTH_EDGE);
  context.fillStyle = shade;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  // Le motif de la maquette (rayon 26 sur une page de 640 de large), à la largeur du plat.
  const r = (26 * WIDTH) / W;
  const dx = r * Math.sqrt(3);
  const dy = r * 1.5;
  for (let row = -1; row * dy < HEIGHT + r; row++)
    for (let col = -1; col * dx < WIDTH + r; col++)
      hexagon(context, col * dx + (row % 2 ? dx / 2 : 0), row * dy, r * 0.82, 'rgba(222, 188, 112, 0.28)', (1.4 * WIDTH) / W);
  endpaper = canvasTexture(node);
  return endpaper;
};

const halfTitle = (context: CanvasRenderingContext2D, index: number): void =>
  write(context, messages().ui.endings.titles[index], C, 210, { font: `26px ${SERIF}`, color: INK, spacing: 1 });

const sameAuthor = (context: CanvasRenderingContext2D): void => {
  const { sameAuthor: heading, collection, titles } = messages().ui.endings;
  write(context, heading.toLocaleUpperCase(), C, 120, { font: `600 17px ${TITLE}`, color: SOFT, spacing: 4 });
  rule(context, 162, 40);
  write(context, collection.toLocaleUpperCase(), C, 196, { font: `400 15px ${TITLE}`, color: SOFT, spacing: 3 });
  titles.forEach((title, i) => {
    const y = 250 + i * 40;
    write(context, `${ROMAN[i]}.`, C - 150, y, { font: `19px ${SERIF}`, color: PALE, align: 'right' });
    write(context, title, C - 130, y, { font: `italic 21px ${SERIF}`, color: INK, align: 'left' });
  });
};

const titlePage = (context: CanvasRenderingContext2D, index: number): void => {
  const { author, titles, collection, tome, publisher } = messages().ui.endings;
  write(context, author.toLocaleUpperCase(), C, 120, { font: `400 22px ${TITLE}`, color: SOFT, spacing: 6 });
  write(context, titles[index], C, 270, { font: `46px ${SERIF}`, color: INK });
  rule(context, 350, 60);
  write(context, collection, C, 385, { font: `40px ${SCRIPT}`, color: INK });
  write(context, tome.replace('{n}', ROMAN[index]).toLocaleUpperCase(), C, 450, { font: `400 16px ${TITLE}`, color: SOFT, spacing: 4 });
  hexagon(context, C, H - 150, 9, PALE, 1.4);
  write(context, publisher.toLocaleUpperCase(), C, H - 120, { font: `500 14px ${TITLE}`, color: SOFT, spacing: 4 });
};

const mentions = (context: CanvasRenderingContext2D, index: number): void => {
  const { mention, author, publisher, legalDeposit } = messages().ui.endings;
  const lines = [mention, '', `© ${author}`, publisher, '', `ISBN ${tomeIsbn(index)}`, legalDeposit];
  lines.forEach((line, i) =>
    write(context, line, C, H - 360 + i * 30, { font: i ? `17px ${SERIF}` : `italic 19px ${SERIF}`, color: i ? SOFT : INK }),
  );
};

/** La dédicace du tome `index`, s'il en a une : false sinon (la page reste blanche). */
const dedication = (context: CanvasRenderingContext2D, index: number): boolean => {
  const text = messages().ui.endings.dedications[index];
  if (!text) return false;
  text.split('\n').forEach((line, i) => write(context, line, C, 220 + i * 34, { font: `italic 23px ${SERIF}`, color: INK }));
  return true;
};

/** Le sommaire : « Souvenir I » … et sa page, reliés par des points ; chaque ligne se clique (contentsLinks). */
const CONTENTS_TOP = 220;
const CONTENTS_STEP = 44;
const CONTENTS_LEFT = 130;
const CONTENTS_RIGHT = W - 130;

const contents = (context: CanvasRenderingContext2D, entries: readonly number[]): void => {
  const { contents: heading, memory } = messages().ui.endings;
  write(context, heading.toLocaleUpperCase(), C, 120, { font: `600 20px ${TITLE}`, color: SOFT, spacing: 5 });
  rule(context, 166, 40);
  entries.forEach((target, i) => {
    const y = CONTENTS_TOP + i * CONTENTS_STEP;
    const label = memory.replace('{n}', ROMAN[i]);
    const labelFont = `italic 22px ${SERIF}`;
    const pageFont = `20px ${SERIF}`;
    context.font = labelFont;
    const labelWidth = context.measureText(label).width;
    context.font = pageFont;
    const pageWidth = context.measureText(String(target)).width;
    write(context, label, CONTENTS_LEFT, y, { font: labelFont, color: INK, align: 'left' });
    write(context, String(target), CONTENTS_RIGHT, y, { font: pageFont, color: INK, align: 'right' });
    context.fillStyle = PALE;
    for (let x = CONTENTS_LEFT + labelWidth + 12; x < CONTENTS_RIGHT - pageWidth - 10; x += 9) context.fillRect(x, y + 17, 2, 2);
  });
};

/** Les lignes du sommaire, chacune mène à sa page. */
export const contentsLinks = (entries: readonly number[]): PageLink[] =>
  entries.map((target, i) => ({ y: CONTENTS_TOP + i * CONTENTS_STEP - 8, height: CONTENTS_STEP - 4, target }));

/** L'achevé d'imprimer, en bas de la dernière page (la 410, une page de gauche : rien ne vient après). */
export const colophon = (context: CanvasRenderingContext2D): void =>
  messages().ui.endings.colophon.forEach((line, i) =>
    write(context, line, C, FOLIO - 70 + i * 22, { font: `italic 16px ${SERIF}`, color: PALE }),
  );

/**
 * Les pages d'avant le texte du tome `index` (`entries` : les pages de son sommaire, aucune pour un tome encore vide) :
 * true si `page` en est une et qu'elle est dessinée.
 */
export const paintTomeFront = (context: CanvasRenderingContext2D, index: number, page: number, entries: readonly number[]): boolean => {
  if (page === HALF_TITLE_PAGE) halfTitle(context, index);
  else if (page === SAME_AUTHOR_PAGE) sameAuthor(context);
  else if (page === TITLE_PAGE) titlePage(context, index);
  else if (page === MENTIONS_PAGE) mentions(context, index);
  else if (page === DEDICATION_PAGE) return dedication(context, index);
  else if (page === CONTENTS_PAGE && entries.length > 0) contents(context, entries);
  else return false;
  return true;
};

/** Un tome encore vide : ses pages d'avant, et l'achevé d'imprimer à la dernière. */
export const paintEmptyTome = (context: CanvasRenderingContext2D, index: number, page: number): boolean => {
  if (page === PAGES_PER_BOOK) {
    colophon(context);
    return true;
  }
  return paintTomeFront(context, index, page, []);
};
