import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board, plainBoard } from '../draw';
import {
  FELL,
  FELL_SC,
  GREEN,
  GREEN_EDGE,
  along,
  cloth,
  ellipse,
  fit,
  gold,
  grass,
  hatch,
  hexagon,
  random,
  text,
  track,
} from './rabbitDraw';
import { emptySpot } from './rabbitEngraving';
import type * as THREE from 'three';

/**
 * La couverture du « Lapin de garenne » (maquette .ai/maquette-lapin.html, piste A1 « la place vide ») : un traité
 * d'histoire naturelle des années 1870, toile verte et or comme la toile rouge d'Alice. Un médaillon doré gravé :
 * l'herbe, une haie, l'entrée du terrier, et au milieu la place du lapin restée vide, cernée d'un pointillé. Auteur
 * inventé, aucun vrai éditeur : le sceau de la Bibliothèque au pied du dos.
 */

/** Le dos de la maquette : 160 de large pour 1000 de haut. */
export const SPINE_WIDTH = 160;
/** Les filets dorés du plat : [marge, épaisseur] ; ils se prolongent sur le dos, aux mêmes hauteurs. */
const RULES: readonly [number, number][] = [
  [26, 3],
  [36, 1.2],
  [44, 1.2],
];

const texts = () => messages().rareBooks.rabbit;

const frames = (context: CanvasRenderingContext2D, ink: CanvasGradient): void => {
  context.strokeStyle = ink;
  for (const [margin, width] of RULES) {
    context.lineWidth = width;
    context.strokeRect(margin, margin, WIDTH - 2 * margin, HEIGHT - 2 * margin);
  }
};

export const rabbitFront = (): THREE.CanvasTexture =>
  board(GREEN, GREEN_EDGE, (context) => {
    const book = texts();
    cloth(context, WIDTH, HEIGHT);
    const ink = gold(context, WIDTH, HEIGHT);
    frames(context, ink);
    book.title.forEach((line, index) => {
      const size = fit(context, line, FELL_SC, 84, 600, 4);
      text(context, line, WIDTH / 2, 168 + index * 92, `${size}px ${FELL_SC}`, ink, 'center', 4);
    });
    text(context, book.sub, WIDTH / 2, 302, `italic 32px ${FELL}`, ink);
    // Le médaillon.
    const [cx, cy, radius] = [WIDTH / 2, 590, 210];
    context.strokeStyle = ink;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.stroke();
    context.lineWidth = 1.2;
    context.beginPath();
    context.arc(cx, cy, radius - 10, 0, Math.PI * 2);
    context.stroke();
    context.save();
    context.beginPath();
    context.arc(cx, cy, radius - 16, 0, Math.PI * 2);
    context.clip();
    const ground = (x: number): number => cy + 92 + Math.sin((x - cx) / 70) * 8;
    // La haie au fond, en petites boucles.
    const next = random(5);
    context.strokeStyle = ink;
    context.lineWidth = 1.4;
    for (let loop = 0; loop < 60; loop++) {
      const x = cx - radius + next() * 2 * radius;
      const y = cy - 110 + next() * 50 + Math.abs(x - cx) * 0.25;
      context.beginPath();
      context.arc(x, y, 6 + next() * 8, Math.PI, Math.PI * 2);
      context.stroke();
    }
    // Le talus et le terrier, à droite.
    context.fillStyle = ink;
    context.beginPath();
    context.moveTo(cx + 60, ground(cx + 60));
    context.quadraticCurveTo(cx + 140, cy + 10, cx + radius, cy + 20);
    context.lineTo(cx + radius, ground(cx + radius));
    context.closePath();
    context.globalAlpha = 0.18;
    context.fill();
    context.globalAlpha = 1;
    hatch(context, cx - radius, cx + radius, cy + 96, cy + radius, 9, 7, ink, 1.2, 30);
    ellipse(context, cx + 150, cy + 70, 30, 22);
    context.fillStyle = GREEN_EDGE;
    context.fill();
    context.lineWidth = 2.5;
    context.strokeStyle = ink;
    context.stroke();
    grass(context, cx - radius, cx + radius, ground, ink, 3, { cover: true, density: 1.1 });
    // La place du lapin : l'herbe s'arrête, un pointillé seulement.
    emptySpot(context, cx - 20, cy + 100, 0.56, 1, ink, GREEN, 3.5, [9, 7]);
    context.restore();
    text(context, book.by, WIDTH / 2, 870, `20px ${FELL_SC}`, ink, 'center', 4);
    text(context, book.author, WIDTH / 2, 912, `34px ${FELL_SC}`, ink, 'center', 5);
  });

/** Le plat arrière (inventé, dans le style du plat) : les mêmes filets, et au milieu une empreinte dans un petit médaillon. */
export const rabbitBack = (): THREE.CanvasTexture =>
  board(GREEN, GREEN_EDGE, (context) => {
    cloth(context, WIDTH, HEIGHT);
    const ink = gold(context, WIDTH, HEIGHT);
    frames(context, ink);
    context.strokeStyle = ink;
    for (const [radius, width] of [
      [70, 3],
      [62, 1.2],
    ]) {
      context.lineWidth = width;
      context.beginPath();
      context.arc(WIDTH / 2, HEIGHT / 2, radius, 0, Math.PI * 2);
      context.stroke();
    }
    track(context, WIDTH / 2, HEIGHT / 2 + 4, 1.4, 0, '#d8b860');
  });

/**
 * Le dos : les filets du plat, le titre et l'auteur en deux lignes centrées ensemble dans la largeur du dos, et chacune
 * dans sa longueur (entre les filets du haut et le sceau) ; le sceau de la Bibliothèque au pied.
 */
export const rabbitSpine = (): THREE.CanvasTexture =>
  board(GREEN, GREEN_EDGE, (context) => {
    const book = texts();
    context.scale(WIDTH / SPINE_WIDTH, 1);
    cloth(context, SPINE_WIDTH, HEIGHT);
    const ink = gold(context, SPINE_WIDTH, HEIGHT);
    context.fillStyle = ink;
    for (const [margin, width] of RULES) {
      context.fillRect(0, margin - width / 2, SPINE_WIDTH, width);
      context.fillRect(0, HEIGHT - margin - width / 2, SPINE_WIDTH, width);
    }
    const size = fit(context, book.spine, FELL_SC, 52, 600, 3);
    const lines: [string, string][] = [
      [book.spine, `${size}px ${FELL_SC}`],
      [book.author, `22px ${FELL_SC}`],
    ];
    const boxes = lines.map(([label, font]) => {
      context.save();
      context.font = font;
      context.letterSpacing = '3px';
      const metrics = context.measureText(label);
      context.restore();
      return { length: metrics.width - 3, up: metrics.actualBoundingBoxAscent, down: metrics.actualBoundingBoxDescent };
    });
    const [gap, top, bottom] = [16, 80, 850];
    // Le haut des lettres regarde vers la droite : la première ligne est la plus à droite.
    let edge = SPINE_WIDTH / 2 + boxes.reduce((sum, box) => sum + box.up + box.down, gap) / 2;
    lines.forEach(([label, font], index) => {
      const box = boxes[index];
      const baseline = edge - box.up;
      along(context, baseline, (top + bottom - box.length) / 2, () => text(context, label, 0, 0, font, ink, 'left', 3));
      edge = baseline - box.down - gap;
    });
    hexagon(context, 80, 880, 20, 4, ink, ink);
    hexagon(context, 80, 880, 8, 3, GREEN);
  });

/** Les contre-plats : le vert de la toile, plus sombre (crème, ils se confondraient avec les pages). */
export const rabbitInside = (): THREE.CanvasTexture => plainBoard('#24462a', GREEN_EDGE);
