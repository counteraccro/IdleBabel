import { messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { wrap, write } from '../draw';
import { INK, MODERN, MONO } from './alexHCover';

/** La page de la PR, dans le chapitre « La review » : une capture de forge, ses commentaires, le verdict. */

const { width: WIDTH } = PAGE_TEXTURE;
const LEFT = 56;
const RIGHT = WIDTH - 56;
/** Les bulles de commentaire, à droite des avatars. */
const BOX = LEFT + 46;
const BORDER = '#d0d7de';
const MUTED = '#59636e';
const GREEN = '#1f883d';
const RED = '#cf222e';
/** Une couleur d'avatar par auteur (tirée de son nom). */
const AVATARS = ['#8250df', '#bf3989', '#0969da', '#bc4c00', '#1a7f37'];

const avatar = (context: CanvasRenderingContext2D, name: string, x: number, y: number): void => {
  const color = AVATARS[[...name].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % AVATARS.length];
  context.fillStyle = color;
  context.beginPath();
  context.arc(x + 16, y + 16, 16, 0, Math.PI * 2);
  context.fill();
  write(context, name.charAt(0).toUpperCase(), x + 16, y + 6, { font: `900 16px ${MODERN}`, color: '#ffffff' });
};

/** Un rectangle aux coins arrondis, rempli puis cerné. */
const panel = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, fill: string): void => {
  context.beginPath();
  context.roundRect(x, y, width, height, 6);
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = BORDER;
  context.lineWidth = 1;
  context.stroke();
};

/** Un commentaire : l'avatar, l'en-tête gris (auteur, quand, la ligne visée), le texte ; renvoie son bas. */
const comment = (
  context: CanvasRenderingContext2D,
  { author, when, where, text }: { author: string; when: string; where?: string; text: string },
  top: number,
): number => {
  context.font = `15px ${MODERN}`;
  const lines = wrap(context, text, RIGHT - BOX - 28);
  const header = where ? 52 : 34;
  const height = header + 18 + lines.length * 22;
  avatar(context, author, LEFT, top);
  panel(context, BOX, top, RIGHT - BOX, height, '#ffffff');
  context.fillStyle = '#f6f8fa';
  context.fillRect(BOX + 1, top + 1, RIGHT - BOX - 2, header - 1);
  context.fillStyle = BORDER;
  context.fillRect(BOX, top + header, RIGHT - BOX, 1);
  context.font = `bold 14px ${MODERN}`;
  const authorWidth = context.measureText(author).width;
  write(context, author, BOX + 14, top + 9, { font: `bold 14px ${MODERN}`, color: INK, align: 'left' });
  write(context, when, BOX + 20 + authorWidth, top + 9, { font: `14px ${MODERN}`, color: MUTED, align: 'left' });
  if (where) write(context, where, BOX + 14, top + 29, { font: `12px ${MONO}`, color: MUTED, align: 'left' });
  lines.forEach((line, index) =>
    write(context, line, BOX + 14, top + header + 12 + index * 22, { font: `15px ${MODERN}`, color: INK, align: 'left' }),
  );
  return top + height + 22;
};

/** Le verdict : l'icône rouge des modifications demandées, la phrase, puis le mot de la fin dans sa bulle. */
const verdict = (context: CanvasRenderingContext2D, top: number): void => {
  const { verdict: sentence, verdictAt, verdictText } = messages().rareBooks.alexH.pr;
  context.fillStyle = RED;
  context.beginPath();
  context.arc(LEFT + 16, top + 14, 14, 0, Math.PI * 2);
  context.fill();
  // Un « ± » blanc, comme l'icône d'un diff.
  write(context, '±', LEFT + 16, top + 2, { font: `bold 18px ${MODERN}`, color: '#ffffff' });
  context.font = `bold 14px ${MODERN}`;
  write(context, sentence, BOX, top + 5, { font: context.font, color: INK, align: 'left' });
  write(context, verdictAt, BOX, top + 25, { font: `13px ${MODERN}`, color: MUTED, align: 'left' });
  panel(context, BOX, top + 52, RIGHT - BOX, 46, '#ffffff');
  write(context, verdictText, BOX + 14, top + 65, { font: `15px ${MODERN}`, color: INK, align: 'left' });
};

export const pullRequestPage = (context: CanvasRenderingContext2D): void => {
  const { title, number, status, meta, files, comments } = messages().rareBooks.alexH.pr;
  // Le titre et son numéro, en gris.
  context.font = `500 26px ${MODERN}`;
  const titleWidth = context.measureText(title).width;
  write(context, title, LEFT, 62, { font: context.font, color: INK, align: 'left' });
  write(context, number, LEFT + titleWidth + 10, 62, { font: `300 26px ${MODERN}`, color: MUTED, align: 'left' });
  // La pastille verte « ouverte », puis qui veut fusionner quoi.
  context.font = `500 14px ${MODERN}`;
  const pill = context.measureText(status).width + 28;
  context.beginPath();
  context.roundRect(LEFT, 108, pill, 30, 15);
  context.fillStyle = GREEN;
  context.fill();
  write(context, status, LEFT + pill / 2, 114, { font: context.font, color: '#ffffff' });
  write(context, meta, LEFT + pill + 12, 114, { font: `14px ${MODERN}`, color: MUTED, align: 'left' });
  // Les onglets, et le compte des lignes.
  context.fillStyle = BORDER;
  context.fillRect(LEFT, 166, RIGHT - LEFT, 1);
  write(context, files, LEFT, 178, { font: `13px ${MODERN}`, color: MUTED, align: 'left' });
  write(context, '+410', RIGHT - 52, 178, { font: `bold 13px ${MONO}`, color: GREEN, align: 'right' });
  write(context, '−0', RIGHT, 178, { font: `bold 13px ${MONO}`, color: RED, align: 'right' });
  let y = 222;
  for (const item of comments) y = comment(context, item, y);
  verdict(context, y);
};
