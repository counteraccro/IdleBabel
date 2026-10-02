import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource/libre-baskerville/400.css';
import '@fontsource/libre-baskerville/400-italic.css';
import '@fontsource/space-mono/400.css';
import '@fontsource/space-mono/700.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/500.css';
import '@fontsource/caveat/400.css';
import { messages } from '../../../i18n';
import { hashText, seeded } from '../../../core/random';
import { CQW, HEIGHT, HAND, WIDTH, board, wrap, write } from '../draw';
import type * as THREE from 'three';

/** Le crème des mémoires, l'encre des pages, les couleurs du couchant. */
export const CREAM = '#f3e9dc';
export const CREAM_EDGE = '#e6d8c6';
export const INK = '#1f1a1c';
export const ROSE = '#c8687a';
const LIGHT = '#fff3e6';
const PEACH = '#ffe2c4';
const DUSK = '#e9c9b0';
const NIGHT = '#1f1a26';
export const DISPLAY = "'DM Serif Display', Georgia, serif";
export const BODY_FACE = "'Libre Baskerville', Georgia, serif";
export const SANS = "'Inter', 'Helvetica Neue', Arial, sans-serif";
export const MONO = "'Space Mono', Menlo, monospace";
export { HAND };

/** Les polices du livre : chargées avant de dessiner la couverture (les pages viennent après). */
export const loadOrianaFonts = (): Promise<unknown> =>
  Promise.all([
    document.fonts.load(`40px ${DISPLAY}`),
    document.fonts.load(`italic 40px ${DISPLAY}`),
    document.fonts.load(`40px ${BODY_FACE}`),
    document.fonts.load(`italic 40px ${BODY_FACE}`),
    ...[400, 700].map((weight) => document.fonts.load(`${weight} 40px ${MONO}`)),
    ...[300, 500].map((weight) => document.fonts.load(`${weight} 40px ${SANS}`)),
    document.fonts.load(`40px ${HAND}`),
  ]);

/** Le ciel du couchant, de haut en bas, et la ligne d'horizon (aux 69 % de la hauteur). */
const HORIZON = 0.69;
const sky = (context: CanvasRenderingContext2D, height: number): void => {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#2c3e66');
  gradient.addColorStop(0.45, ROSE);
  gradient.addColorStop(HORIZON - 0.01, '#f2a65a');
  gradient.addColorStop(HORIZON, '#3a2c3c');
  gradient.addColorStop(1, NIGHT);
  context.fillStyle = gradient;
  context.fillRect(-WIDTH, 0, WIDTH * 3, height);
};

/** Une petite chaîne de blocs : des carrés reliés, posés sur l'horizon comme un train. */
const chain = (context: CanvasRenderingContext2D, x: number, y: number, size: number, count: number, gap: number): void => {
  context.strokeStyle = 'rgba(30, 22, 34, 0.95)';
  context.lineWidth = size * 0.12;
  for (let index = 0; index < count; index++) {
    const left = x + index * (size + gap);
    context.strokeRect(left, y, size, size);
    if (index === count - 1) continue;
    context.beginPath();
    context.moveTo(left + size, y + size / 2);
    context.lineTo(left + size + gap, y + size / 2);
    context.stroke();
  }
};

/**
 * La couverture : des mémoires de voyage. Un couchant vers l'ouest, la traînée d'un avion, une chaîne de blocs
 * sur l'horizon ; le nom en grand, le sous-titre, « Biographie » en bas.
 */
export const orianaFront = (): THREE.CanvasTexture =>
  board(NIGHT, NIGHT, (context) => {
    const { subtitle, kind } = messages().rareBooks.oriana;
    sky(context, HEIGHT);
    // Le soleil, à moitié couché.
    const horizon = HORIZON * HEIGHT;
    const sun = context.createRadialGradient(0.68 * WIDTH, horizon, 1.5 * CQW, 0.68 * WIDTH, horizon, 18.75 * CQW);
    sun.addColorStop(0, 'rgba(255, 230, 170, 1)');
    sun.addColorStop(0.4, 'rgba(255, 200, 120, 0.8)');
    sun.addColorStop(1, 'rgba(255, 180, 100, 0)');
    context.fillStyle = sun;
    context.fillRect(0, horizon - 27 * CQW, WIDTH, 27 * CQW);
    // La traînée de l'avion, vers l'ouest… enfin, vers la droite.
    context.strokeStyle = 'rgba(255, 240, 225, 0.7)';
    context.lineWidth = 0.45 * CQW;
    context.beginPath();
    context.moveTo(9.4 * CQW, 65.6 * CQW);
    context.quadraticCurveTo(46.9 * CQW, 51.6 * CQW, 87.5 * CQW, 46.9 * CQW);
    context.stroke();
    context.fillStyle = LIGHT;
    context.beginPath();
    context.arc(87.8 * CQW, 46.8 * CQW, 0.65 * CQW, 0, Math.PI * 2);
    context.fill();
    chain(context, 10.9 * CQW, horizon - 3.75 * CQW, 3.44 * CQW, 9, 2.19 * CQW);
    write(context, 'ORIANA', WIDTH / 2, 9 * CQW, { font: `${18.4 * CQW}px ${DISPLAY}`, color: LIGHT });
    write(context, subtitle, WIDTH / 2, 28.6 * CQW, { font: `italic ${5.3 * CQW}px ${DISPLAY}`, color: PEACH });
    write(context, kind.toUpperCase(), WIDTH / 2, 109.5 * CQW, {
      font: `500 ${2.8 * CQW}px ${SANS}`,
      color: DUSK,
      spacing: 1.4 * CQW,
    });
  });

/** Un faux code-barres, en bas à droite, et son numéro (qui finit en 410). */
const barcode = (context: CanvasRenderingContext2D, x: number, y: number): void => {
  context.fillStyle = '#ffffff';
  context.fillRect(x, y, 29 * CQW, 17 * CQW);
  context.fillStyle = INK;
  let bar = x + 2 * CQW;
  for (let index = 0; index < 46; index++) {
    const width = [0.6, 0.25, 0.4][(index * 5) % 3] * CQW;
    if (index % 2 === 0) context.fillRect(bar, y + 2 * CQW, width, 11 * CQW);
    bar += width + 0.12 * CQW;
  }
  write(context, '978-2-0410-0001', x + 14.5 * CQW, y + 13.6 * CQW, { font: `${1.9 * CQW}px ${MONO}`, color: INK });
};

/** Le plat arrière : la nuit qui suit le couchant, des étoiles, les critiques, le résumé, le code-barres. */
export const orianaBack = (): THREE.CanvasTexture =>
  board(NIGHT, NIGHT, (context) => {
    const { quotes, blurb } = messages().rareBooks.oriana;
    const night = context.createLinearGradient(0, 0, 0, HEIGHT);
    night.addColorStop(0, '#121327');
    night.addColorStop(0.75, '#2a2848');
    night.addColorStop(1, NIGHT);
    context.fillStyle = night;
    context.fillRect(0, 0, WIDTH, HEIGHT);
    const random = seeded(hashText('oriana:stars'));
    for (let index = 0; index < 140; index++) {
      context.fillStyle = `rgba(255, 243, 230, ${0.2 + random() * 0.6})`;
      context.beginPath();
      context.arc(random() * WIDTH, random() * HEIGHT * 0.8, (0.1 + random() * 0.25) * CQW, 0, Math.PI * 2);
      context.fill();
    }
    let y = 7 * CQW;
    for (const [quote, source] of quotes) {
      const font = `italic ${4 * CQW}px ${DISPLAY}`;
      context.font = font;
      for (const line of wrap(context, quote, 78 * CQW)) {
        write(context, line, WIDTH / 2, y, { font, color: LIGHT });
        y += 5 * CQW;
      }
      write(context, source.toUpperCase(), WIDTH / 2, y + 1 * CQW, {
        font: `500 ${2.3 * CQW}px ${SANS}`,
        color: '#f2a65a',
        spacing: 0.4 * CQW,
      });
      y += 7.5 * CQW;
    }
    context.fillStyle = 'rgba(255, 243, 230, 0.5)';
    context.fillRect(30 * CQW, y, 40 * CQW, 0.25 * CQW);
    context.font = `300 ${3 * CQW}px ${SANS}`;
    wrap(context, blurb, 76 * CQW).forEach((line, index) =>
      write(context, line, WIDTH / 2, y + (4 + index * 4.5) * CQW, { font: context.font, color: '#e9dccb' }),
    );
    barcode(context, 62 * CQW, 102 * CQW);
  });

/**
 * Le dos : le même couchant, le nom et le sous-titre couchés dans la longueur. La peau du dos est tendue sur
 * un dos étroit (`thickness`, la hauteur du livre faisant 1) : le dessin y est élargi d'autant.
 */
export const orianaSpine = (thickness: number): THREE.CanvasTexture =>
  board(NIGHT, NIGHT, (context) => {
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const { subtitle } = messages().rareBooks.oriana;
    sky(context, HEIGHT);
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch, 1);
    context.translate(0, 8 * CQW);
    context.rotate(Math.PI / 2);
    context.textBaseline = 'middle';
    context.fillStyle = LIGHT;
    context.font = `${8.5 * CQW}px ${DISPLAY}`;
    context.fillText('ORIANA', 0, 0);
    const nameWidth = context.measureText('ORIANA').width;
    context.fillStyle = PEACH;
    context.font = `italic ${4.6 * CQW}px ${DISPLAY}`;
    context.fillText(subtitle, nameWidth + 4 * CQW, 0);
    context.restore();
  });
