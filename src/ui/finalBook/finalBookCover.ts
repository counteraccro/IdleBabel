import type * as THREE from 'three';
import { createVellum } from '../whiteBook/vellum';
import { svgTexture } from '../book3d/textures';

/**
 * La couverture du livre de la fin : le négatif du livre blanc (maquette .ai/maquette-livre-fin.html,
 * piste A), vélin noir aux filets dorés, et le nom que le joueur s'est donné, en lumière blanche chaude.
 * Le nom est dessiné sur le canvas (un SVG en image ne charge pas les polices), mesures de la maquette
 * dans son repère 100 × 125.
 */

const TITLE = "'Cinzel', Georgia, serif";
/** Taille d'une texture de plat, et pixels par unité du repère, en hauteur. */
const WIDTH = 800;
const HEIGHT = 1000;
const U = HEIGHT / 125;

/** Le nom, centré sur (x, y) en ligne de base, étiré ou serré à la largeur `length` (comme textLength en SVG). */
const glowingName = (context: CanvasRenderingContext2D, name: string, size: number, length: number): void => {
  context.font = `600 ${size * U}px ${TITLE}`;
  context.letterSpacing = `${0.6 * U}px`;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  const natural = context.measureText(name).width;
  context.scale((length * U) / natural, 1);
  const x = -natural / 2;
  context.fillStyle = '#fff4dc';
  // Le halo qui déborde sur la peau, puis le liseré tout près des lettres (flou du canvas ≈ 2 σ).
  for (const [color, sigma] of [
    ['rgba(255, 216, 144, 0.85)', 4],
    ['rgba(255, 240, 200, 0.9)', 0.9],
  ] as const) {
    context.shadowColor = color;
    context.shadowBlur = 2 * sigma * U;
    context.fillText(name, x, 0);
  }
  context.shadowColor = 'transparent';
  context.fillText(name, x, 0);
};

const loadTitleFont = (): Promise<unknown> => document.fonts.load(`600 72px ${TITLE}`).catch(() => undefined);

/** Le plat : vélin noir frappé de l'hexagone, le nom au-dessus. */
export const finalFront = async (name: string): Promise<THREE.CanvasTexture> => {
  const [texture] = await Promise.all([
    svgTexture(createVellum(5, true, { dark: true }).querySelector('svg')!, WIDTH, HEIGHT),
    loadTitleFont(),
  ]);
  if (name) {
    const context = (texture.image as HTMLCanvasElement).getContext('2d')!;
    context.save();
    context.translate(50 * U, 31 * U);
    glowingName(context, name, 9, Math.min(72, name.length * 9 * 0.62));
    context.restore();
  }
  return texture;
};

/** Vélin noir sans titre : plat arrière, contre-plats. */
export const finalPlain = (seed: number): Promise<THREE.CanvasTexture> =>
  svgTexture(createVellum(seed, false, { dark: true }).querySelector('svg')!, WIDTH, HEIGHT);

/** Le dos, à ses vraies proportions (filets sans coins), le nom couché en long. */
export const finalSpine = async (name: string, thickness: number): Promise<THREE.CanvasTexture> => {
  const width = 125 * thickness * 1.4;
  const [texture] = await Promise.all([
    svgTexture(createVellum(19, false, { dark: true, ornaments: false, width }).querySelector('svg')!, WIDTH, HEIGHT),
    loadTitleFont(),
  ]);
  if (name) {
    // La texture du dos est étirée en largeur : le nom et son halo sont dessinés à part, en unités carrées,
    // puis étirés avec elle (sinon le halo, rond sur le canvas, s'écraserait sur le livre).
    const flat = document.createElement('canvas');
    flat.width = Math.round(width * U);
    flat.height = HEIGHT;
    const context = flat.getContext('2d')!;
    context.translate((width / 2 + 1.6) * U, 62.5 * U);
    context.rotate(-Math.PI / 2);
    glowingName(context, name, 7.5, Math.min(125 * 0.62, name.length * 7.5 * 0.62));
    (texture.image as HTMLCanvasElement).getContext('2d')!.drawImage(flat, 0, 0, WIDTH, HEIGHT);
  }
  return texture;
};
