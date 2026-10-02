import '@fontsource/inter/300.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/900.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/700.css';
import '@fontsource/playfair-display/500-italic.css';
import { messages } from '../../../i18n';
import { CQW, HEIGHT, WIDTH, board, wrap, write } from '../draw';
import type * as THREE from 'three';

/** Papier crème mat d'un essai à succès, et ses encres : le noir du titre, le rouge et le vert d'un diff. */
export const CREAM = '#f1ece2';
export const CREAM_EDGE = '#e4ddcf';
export const INK = '#111111';
const GREY = '#777777';
const RED = '#b3261e';
const RED_BG = '#f8d7d5';
const GREEN = '#1d7a3a';
const GREEN_BG = '#d3f0d9';
export const MODERN = "'Inter', 'Helvetica Neue', Arial, sans-serif";
export const MONO = "'JetBrains Mono', Menlo, monospace";
export const ITALIC = "'Playfair Display', Georgia, serif";

/** Les polices de la couverture : chargées avant de la dessiner. */
export const loadAlexHFonts = (): Promise<unknown> =>
  Promise.all([
    ...[300, 500, 900].map((weight) => document.fonts.load(`${weight} 40px ${MODERN}`)),
    ...[400, 700].map((weight) => document.fonts.load(`${weight} 40px ${MONO}`)),
    document.fonts.load(`italic 500 40px ${ITALIC}`),
  ]);

/** Une ligne de diff sur toute la largeur : son fond, son signe, ses mots (barrés : la ligne retirée). */
const diffLine = (context: CanvasRenderingContext2D, top: number, sign: string, words: string, removed: boolean): void => {
  const [ink, background] = removed ? [RED, RED_BG] : [GREEN, GREEN_BG];
  context.fillStyle = background;
  context.fillRect(5 * CQW, top, 90 * CQW, 15.5 * CQW);
  write(context, sign, 9 * CQW, top + 2.5 * CQW, { font: `700 ${11 * CQW}px ${MONO}`, color: ink, align: 'left' });
  // Les mots, à la largeur de la bande au plus.
  context.font = `900 ${12 * CQW}px ${MODERN}`;
  const size = Math.min(12 * CQW, (12 * CQW * 70 * CQW) / context.measureText(words).width);
  write(context, words, 19 * CQW, top + (15.5 * CQW - size * 1.2) / 2, {
    font: `900 ${size}px ${MODERN}`,
    color: ink,
    align: 'left',
    spacing: -0.25 * CQW,
  });
  if (!removed) return;
  context.font = `900 ${size}px ${MODERN}`;
  context.fillStyle = ink;
  context.fillRect(19 * CQW, top + 7.2 * CQW, context.measureText(words).width, 0.9 * CQW);
};

/** La couverture, toute en lettres : le nom, puis le titre écrit comme un diff (une ligne retirée, deux ajoutées). */
export const alexHFront = (): THREE.CanvasTexture =>
  board(CREAM, CREAM_EDGE, (context) => {
    const { removed, added, kind, stat } = messages().rareBooks.alexH;
    write(context, 'ALEXH', 9 * CQW, 6 * CQW, { font: `900 ${15 * CQW}px ${MODERN}`, color: INK, align: 'left', spacing: -0.4 * CQW });
    context.fillStyle = INK;
    context.fillRect(9 * CQW, 25.5 * CQW, 82 * CQW, 0.75 * CQW);
    diffLine(context, 38.5 * CQW, '−', removed, true);
    added.forEach((words, index) => diffLine(context, (58.5 + index * 20) * CQW, '+', words, false));
    write(context, kind, 9 * CQW, 106 * CQW, { font: `italic 500 ${5.8 * CQW}px ${ITALIC}`, color: '#333333', align: 'left' });
    write(context, stat, 9 * CQW, 115 * CQW, { font: `400 ${3 * CQW}px ${MONO}`, color: GREY, align: 'left' });
  });

/** Un faux code-barres, en bas à droite, et son numéro (qui finit en 410). */
const barcode = (context: CanvasRenderingContext2D, x: number, y: number): void => {
  context.fillStyle = '#ffffff';
  context.fillRect(x, y, 29 * CQW, 17 * CQW);
  context.fillStyle = INK;
  let bar = x + 2 * CQW;
  for (let index = 0; index < 46; index++) {
    const width = [0.25, 0.4, 0.6][(index * 7) % 3] * CQW;
    if (index % 2 === 0) context.fillRect(bar, y + 2 * CQW, width, 11 * CQW);
    bar += width + 0.12 * CQW;
  }
  write(context, '978-0-1941-0410', x + 14.5 * CQW, y + 13.6 * CQW, { font: `400 ${1.9 * CQW}px ${MONO}`, color: INK });
};

/** Le plat arrière : les critiques de presse, le résumé, le code-barres. */
export const alexHBack = (): THREE.CanvasTexture =>
  board(CREAM, CREAM_EDGE, (context) => {
    const { quotes, blurb } = messages().rareBooks.alexH;
    // Les critiques, l'une sous l'autre (sur deux lignes si besoin), puis un filet et le résumé.
    let y = 7 * CQW;
    for (const [quote, source] of quotes) {
      const font = `italic 500 ${4.4 * CQW}px ${ITALIC}`;
      context.font = font;
      for (const line of wrap(context, quote, 80 * CQW)) {
        write(context, line, WIDTH / 2, y, { font, color: INK });
        y += 5.6 * CQW;
      }
      write(context, source.toUpperCase(), WIDTH / 2, y + 1.4 * CQW, {
        font: `500 ${2.4 * CQW}px ${MODERN}`,
        color: RED,
        spacing: 0.4 * CQW,
      });
      y += 10 * CQW;
    }
    context.fillStyle = INK;
    context.fillRect(12 * CQW, y, 76 * CQW, 0.3 * CQW);
    context.font = `300 ${3.1 * CQW}px ${MODERN}`;
    wrap(context, blurb, 76 * CQW).forEach((line, index) =>
      write(context, line, WIDTH / 2, y + (4 + index * 4.6) * CQW, { font: context.font, color: '#333333' }),
    );
    // Le résumé d'un diff, en bas à gauche, comme une signature d'éditeur.
    write(context, '+410', 9 * CQW, 108 * CQW, { font: `700 ${4 * CQW}px ${MONO}`, color: GREEN, align: 'left' });
    write(context, '−0', 9 * CQW, 114 * CQW, { font: `700 ${4 * CQW}px ${MONO}`, color: RED, align: 'left' });
    barcode(context, 62 * CQW, 102 * CQW);
  });

/**
 * Le dos : le nom et le titre couchés dans la longueur, un petit « +/− » de diff en bas. La peau du dos est
 * tendue sur un dos étroit (`thickness`, la hauteur du livre faisant 1) : le dessin y est élargi d'autant.
 */
export const alexHSpine = (thickness: number): THREE.CanvasTexture =>
  board(CREAM, CREAM_EDGE, (context) => {
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const { cover } = messages().rareBooks.alexH;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch, 1);
    context.fillStyle = GREEN_BG;
    context.fillRect(-4 * CQW, 104 * CQW, 8 * CQW, 5 * CQW);
    context.fillStyle = RED_BG;
    context.fillRect(-4 * CQW, 110 * CQW, 8 * CQW, 5 * CQW);
    write(context, '+', 0, 104.4 * CQW, { font: `700 ${3.6 * CQW}px ${MONO}`, color: GREEN });
    write(context, '−', 0, 110.4 * CQW, { font: `700 ${3.6 * CQW}px ${MONO}`, color: RED });
    context.translate(0, 8 * CQW);
    context.rotate(Math.PI / 2);
    context.textBaseline = 'middle';
    context.fillStyle = INK;
    context.font = `900 ${8 * CQW}px ${MODERN}`;
    context.fillText('ALEXH', 0, 0);
    const nameWidth = context.measureText('ALEXH').width;
    context.font = `300 ${5 * CQW}px ${MODERN}`;
    context.fillText(cover[1], nameWidth + 4 * CQW, 0);
    context.restore();
  });
