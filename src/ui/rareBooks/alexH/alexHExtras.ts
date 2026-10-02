import { messages } from '../../../i18n';
import { hashText, seeded } from '../../../core/random';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGE_CENTER, wrap, write } from '../draw';
import { INK, ITALIC, MODERN, MONO } from './alexHCover';
import { diffLines } from './alexHCode';

/** Les pages hors récit : le cahier photo, les remerciements, l'index, « Du même auteur », l'achevé d'imprimer. */

const { width: WIDTH, height: HEIGHT } = PAGE_TEXTURE;
const SERIF = `Georgia, 'Times New Roman', serif`;

/** Le titre d'une page de fin, en capitales espacées, et son filet. */
const heading = (context: CanvasRenderingContext2D, text: string): void => {
  write(context, text.toUpperCase(), PAGE_CENTER, 110, { font: `500 18px ${MODERN}`, color: INK, spacing: 5 });
  context.fillStyle = INK;
  context.fillRect(PAGE_CENTER - 25, 150, 50, 1);
};

/**
 * Une « photo » du cahier : une capture d'éditeur (fond sombre, numéros de ligne, lignes retirées en rouge,
 * ajoutées en vert) dans un cadre blanc, et sa légende en italique dessous.
 */
export const photoPage = (context: CanvasRenderingContext2D, photo: number): void => {
  const random = seeded(hashText(`alexH:photo:${photo}`));
  const [left, top, width, height] = [64, 110, WIDTH - 128, 420];
  context.fillStyle = '#ffffff';
  context.fillRect(left - 10, top - 10, width + 20, height + 20);
  context.fillStyle = '#1e1f22';
  context.fillRect(left, top, width, height);
  const lines = diffLines(random, 17);
  lines.forEach(({ kind, text }, index) => {
    const y = top + 14 + index * 23;
    if (kind !== ' ') {
      context.fillStyle = kind === '-' ? 'rgba(220, 60, 50, 0.28)' : 'rgba(60, 190, 100, 0.25)';
      context.fillRect(left, y - 2, width, 22);
    }
    write(context, String(40 + index), left + 30, y, { font: `12px ${MONO}`, color: '#6c707a', align: 'right' });
    const color = kind === '-' ? '#ff8a80' : kind === '+' ? '#8be3a3' : '#c9ccd3';
    write(context, `${kind} ${text}`.slice(0, 52), left + 42, y, { font: `13px ${MONO}`, color, align: 'left' });
  });
  context.font = `italic 500 20px ${ITALIC}`;
  wrap(context, messages().rareBooks.alexH.captions[photo], width).forEach((line, index) =>
    write(context, line, PAGE_CENTER, top + height + 44 + index * 28, { font: context.font, color: INK }),
  );
};

/** Les remerciements : un paragraphe, centré dans la page. */
export const thanksPage = (context: CanvasRenderingContext2D): void => {
  const { thanksTitle, thanks } = messages().rareBooks.alexH;
  heading(context, thanksTitle);
  context.font = `19px ${SERIF}`;
  wrap(context, thanks, WIDTH - 160).forEach((line, index) =>
    write(context, line, PAGE_CENTER, 220 + index * 30, { font: context.font, color: INK }),
  );
};

/** L'index, sur deux colonnes : chaque mot, et ses pages (ou un renvoi qui n'aide pas). */
export const indexPage = (context: CanvasRenderingContext2D): void => {
  const { indexTitle, index } = messages().rareBooks.alexH;
  heading(context, indexTitle);
  const sorted = [...index].sort(([a], [b]) => a.localeCompare(b));
  const rows = Math.ceil(sorted.length / 2);
  sorted.forEach(([word, pages], position) => {
    const x = position < rows ? 70 : WIDTH / 2 + 10;
    const y = 200 + (position % rows) * 40;
    write(context, word, x, y, { font: `bold 15px ${SERIF}`, color: INK, align: 'left' });
    write(context, pages, x + 14, y + 18, { font: `italic 14px ${SERIF}`, color: '#555555', align: 'left' });
  });
};

/** « Du même auteur » : des titres, centrés. */
export const alsoPage = (context: CanvasRenderingContext2D): void => {
  const { alsoTitle, also } = messages().rareBooks.alexH;
  write(context, alsoTitle.toUpperCase(), PAGE_CENTER, 160, { font: `500 14px ${MODERN}`, color: INK, spacing: 4 });
  also.forEach((title, index) => write(context, title, PAGE_CENTER, 220 + index * 40, { font: `italic 20px ${SERIF}`, color: INK }));
};

/** L'achevé d'imprimer, en bas de la dernière page. */
export const colophonPage = (context: CanvasRenderingContext2D): void => {
  messages().rareBooks.alexH.colophon.forEach((line, index) =>
    write(context, line, PAGE_CENTER, HEIGHT - 260 + index * 26, { font: `14px ${SERIF}`, color: '#555555' }),
  );
};
