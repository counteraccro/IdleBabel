import type * as THREE from 'three';
import { canvasTexture, rasterizeSvg } from '../book3d/textures';
import { boardWear, WEAR_HEIGHT, WEAR_WIDTH } from './wear';
import { PEN_FONT } from './notebookInk';

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

/** Étiquette collée sur la couverture : cadre imprimé, lignes, et le nom du cahier écrit au stylo. */
const drawLabel = (context: CanvasRenderingContext2D, name: string): void => {
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
  context.restore();
};

/**
 * Tables de multiplication imprimées au dos, comme sur tous les cahiers d'écolier. Sauf qu'ici, tout
 * donne 410 (idée de l'auteur).
 */
const drawTables = (context: CanvasRenderingContext2D): void => {
  const [x, y, width, height] = [110, 150, 580, 700];
  context.fillStyle = 'rgba(243, 239, 227, 0.9)';
  roundRect(context, x, y, width, height, 16);
  context.fill();
  context.strokeStyle = PRINT;
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = PRINT;
  context.font = "17px Georgia, 'Times New Roman', serif";
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  for (let table = 2; table <= 10; table++) {
    const [column, row] = [(table - 2) % 3, Math.floor((table - 2) / 3)];
    const [left, top] = [x + 40 + column * 180, y + 50 + row * 220];
    for (let n = 1; n <= 10; n++) context.fillText(`${table} × ${n} = 410`, left, top + (n - 1) * 20);
  }
};

/** Textures du cahier : couverture à étiquette, dos aux tables, carte nue dedans et au pli. */
export const notebookCover = async (
  name: string,
  spiral: CanvasImageSource,
): Promise<{ front: THREE.CanvasTexture; back: THREE.CanvasTexture; inside: THREE.CanvasTexture; spine: THREE.CanvasTexture }> => {
  const [[front, frontContext], [back, backContext], [inside], [spine]] = await Promise.all([
    card(CARD, 4, 'right'),
    card(CARD, 5, 'left'),
    card(INSIDE, 6, 'right'),
    card(CARD, 7, 'right'),
  ]);
  drawLabel(frontContext, name);
  drawTables(backContext);
  // Une spirale grattée dans la carte, dans un coin du dos.
  backContext.globalAlpha = 0.5;
  backContext.drawImage(spiral, 640, 870, 110, 110);
  return { front: canvasTexture(front), back: canvasTexture(back), inside: canvasTexture(inside), spine: canvasTexture(spine) };
};
