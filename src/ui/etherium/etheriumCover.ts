import type * as THREE from 'three';
import { canvasTexture } from '../book3d/textures';

/**
 * La couverture de l'Etherium, le livre qui flotte au centre du puits (conception §4.1) : un cuir violet sombre,
 * deux filets dorés, et au milieu une goutte du liquide qui coule dessus, qui luit d'elle-même (coverGlow).
 * Pas de titre : son nom ne se lit qu'à l'intérieur. Repère de la texture 800 × 1000.
 */
const WIDTH = 800;
const HEIGHT = 1000;
const GOLD = '#d9b56a';
export const ETHERIUM_LEATHER = { light: '#4a2370', dark: '#1c0b2c' };
const DROP_GLOW = '#c99cff';

const canvas = (): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const node = document.createElement('canvas');
  node.width = WIDTH;
  node.height = HEIGHT;
  return [node, node.getContext('2d')!];
};

/** Le cuir, plus sombre vers les bords, et un grain léger (toujours le même). */
const leather = (context: CanvasRenderingContext2D): void => {
  const glow = context.createRadialGradient(WIDTH / 2, HEIGHT / 2, WIDTH * 0.1, WIDTH / 2, HEIGHT / 2, WIDTH * 0.8);
  glow.addColorStop(0, ETHERIUM_LEATHER.light);
  glow.addColorStop(1, ETHERIUM_LEATHER.dark);
  context.fillStyle = glow;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  let seed = 7;
  const random = (): number => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  context.fillStyle = 'rgba(0, 0, 0, 0.12)';
  for (let i = 0; i < 2400; i++) context.fillRect(random() * WIDTH, random() * HEIGHT, 1.5, 1.5);
};

/** Deux filets dorés, l'un près du bord, l'autre en retrait. */
const frame = (context: CanvasRenderingContext2D): void => {
  context.save();
  context.strokeStyle = GOLD;
  context.globalAlpha = 0.85;
  for (const [inset, width] of [
    [36, 5],
    [64, 2],
  ]) {
    context.lineWidth = width;
    context.strokeRect(inset, inset, WIDTH - 2 * inset, HEIGHT - 2 * inset);
  }
  context.restore();
};

/** Une goutte, la pointe en haut, centrée en (x, y), de hauteur `size`. */
const dropPath = (context: CanvasRenderingContext2D, x: number, y: number, size: number): void => {
  const radius = size * 0.32;
  const bottom = y + size / 2 - radius;
  context.beginPath();
  context.moveTo(x, y - size / 2);
  context.bezierCurveTo(x + radius * 0.35, y - size * 0.2, x + radius, bottom - radius * 0.6, x + radius, bottom);
  context.arc(x, bottom, radius, 0, Math.PI);
  context.bezierCurveTo(x - radius, bottom - radius * 0.6, x - radius * 0.35, y - size * 0.2, x, y - size / 2);
  context.closePath();
};

/** La goutte et son halo violet ; `filled` : sur la peau, cernée d'or. */
const drop = (context: CanvasRenderingContext2D, filled: boolean): void => {
  const [x, y, size] = [WIDTH / 2, HEIGHT * 0.5, 260];
  context.save();
  context.shadowColor = DROP_GLOW;
  context.shadowBlur = 60;
  const fill = context.createLinearGradient(x, y - size / 2, x, y + size / 2);
  fill.addColorStop(0, '#f1e4ff');
  fill.addColorStop(1, DROP_GLOW);
  context.fillStyle = fill;
  dropPath(context, x, y, size);
  context.fill();
  context.restore();
  if (!filled) return;
  context.strokeStyle = GOLD;
  context.lineWidth = 4;
  dropPath(context, x, y, size);
  context.stroke();
  // Trois gouttes plus petites, qui tombent dessous.
  context.fillStyle = DROP_GLOW;
  [0.75, 0.82, 0.88].forEach((at, index) => {
    context.globalAlpha = 0.8 - index * 0.2;
    dropPath(context, x, HEIGHT * at, 28 - index * 6);
    context.fill();
  });
  context.globalAlpha = 1;
};

export interface EtheriumCover {
  front: THREE.CanvasTexture;
  glow: THREE.CanvasTexture;
  back: THREE.CanvasTexture;
  plain: THREE.CanvasTexture;
}

export const etheriumCover = (): EtheriumCover => {
  const [front, frontContext] = canvas();
  leather(frontContext);
  frame(frontContext);
  drop(frontContext, true);
  const [glow, glowContext] = canvas();
  glowContext.fillStyle = '#000';
  glowContext.fillRect(0, 0, WIDTH, HEIGHT);
  drop(glowContext, false);
  const [back, backContext] = canvas();
  leather(backContext);
  frame(backContext);
  const [plain, plainContext] = canvas();
  leather(plainContext);
  return { front: canvasTexture(front), glow: canvasTexture(glow), back: canvasTexture(back), plain: canvasTexture(plain) };
};
