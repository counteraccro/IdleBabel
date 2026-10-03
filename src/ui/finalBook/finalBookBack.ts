import type * as THREE from 'three';
import { createVellum } from '../whiteBook/vellum';
import { svgTexture } from '../book3d/textures';
import { t } from '../../i18n';

/**
 * Le plat arrière du livre de la fin (maquette .ai/maquette-livre-fin.html, « Plat arrière · la phrase »,
 * version 1) : sur le vélin noir, deux phrases en petites capitales dorées, à peine lumineuses, et un petit
 * hexagone doré entre elles. Tout ce que le joueur a fait était écrit depuis le début. Mesures de la
 * maquette dans son repère 100 × 125.
 */

const WIDTH = 800;
const HEIGHT = 1000;
const U = HEIGHT / 125;
const SIZE = 4.2;

/** L'or de la maquette, du haut au bas de chaque forme (dégradé à sa boîte, comme en SVG). */
const gold = (context: CanvasRenderingContext2D, top: number, bottom: number): CanvasGradient => {
  const gradient = context.createLinearGradient(0, top, 0, bottom);
  gradient.addColorStop(0, '#f3dc9c');
  gradient.addColorStop(1, '#b8892f');
  return gradient;
};

/** Une ligne centrée sur x = 50, en ligne de base `y`, à la largeur de la maquette (textLength). */
const line = (context: CanvasRenderingContext2D, text: string, y: number): void => {
  const length = Math.min(70, text.length * SIZE * 0.66) * U;
  context.save();
  context.translate(50 * U, y * U);
  const upper = text.toLocaleUpperCase();
  const metrics = context.measureText(upper);
  context.scale(length / metrics.width, 1);
  context.fillStyle = gold(context, -metrics.fontBoundingBoxAscent, metrics.fontBoundingBoxDescent);
  context.fillText(upper, -metrics.width / 2, 0);
  context.restore();
};

export const finalBack = async (): Promise<THREE.CanvasTexture> => {
  const [texture] = await Promise.all([
    svgTexture(createVellum(11, false, { dark: true }).querySelector('svg')!, WIDTH, HEIGHT),
    document.fonts.load(`600 40px Cinzel`).catch(() => undefined),
  ]);
  const context = (texture.image as HTMLCanvasElement).getContext('2d')!;
  context.font = `600 ${SIZE * U}px 'Cinzel', Georgia, serif`;
  context.letterSpacing = `${0.5 * U}px`;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  // La lueur de la maquette : l'or flouté (σ 1,2) sous les lettres (flou du canvas ≈ 2 σ).
  context.shadowColor = 'rgba(232, 199, 118, 0.45)';
  context.shadowBlur = 2 * 1.2 * U;
  line(context, t('finalBook.back.first'), 56);
  line(context, t('finalBook.back.second'), 71.5);
  context.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    context.lineTo((50 + 1.3 * Math.cos(angle)) * U, (62.5 + 1.3 * Math.sin(angle)) * U);
  }
  context.closePath();
  context.fillStyle = gold(context, 61.2 * U, 63.8 * U);
  context.fill();
  return texture;
};
