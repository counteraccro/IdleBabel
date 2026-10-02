import { messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGE_CENTER, wrap, write } from '../draw';
import { BODY_FACE, DISPLAY, INK, ROSE, SANS } from './orianaCover';
import { GREY, unbreakable } from './orianaProse';

/** Les pages hors récit : page de titre, mentions légales, dédicace, épigraphe, remerciements, « De la même autrice », achevé d'imprimer. */

const { width: WIDTH, height: HEIGHT } = PAGE_TEXTURE;

/** La page de titre : le nom, le sous-titre, un filet rose, le genre. */
export const titlePage = (context: CanvasRenderingContext2D): void => {
  const { subtitle, kind } = messages().rareBooks.oriana;
  write(context, 'ORIANA', PAGE_CENTER, 240, { font: `76px ${DISPLAY}`, color: INK });
  write(context, subtitle, PAGE_CENTER, 345, { font: `italic 30px ${DISPLAY}`, color: INK });
  context.fillStyle = ROSE;
  context.fillRect(PAGE_CENTER - 40, 420, 80, 2);
  write(context, kind.toUpperCase(), PAGE_CENTER, 455, { font: `500 14px ${SANS}`, color: GREY, spacing: 5 });
};

/** Les mentions légales, en petit, en bas à gauche. */
export const copyrightPage = (context: CanvasRenderingContext2D): void =>
  messages().rareBooks.oriana.copyright.forEach((line, index) =>
    write(context, unbreakable(line), 70, 470 + index * 22, { font: `13px ${SANS}`, color: GREY, align: 'left' }),
  );

export const dedicationPage = (context: CanvasRenderingContext2D): void =>
  messages().rareBooks.oriana.dedication.forEach((line, index) =>
    write(context, line, PAGE_CENTER, 240 + index * 34, { font: `italic 22px ${BODY_FACE}`, color: INK }),
  );

export const epigraphPage = (context: CanvasRenderingContext2D): void => {
  const { epigraph, epigraphSource } = messages().rareBooks.oriana;
  write(context, unbreakable(epigraph), PAGE_CENTER, 250, { font: `italic 30px ${DISPLAY}`, color: INK });
  write(context, `— ${epigraphSource}`, PAGE_CENTER, 305, { font: `14px ${SANS}`, color: GREY });
};

/** Le titre d'une page de fin, en capitales espacées, et son filet rose. */
const heading = (context: CanvasRenderingContext2D, text: string): void => {
  write(context, text.toUpperCase(), PAGE_CENTER, 110, { font: `500 18px ${SANS}`, color: INK, spacing: 5 });
  context.fillStyle = ROSE;
  context.fillRect(PAGE_CENTER - 25, 150, 50, 1);
};

/** Les remerciements : un paragraphe, centré dans la page. */
export const thanksPage = (context: CanvasRenderingContext2D): void => {
  const { thanksTitle, thanks } = messages().rareBooks.oriana;
  heading(context, thanksTitle);
  context.font = `17px ${BODY_FACE}`;
  wrap(context, unbreakable(thanks), WIDTH - 150).forEach((line, index) =>
    write(context, line, PAGE_CENTER, 210 + index * 29, { font: context.font, color: INK }),
  );
};

/** « De la même autrice » : des titres, centrés. */
export const alsoPage = (context: CanvasRenderingContext2D): void => {
  const { alsoTitle, also } = messages().rareBooks.oriana;
  write(context, alsoTitle.toUpperCase(), PAGE_CENTER, 160, { font: `500 14px ${SANS}`, color: INK, spacing: 4 });
  context.font = `italic 18px ${BODY_FACE}`;
  let y = 220;
  for (const title of also) {
    for (const line of wrap(context, title, WIDTH - 160)) {
      write(context, line, PAGE_CENTER, y, { font: context.font, color: INK });
      y += 26;
    }
    y += 16;
  }
};

/** L'achevé d'imprimer, en bas de la dernière page. */
export const colophonPage = (context: CanvasRenderingContext2D): void =>
  messages().rareBooks.oriana.colophon.forEach((line, index) =>
    write(context, line, PAGE_CENTER, HEIGHT - 260 + index * 26, { font: `14px ${BODY_FACE}`, color: '#555555' }),
  );
