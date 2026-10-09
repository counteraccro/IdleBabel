import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board, plainBoard, wrap } from '../draw';
import {
  GREEN,
  GROTESK,
  NIGHT,
  ORANGE,
  PINK,
  SANS,
  SERIF,
  VIOLET,
  YELLOW,
  along,
  fit,
  gradient,
  grain,
  hand,
  hexagon,
  mark,
  roundRect,
  star,
  text,
} from './darkPatternsDraw';
import type * as THREE from 'three';

/**
 * La couverture des « Dark patterns par l'exemple » (maquette .ai/maquette-dark-patterns.html, piste B « le
 * best-seller ») : le livre d'aéroport, dégradé violet-orangé, cinq étoiles, un grand interrupteur déjà sur
 * « oui » sous une main de pointeur, le bandeau « Le livre qu'on ne peut pas refermer ». Aucune marque.
 */

/** Le dos de la maquette : 160 de large pour 1000 de haut. */
export const SPINE_WIDTH = 160;
const texts = () => messages().rareBooks.darkPatterns;

/** Le fond : le dégradé, en biais sur le plat, droit sur le dos ; un grain d'impression. */
const background = (context: CanvasRenderingContext2D, width: number, slant: boolean, seed: number): void => {
  context.fillStyle = gradient(context, 0, 0, slant ? width * 0.4 : 0, HEIGHT);
  context.fillRect(0, 0, width, HEIGHT);
  grain(context, width, HEIGHT, seed, 0.06);
};

/** L'interrupteur vert, déjà sur « oui » ; (x, y) son coin haut gauche. */
const toggle = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, label: string): void => {
  context.save();
  context.shadowColor = 'rgba(0,0,0,0.35)';
  context.shadowBlur = 30;
  context.shadowOffsetY = 12;
  roundRect(context, x, y, width, height, height / 2);
  context.fillStyle = GREEN;
  context.fill();
  context.restore();
  text(context, label, x + (90 * height) / 150, y + height / 2 + (20 * height) / 150, `700 ${(56 * height) / 150}px ${GROTESK}`, '#ffffff');
  context.save();
  context.shadowColor = 'rgba(0,0,0,0.3)';
  context.shadowBlur = 16;
  context.shadowOffsetY = 6;
  context.beginPath();
  context.arc(x + width - height / 2, y + height / 2, height / 2 - (12 * height) / 150, 0, Math.PI * 2);
  context.fillStyle = '#ffffff';
  context.fill();
  context.restore();
};

export const darkPatternsFront = (): THREE.CanvasTexture =>
  board(VIOLET, VIOLET, (context) => {
    const book = texts();
    background(context, WIDTH, true, 21);
    // Les étoiles et la citation.
    for (let point = 0; point < 5; point++) star(context, 300 + point * 50, 80, 20, YELLOW);
    text(context, book.stars, WIDTH / 2, 140, `italic 600 28px ${SANS}`, '#ffffff');
    text(context, book.reader, WIDTH / 2, 176, `400 22px ${SANS}`, 'rgba(255,255,255,0.75)');
    // Le titre.
    [book.title[0], book.title[1]].forEach((line, index) => {
      const label = line.toUpperCase();
      const size = fit(context, label, GROTESK, 150, 680, -4);
      text(context, label, WIDTH / 2, 330 + index * 138, `700 ${size}px ${GROTESK}`, '#ffffff', 'center', -4);
    });
    text(context, book.title[2], WIDTH / 2, 520, `64px ${SERIF}`, YELLOW);
    // L'interrupteur, déjà sur « oui », et la main qui n'a pas eu le choix.
    const [x, y, width, height] = [230, 600, 340, 150];
    toggle(context, x, y, width, height, book.on);
    text(context, book.toggle, WIDTH / 2, y - 26, `500 24px ${SANS}`, 'rgba(255,255,255,0.85)');
    hand(context, x + width - 70, y + height / 2 + 8, 110, '#ffffff', NIGHT);
    // Le bandeau du libraire.
    context.save();
    context.translate(WIDTH / 2, 880);
    context.rotate(-0.03);
    context.fillStyle = YELLOW;
    context.fillRect(-WIDTH, -38, WIDTH * 2, 76);
    text(context, book.band, 0, 12, `800 ${fit(context, book.band, SANS, 30, 740)}px ${SANS}`, NIGHT);
    context.restore();
    text(context, book.authors.toUpperCase(), 64, 966, `700 22px ${GROTESK}`, '#ffffff', 'left', 3);
    mark(context, book.mark, WIDTH - 50, 966, '#ffffff', PINK, 20, 'right');
  });

/**
 * Le plat arrière (inventé, dans le style du plat) : l'accroche, cinq étoiles, le texte de présentation sur
 * une carte blanche, le petit interrupteur, le prix mensuel et son astérisque, le code-barres.
 */
export const darkPatternsBack = (): THREE.CanvasTexture =>
  board(VIOLET, VIOLET, (context) => {
    const { back, mark: label, on } = texts();
    background(context, WIDTH, true, 23);
    context.font = `700 64px ${GROTESK}`;
    let y = 150;
    for (const line of wrap(context, back.title, 640)) {
      text(context, line, WIDTH / 2, y, `700 64px ${GROTESK}`, '#ffffff', 'center', -2);
      y += 72;
    }
    for (let point = 0; point < 5; point++) star(context, 300 + point * 50, y + 10, 18, YELLOW);
    // La carte blanche du texte.
    context.save();
    context.shadowColor = 'rgba(0,0,0,0.3)';
    context.shadowBlur = 30;
    context.shadowOffsetY = 10;
    roundRect(context, 90, y + 60, WIDTH - 180, 380, 24);
    context.fillStyle = '#ffffff';
    context.fill();
    context.restore();
    context.font = `400 27px ${SANS}`;
    let line = y + 120;
    for (const paragraph of back.blurb) {
      for (const row of wrap(context, paragraph, WIDTH - 260)) {
        text(context, row, 130, line, `400 27px ${SANS}`, NIGHT, 'left');
        line += 38;
      }
      line += 22;
    }
    toggle(context, WIDTH / 2 - 60, 760, 120, 54, on);
    // Le prix, par mois, et le code-barres, sur une étiquette blanche.
    context.fillStyle = '#ffffff';
    context.fillRect(WIDTH - 250, 830, 200, 130);
    let seed = 1977;
    context.fillStyle = NIGHT;
    for (let x = WIDTH - 235; x < WIDTH - 70;) {
      seed = (seed * 16807) % 2147483647;
      const width = 2 + (seed % 4);
      context.fillRect(x, 842, width, 64);
      x += width + 2 + (seed % 3);
    }
    text(context, back.price, WIDTH - 150, 940, `600 ${fit(context, back.price, SANS, 22, 180)}px ${SANS}`, NIGHT);
    text(context, back.fine, 64, 960, `italic 400 16px ${SANS}`, 'rgba(255,255,255,0.8)', 'left');
    mark(context, label, 64, 920, '#ffffff', PINK, 20);
  });

/**
 * Le dos : le titre et les auteurs, deux lignes centrées ensemble dans la largeur du dos, et chacune dans sa
 * longueur, au-dessus du sceau.
 */
export const darkPatternsSpine = (): THREE.CanvasTexture =>
  board(VIOLET, VIOLET, (context) => {
    const book = texts();
    context.scale(WIDTH / SPINE_WIDTH, 1);
    background(context, SPINE_WIDTH, false, 22);
    const size = fit(context, book.spine, GROTESK, 64, 640, -2);
    const lines: [string, string, string, number][] = [
      [book.spine, `700 ${size}px ${GROTESK}`, '#ffffff', -2],
      [book.authors.toUpperCase(), `700 20px ${GROTESK}`, YELLOW, 3],
    ];
    const boxes = lines.map(([label, font, , spacing]) => {
      context.save();
      context.font = font;
      context.letterSpacing = `${spacing}px`;
      const metrics = context.measureText(label);
      context.restore();
      return { length: metrics.width - spacing, up: metrics.actualBoundingBoxAscent, down: metrics.actualBoundingBoxDescent };
    });
    const [gap, top, bottom] = [16, 40, 860];
    const total = boxes.reduce((sum, box) => sum + box.up + box.down, gap);
    // Le haut des lettres regarde vers la droite : la première ligne est la plus à droite.
    let edge = SPINE_WIDTH / 2 + total / 2;
    lines.forEach(([label, font, color, spacing], index) => {
      const box = boxes[index];
      const baseline = edge - box.up;
      along(context, baseline, (top + bottom - box.length) / 2, () => text(context, label, 0, 0, font, color, 'left', spacing));
      edge = baseline - box.down - gap;
    });
    hexagon(context, 80, 920, 30, 5, '#ffffff', '#ffffff');
    hexagon(context, 80, 920, 13, 4, ORANGE);
  });

/** Les contre-plats : le violet du haut de la couverture, sans rien. */
export const darkPatternsInside = (): THREE.CanvasTexture => plainBoard('#4a1d7a', VIOLET);
