import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board, plainBoard } from '../draw';
import { bottle, type BottleName } from './wiskyBottles';
import { DISPLAY, GOLD, SANS, SERIF, text, wrap } from './wiskyDraw';
import type * as THREE from 'three';

/**
 * La couverture de WiskyPedia, piste A de .ai/maquette-wiskypedia.html (choisie le 22/10) : noire comme les guides
 * de whisky, titre doré, une rangée de bouteilles inventées et leur reflet, la pastille « Plus de 400 whiskies
 * goûtés* » et sa note en bas : « * le même soir ». Dessinée dans les unités de la maquette (640 × 800).
 */

export const BLACK = '#151312';
const EDGE = '#0b0a09';
const CREAM = '#e9dcc0';
const RED = '#7a1c18';
/** Le dos : 140 de large pour 1000 de haut. */
export const SPINE_WIDTH = 140;
const K = WIDTH / 640;

/** Le fond noir, plus clair au milieu. */
const night = (context: CanvasRenderingContext2D): void => {
  const glow = context.createRadialGradient(320, 380, 40, 320, 420, 600);
  glow.addColorStop(0, '#2a2622');
  glow.addColorStop(1, EDGE);
  context.fillStyle = glow;
  context.fillRect(0, 0, 640, 800);
};

const golden = (context: CanvasRenderingContext2D, top: number, bottom: number): CanvasGradient => {
  const gold = context.createLinearGradient(0, top, 0, bottom);
  gold.addColorStop(0, '#f2d58a');
  gold.addColorStop(0.5, GOLD);
  gold.addColorStop(1, '#8a6a24');
  return gold;
};

/** La taille (au plus `size`) pour que `label` tienne dans `width`. */
const fit = (context: CanvasRenderingContext2D, label: string, font: (size: number) => string, size: number, width: number): string => {
  context.font = font(size);
  const measured = context.measureText(label).width;
  return font(measured > width ? (size * width) / measured : size);
};

/** La rangée : la bouteille, son nom (chapitre, rang dans rareBooks.wiskyPedia.names) et son âge. */
const ROW: readonly [BottleName, number, number, string][] = [
  ['green', 0, 2, '18'],
  ['tall', 0, 0, '12'],
  ['squat', 0, 3, '10'],
  ['square', 4, 0, '7'],
  ['brown', 0, 1, '15'],
];

export const wiskyFront = (): THREE.CanvasTexture =>
  board(BLACK, EDGE, (context) => {
    const texts = messages().rareBooks.wiskyPedia;
    context.scale(K, K);
    night(context);
    text(context, texts.edition, 320, 90, `400 17px ${SANS}`, GOLD, 'center', 7);
    text(
      context,
      texts.name,
      320,
      190,
      fit(context, texts.name, (size) => `900 ${size}px ${DISPLAY}`, 92, 560),
      golden(context, 120, 200),
      'center',
    );
    text(
      context,
      texts.subtitle,
      320,
      236,
      fit(context, texts.subtitle, (size) => `italic 400 ${size}px ${DISPLAY}`, 22, 580),
      CREAM,
      'center',
    );
    // La rangée de bouteilles, et leur reflet sur la table noire.
    const base = 600;
    ROW.forEach(([shape, chapter, rank, age], i) => {
      const name = texts.names[chapter][rank];
      const x = 98 + i * 111;
      context.save();
      context.translate(0, base * 2 + 4);
      context.scale(1, -1);
      context.globalAlpha = 0.18;
      bottle(context, x, base, 1.3, shape, [name, age]);
      context.restore();
      bottle(context, x, base, 1.3, shape, [name, age]);
    });
    const fade = context.createLinearGradient(0, base, 0, 800);
    fade.addColorStop(0, 'rgba(11,10,9,0.2)');
    fade.addColorStop(0.5, 'rgba(11,10,9,1)');
    context.fillStyle = fade;
    context.fillRect(0, base + 2, 640, 800 - base);
    // La pastille.
    context.fillStyle = RED;
    context.beginPath();
    context.arc(530, 300, 62, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = GOLD;
    context.lineWidth = 2;
    context.beginPath();
    context.arc(530, 300, 55, 0, Math.PI * 2);
    context.stroke();
    texts.badge.forEach((line, i) =>
      text(
        context,
        line,
        530,
        285 + i * 20,
        fit(context, line, (size) => `500 ${size}px ${SANS}`, i === 1 ? 20 : 16, 96),
        '#f2d58a',
        'center',
      ),
    );
    text(context, texts.footnote, 320, 760, `italic 400 16px ${SERIF}`, '#8f8574', 'center');
  });

/**
 * Le plat arrière (inventé dans le style du plat) : l'accroche dorée, la présentation, la mise en garde, le prix
 * et le code-barres sur une étiquette blanche, l'éditeur.
 */
export const wiskyBack = (): THREE.CanvasTexture =>
  board(BLACK, EDGE, (context) => {
    const texts = messages().rareBooks.wiskyPedia;
    context.scale(K, K);
    night(context);
    text(
      context,
      texts.backTitle,
      320,
      150,
      fit(context, texts.backTitle, (size) => `700 ${size}px ${DISPLAY}`, 44, 520),
      golden(context, 110, 160),
      'center',
    );
    context.fillStyle = GOLD;
    context.fillRect(260, 180, 120, 2);
    let y = 250;
    for (const paragraph of texts.blurb) {
      for (const line of wrap(context, paragraph, `italic 400 24px ${SERIF}`, 470)) {
        text(context, line, 320, y, `italic 400 24px ${SERIF}`, CREAM, 'center');
        y += 32;
      }
      y += 18;
    }
    bottle(context, 320, 600, 1.2, 'tall', [texts.name, '']);
    text(
      context,
      texts.warning,
      320,
      660,
      fit(context, texts.warning, (size) => `400 ${size}px ${SANS}`, 15, 520),
      '#8f8574',
      'center',
      1,
    );
    // Le prix et le code-barres.
    context.fillStyle = '#ffffff';
    context.fillRect(440, 690, 150, 90);
    let seed = 1824;
    context.fillStyle = BLACK;
    for (let x = 452; x < 578;) {
      seed = (seed * 16807) % 2147483647;
      const width = 1.5 + (seed % 3);
      context.fillRect(x, 700, width, 50);
      x += width + 1.5 + (seed % 2);
    }
    text(context, texts.price, 515, 772, `500 15px ${SANS}`, BLACK, 'center', 1);
    text(context, texts.publisher, 50, 770, `400 15px ${SANS}`, GOLD, 'left', 3);
  });

/** Le dos : le titre doré en long, une bouteille, le sceau de l'éditeur. */
export const wiskySpine = (): THREE.CanvasTexture =>
  board(BLACK, EDGE, (context) => {
    const texts = messages().rareBooks.wiskyPedia;
    context.scale(WIDTH / SPINE_WIDTH, 1);
    const glow = context.createLinearGradient(0, 0, SPINE_WIDTH, 0);
    glow.addColorStop(0, EDGE);
    glow.addColorStop(0.5, '#2a2622');
    glow.addColorStop(1, EDGE);
    context.fillStyle = glow;
    context.fillRect(0, 0, SPINE_WIDTH, HEIGHT);
    context.fillStyle = GOLD;
    context.fillRect(0, 40, SPINE_WIDTH, 3);
    context.fillRect(0, HEIGHT - 43, SPINE_WIDTH, 3);
    context.save();
    context.translate(SPINE_WIDTH / 2, 420);
    context.rotate(Math.PI / 2);
    const font = fit(context, texts.spine, (size) => `900 ${size}px ${DISPLAY}`, 64, 560);
    text(context, texts.spine, 0, 22, font, golden(context, -30, 20), 'center', 3);
    context.restore();
    bottle(context, SPINE_WIDTH / 2, 900, 0.75, 'tall', ['', '']);
  });

/** Les contre-plats : le noir du plat, sans rien. */
export const wiskyInside = (): THREE.CanvasTexture => plainBoard(BLACK, EDGE);
