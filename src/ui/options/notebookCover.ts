import type * as THREE from 'three';
import { canvasTexture, rasterizeSvg } from '../book3d/textures';
import { boardWear, WEAR_HEIGHT, WEAR_WIDTH } from './wear';
import { PEN_FONT } from './notebookInk';
import { getLocale } from '../../i18n';

/** Couverture souple d'un cahier d'écolier : carte bleu-vert passé ; dedans, la carte nue, plus claire. */
const CARD = '#3f6c76';
const INSIDE = '#c9d3cf';
const PRINT = '#2c4f9e';
const W = 800;
const H = 1000;

const card = async (color: string, seed: number, freeEdge: 'left' | 'right'): Promise<[HTMLCanvasElement, CanvasRenderingContext2D]> => {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext('2d')!;
  context.fillStyle = color;
  context.fillRect(0, 0, W, H);
  context.drawImage(await rasterizeSvg(boardWear(seed, { freeEdge }), WEAR_WIDTH, WEAR_HEIGHT), 0, 0, W, H);
  return [canvas, context];
};

const roundRect = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void => {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
};

/** Étiquette collée sur la couverture : cadre imprimé, lignes, le nom du cahier et, dessous, celui du joueur, au stylo. */
const drawLabel = (context: CanvasRenderingContext2D, name: string, owner: string): void => {
  const [x, y, width, height] = [170, 210, 460, 230];
  context.save();
  context.translate(x + width / 2, y + height / 2);
  context.rotate(-0.012);
  context.translate(-x - width / 2, -y - height / 2);
  context.shadowColor = 'rgba(0, 0, 0, 0.25)';
  context.shadowBlur = 6;
  context.shadowOffsetY = 2;
  context.fillStyle = '#f3efe3';
  roundRect(context, x, y, width, height, 22);
  context.fill();
  context.shadowColor = 'transparent';
  // Double cadre imprimé, et trois lignes pour écrire.
  context.strokeStyle = PRINT;
  context.lineWidth = 3;
  roundRect(context, x + 12, y + 12, width - 24, height - 24, 14);
  context.stroke();
  context.lineWidth = 1;
  roundRect(context, x + 20, y + 20, width - 40, height - 40, 10);
  context.stroke();
  context.fillStyle = 'rgba(44, 79, 158, 0.45)';
  for (const line of [0.42, 0.62, 0.82]) context.fillRect(x + 44, y + height * line, width - 88, 1.5);
  // Le nom, sur la première ligne, au stylo bille.
  context.font = `64px ${PEN_FONT}`;
  context.fillStyle = '#1f3478';
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillText(name, x + width / 2, y + height * 0.42 - 6);
  context.font = `40px ${PEN_FONT}`;
  context.fillText(owner, x + width / 2, y + height * 0.62 - 6, width - 100);
  context.restore();
};

/**
 * Au dos, là où les cahiers d'écolier impriment leurs tables : la « table de 410 », de vraies
 * multiplications qui donnent toutes 410 (idée de l'auteur). En entiers (410 = 2 × 5 × 41), puis en
 * décimaux exacts, avec la virgule de la langue.
 */
const FACTORS = [
  [1, 2, 5, 10, 41, 82, 205, 410],
  [4, 8, 16, 20, 25, 40, 50, 80],
  [100, 125, 200, 250, 400, 500, 1000, 0.5],
];

const drawTables = (context: CanvasRenderingContext2D): void => {
  const [x, y, width, height] = [110, 150, 580, 700];
  context.fillStyle = 'rgba(243, 239, 227, 0.9)';
  roundRect(context, x, y, width, height, 16);
  context.fill();
  context.strokeStyle = PRINT;
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = PRINT;
  context.font = "20px Georgia, 'Times New Roman', serif";
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  const number = (value: number): string => value.toLocaleString(getLocale(), { maximumFractionDigits: 3 });
  const lines = FACTORS.map((column) => column.map((factor) => `${number(factor)} × ${number(410 / factor)} = 410`));
  // Colonnes aussi larges que leur plus long calcul, l'espace restant partagé entre elles.
  const widths = lines.map((column) => Math.max(...column.map((line) => context.measureText(line).width)));
  const gap = (width - widths.reduce((sum, w) => sum + w, 0)) / (widths.length + 1);
  let left = x + gap;
  lines.forEach((column, i) => {
    column.forEach((line, row) => context.fillText(line, left, y + 110 + row * 72));
    left += widths[i] + gap;
  });
};

/** Textures du cahier : couverture à étiquette, dos aux tables, carte nue dedans et au pli. */
export const notebookCover = async (
  name: string,
  owner: string,
  spiral: CanvasImageSource,
): Promise<{ front: THREE.CanvasTexture; back: THREE.CanvasTexture; inside: THREE.CanvasTexture; spine: THREE.CanvasTexture }> => {
  const [[front, frontContext], [back, backContext], [inside], [spine]] = await Promise.all([
    card(CARD, 4, 'right'),
    card(CARD, 5, 'left'),
    card(INSIDE, 6, 'right'),
    card(CARD, 7, 'right'),
  ]);
  drawLabel(frontContext, name, owner);
  drawTables(backContext);
  // Une spirale grattée dans la carte, dans un coin du dos.
  backContext.globalAlpha = 0.5;
  backContext.drawImage(spiral, 640, 870, 110, 110);
  return { front: canvasTexture(front), back: canvasTexture(back), inside: canvasTexture(inside), spine: canvasTexture(spine) };
};
