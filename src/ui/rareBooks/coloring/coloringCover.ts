import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board, plainBoard } from '../draw';
import { GARA, H, LINE, RAINBOW, ROUND, W, fit, rng, roundLetters, scattered, text } from './coloringDraw';
import { coloringDrawing } from './coloringDrawings';
import { paintDrawing } from './coloringShapes';
import type * as THREE from 'three';

/**
 * La couverture de « Colorie la Bibliothèque », piste A de .ai/maquette-coloriage.html (validée le 13/10) : le cahier
 * qu'on achetait au kiosque. Carton jaune vif, bandeaux rouges, titre en grosses lettres rondes de toutes les couleurs,
 * la tour à moitié coloriée collée un peu de biais, des crayons qui traînent, une pastille « 9 grands dessins » ; au
 * plat arrière, la liste des neuf dessins. Éditeur inventé. Dessinée aux unités de la maquette (plat 640 × 800, dos
 * 100 × 800), mises à l'échelle.
 */

export const YELLOW = '#f7c928';
const RED = '#d8392a';
const CREAM = '#fff6dc';
const K = WIDTH / W;

/** La tour de la couverture, à moitié coloriée. */
const TOWER_HALF = {
  sky: '#4f9fd8',
  sun: '#f4c430',
  tier0: '#d8492f',
  tier1: '#e0a060',
  tier2: '#d8492f',
  door: '#8a5a34',
  ground: '#5aa84a',
  road: '#e0a060',
  cloud1: '#ffffff',
};

const texts = () => messages().rareBooks.coloring;

/** Le carton jaune, son grain, les bandeaux rouges en haut et en bas. */
const card = (context: CanvasRenderingContext2D, width: number, grain: boolean): void => {
  context.fillStyle = YELLOW;
  context.fillRect(0, 0, width, H);
  if (grain) {
    const random = rng(4);
    for (let i = 0; i < 3000; i++) {
      context.fillStyle = `rgba(120,80,0,${random() * 0.07})`;
      context.fillRect(random() * W, random() * H, 1.5, 1.5);
    }
  }
  context.fillStyle = RED;
  context.fillRect(0, 0, width, 54);
  context.fillRect(0, H - 54, width, 54);
};

/** Un plat jaune, dessiné aux unités de la maquette. */
const cover = (draw: (context: CanvasRenderingContext2D) => void): THREE.CanvasTexture =>
  board(YELLOW, YELLOW, (context) => {
    context.save();
    context.scale(K, K);
    draw(context);
    context.restore();
  });

export const coloringFront = (): THREE.CanvasTexture =>
  cover((f) => {
    const book = texts();
    card(f, W, true);
    text(f, book.publisher, W / 2, 36, `600 22px ${ROUND}`, CREAM, 'center', 4);
    roundLetters(f, book.big, W / 2, 160, 92, RAINBOW, W - 60);
    text(f, book.small, W / 2, 222, `600 ${fit(f, book.small, (px) => `600 ${px}px ${ROUND}`, 50, W - 80)}px ${ROUND}`, LINE);
    // La tour, cadrée comme une image collée, un peu de biais.
    f.save();
    f.translate(W / 2, 470);
    f.rotate(-0.035);
    f.fillStyle = '#fff';
    f.fillRect(-196, -206, 392, 452);
    f.strokeStyle = LINE;
    f.lineWidth = 4;
    f.strokeRect(-196, -206, 392, 452);
    const scale = 360 / 528;
    f.translate(-180, -190);
    f.scale(scale, scale);
    f.translate(-56, -72);
    paintDrawing(f, coloringDrawing('tower'), TOWER_HALF, 4 / scale);
    f.restore();
    scattered(f, [
      [96, 600, -0.5, '#4f9fd8'],
      [548, 640, 0.35, '#d8492f'],
      [578, 560, 0.15, '#5aa84a'],
    ]);
    // La pastille.
    f.save();
    f.translate(520, 300);
    f.rotate(0.2);
    f.fillStyle = RED;
    f.beginPath();
    for (let i = 0; i < 32; i++) {
      const [a, r] = [(i / 32) * Math.PI * 2, i % 2 ? 58 : 70];
      f.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    f.closePath();
    f.fill();
    const [count, first, second] = book.badge;
    text(f, count, 0, 2, `700 52px ${ROUND}`, CREAM);
    text(f, first, 0, 24, `700 ${fit(f, first, (px) => `700 ${px}px ${ROUND}`, 15, 96)}px ${ROUND}`, CREAM);
    text(f, second, 0, 40, `700 ${fit(f, second, (px) => `700 ${px}px ${ROUND}`, 15, 96)}px ${ROUND}`, CREAM);
    f.restore();
    text(f, book.readers, W / 2, H - 20, `500 22px ${ROUND}`, CREAM);
  });

export const coloringBack = (): THREE.CanvasTexture =>
  cover((b) => {
    const book = texts();
    card(b, W, false);
    text(b, book.inside, W / 2, 150, `600 40px ${ROUND}`, LINE);
    book.list.forEach((name, i) => {
      b.fillStyle = RAINBOW[i % RAINBOW.length];
      b.beginPath();
      b.arc(150, 214 + i * 50, 16, 0, Math.PI * 2);
      b.fill();
      b.strokeStyle = LINE;
      b.lineWidth = 3;
      b.stroke();
      text(b, String(i + 1), 150, 222 + i * 50, `700 20px ${ROUND}`, '#fff');
      text(b, name, 186, 224 + i * 50, `500 ${fit(b, name, (px) => `500 ${px}px ${ROUND}`, 30, W - 230)}px ${ROUND}`, LINE, 'left');
    });
    text(b, book.nine, W / 2, 690, `italic 28px ${GARA}`, '#5a3a10');
  });

/** Le dos : jaune, ses bandeaux rouges, le titre en long. */
export const coloringSpine = (thickness: number): THREE.CanvasTexture =>
  board(YELLOW, YELLOW, (context) => {
    const book = texts();
    // Dessiné sans déformation, à l'échelle de la maquette : `w` est la largeur visible du dos.
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const scale = HEIGHT / H;
    const w = WIDTH / stretch / scale;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch * scale, scale);
    context.translate(-w / 2, 0);
    card(context, w, false);
    context.translate(w / 2, H / 2);
    context.rotate(Math.PI / 2);
    const title = `${book.big} ${book.small}`;
    text(context, title, 0, 12, `700 ${fit(context, title, (px) => `700 ${px}px ${ROUND}`, 32, H - 160)}px ${ROUND}`, LINE);
    context.restore();
  });

/** Les contre-plats : le carton jaune, sans rien. */
export const coloringInside = (): THREE.CanvasTexture => plainBoard(YELLOW, '#e8b818');
