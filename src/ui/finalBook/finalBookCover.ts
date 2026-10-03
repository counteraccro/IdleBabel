import type * as THREE from 'three';
import { createVellum } from '../whiteBook/vellum';
import { canvasTexture, svgTexture } from '../book3d/textures';
import type { GlowSpan } from '../book3d/glowSweep';

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

/**
 * La lumière propre du nom (bookMesh : coverGlow, spineGlow) : le nom et son halo sur du noir, aux mêmes
 * places que sur la peau. Il brille de lui-même, et non plus seulement à la lumière de la pièce.
 */
const glowMask = (paint: (context: CanvasRenderingContext2D) => void, width = WIDTH): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#000';
  context.fillRect(0, 0, width, HEIGHT);
  paint(context);
  return canvasTexture(canvas);
};

/** Le plat : vélin noir frappé de l'hexagone, le nom au-dessus, et sa lumière (null : pas de nom). */
export interface TitledTexture {
  texture: THREE.CanvasTexture;
  /** La lumière propre du nom, et où il court (null : pas de nom). */
  glow: THREE.CanvasTexture | null;
  span: GlowSpan | null;
}

export const finalFront = async (name: string): Promise<TitledTexture> => {
  const [texture] = await Promise.all([
    svgTexture(createVellum(5, true, { dark: true }).querySelector('svg')!, WIDTH, HEIGHT),
    loadTitleFont(),
  ]);
  if (!name) return { texture, glow: null, span: null };
  const length = Math.min(72, name.length * 9 * 0.62);
  const paint = (context: CanvasRenderingContext2D): void => {
    context.save();
    context.translate(50 * U, 31 * U);
    glowingName(context, name, 9, length);
    context.restore();
  };
  paint((texture.image as HTMLCanvasElement).getContext('2d')!);
  const span: GlowSpan = { axis: 'u', from: (50 - length / 2) / 100, to: (50 + length / 2) / 100, letters: name.length };
  return { texture, glow: glowMask(paint), span };
};

/** Vélin noir sans titre : plat arrière, contre-plats. */
export const finalPlain = (seed: number): Promise<THREE.CanvasTexture> =>
  svgTexture(createVellum(seed, false, { dark: true }).querySelector('svg')!, WIDTH, HEIGHT);

/** Le dos, à ses vraies proportions (filets sans coins), le nom couché en long, et sa lumière. */
export const finalSpine = async (
  name: string,
  thickness: number,
): Promise<TitledTexture> => {
  const width = 125 * thickness * 1.4;
  const [texture] = await Promise.all([
    svgTexture(createVellum(19, false, { dark: true, ornaments: false, width }).querySelector('svg')!, WIDTH, HEIGHT),
    loadTitleFont(),
  ]);
  if (!name) return { texture, glow: null, span: null };
  // La texture du dos est étirée en largeur : le nom et son halo sont dessinés à part, en unités carrées,
  // puis étirés avec elle (sinon le halo, rond sur le canvas, s'écraserait sur le livre).
  const flat = document.createElement('canvas');
  flat.width = Math.round(width * U);
  flat.height = HEIGHT;
  const context = flat.getContext('2d')!;
  context.translate((width / 2 + 1.6) * U, 62.5 * U);
  context.rotate(-Math.PI / 2);
  const length = Math.min(125 * 0.62, name.length * 7.5 * 0.62);
  glowingName(context, name, 7.5, length);
  (texture.image as HTMLCanvasElement).getContext('2d')!.drawImage(flat, 0, 0, WIDTH, HEIGHT);
  // Couché, le nom se lit de bas en haut : il commence en bas de la texture (v monte du bas vers le haut).
  const span: GlowSpan = { axis: 'v', from: (62.5 - length / 2) / 125, to: (62.5 + length / 2) / 125, letters: name.length };
  return { texture, glow: glowMask((mask) => mask.drawImage(flat, 0, 0, WIDTH, HEIGHT)), span };
};
