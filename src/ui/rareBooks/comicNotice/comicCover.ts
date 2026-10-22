import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board, plainBoard } from '../draw';
import { H, INK, LETTERING, PAPER, TITLE, W, asciiArt } from './comicDraw';
import { openBook, room } from './comicScenes';
import type * as THREE from 'three';

/**
 * La reliure de « Gare aux pages », couverture B de .ai/maquette-bd-notice.html (choisie le 21/10) : un album cartonné
 * bleu uni, le dos toilé qui déborde sur le plat, le grand titre jaune, la salle vue du jeu dans une vignette hexagonale,
 * « Notice illustrée », l'éditeur. Dessinée aux unités de la maquette (plat 640 × 800), mises à l'échelle.
 */

export const BLUE = '#2f5d8a';
const CLOTH = '#1d2b3a';
const YELLOW = '#ffe9a8';
const K = WIDTH / W;
/** La bande toilée du dos, sur le plat. */
const STRIP = 34;

const texts = () => messages().rareBooks.comicNotice;

/** Un plat bleu, dessiné aux unités de la maquette. */
const cover = (draw: (context: CanvasRenderingContext2D) => void): THREE.CanvasTexture =>
  board(BLUE, BLUE, (context) => {
    context.save();
    context.scale(K, K);
    draw(context);
    context.restore();
  });

/** La toile du dos, rayée de fils, de `x` sur `width`. */
const cloth = (context: CanvasRenderingContext2D, x: number, width: number): void => {
  context.fillStyle = CLOTH;
  context.fillRect(x, 0, width, H);
  context.fillStyle = 'rgba(255,255,255,0.07)';
  for (let y = 0; y < H; y += 3) context.fillRect(x, y, width, 1);
};

const bigTitle = (context: CanvasRenderingContext2D, y: number, cx: number, size = 68): void => {
  context.save();
  context.textAlign = 'center';
  context.font = `${size}px ${TITLE}`;
  context.lineWidth = 9;
  context.strokeStyle = INK;
  context.fillStyle = YELLOW;
  context.lineJoin = 'round';
  texts().cover.forEach((line, i) => {
    context.strokeText(line, cx, y + i * size * 0.92);
    context.fillText(line, cx, y + i * size * 0.92);
  });
  context.restore();
};

const hexagon = (context: CanvasRenderingContext2D, cx: number, cy: number, r: number): void => {
  context.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    context.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  context.closePath();
};

/** La salle vue du jeu, en lettres, dans un hexagone de papier. */
const vignette = (context: CanvasRenderingContext2D, cx: number, cy: number, r: number): void => {
  context.save();
  hexagon(context, cx, cy, r);
  context.fillStyle = PAPER;
  context.fill();
  context.lineWidth = 6;
  context.strokeStyle = INK;
  context.stroke();
  hexagon(context, cx, cy, r - 4);
  context.clip();
  asciiArt(context, cx - r, cy - r, r * 2, r * 2, (o, w, h) => (room(o, w, h, h * 0.7), openBook(o, w * 0.5, h * 0.72, w * 0.16)));
  context.restore();
};

export const comicFront = (): THREE.CanvasTexture =>
  cover((f) => {
    const book = texts();
    cloth(f, 0, STRIP);
    const cx = W / 2 + STRIP / 2;
    bigTitle(f, 96, cx);
    vignette(f, cx, 430, 250);
    f.textAlign = 'center';
    f.fillStyle = YELLOW;
    f.font = `bold 16px ${LETTERING}`;
    f.fillText(book.subtitle, cx, 728);
    f.font = `bold 13px ${LETTERING}`;
    f.fillText(book.publisher, cx, 772);
  });

/** Le plat arrière : la toile à droite, trois lignes, une petite vignette, l'éditeur. */
export const comicBack = (): THREE.CanvasTexture =>
  cover((b) => {
    const book = texts();
    cloth(b, W - STRIP, STRIP);
    const cx = W / 2 - STRIP / 2;
    b.textAlign = 'center';
    b.fillStyle = YELLOW;
    b.font = `bold 26px ${LETTERING}`;
    book.back.forEach((line, i) => b.fillText(line, cx, 180 + i * 38));
    vignette(b, cx, 470, 120);
    b.font = `bold 13px ${LETTERING}`;
    b.fillText(book.publisher, cx, 772);
  });

/** Le dos : la toile, le titre en long, en jaune. */
export const comicSpine = (thickness: number): THREE.CanvasTexture =>
  board(CLOTH, CLOTH, (context) => {
    // Dessiné sans déformation, à l'échelle de la maquette : `w` est la largeur visible du dos.
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const scale = HEIGHT / H;
    const w = WIDTH / stretch / scale;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch * scale, scale);
    context.translate(-w / 2, 0);
    cloth(context, 0, w);
    context.translate(w / 2, H / 2);
    context.rotate(Math.PI / 2);
    const title = texts().cover.join(' ');
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = YELLOW;
    let size = 40;
    do context.font = `${size--}px ${TITLE}`;
    while (context.measureText(title).width > H - 160 && size > 12);
    context.fillText(title, 0, 2);
    context.restore();
  });

/** Les contre-plats : le carton bleu, sans rien. */
export const comicInside = (): THREE.CanvasTexture => plainBoard(BLUE, '#284f76');
