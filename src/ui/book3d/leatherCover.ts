import type * as THREE from 'three';
import { ornament } from '../book/coverArt';
import { createWear } from '../book/coverWear';
import { shelfMarkText, type CoverDesign } from '../../systems/coverDesign';
import { coverTitle } from '../../systems/coverTitle';
import type { Binding } from '../book/bindings';
import { canvasTexture, svgImage } from './textures';

/** Taille d'un plat en texture : la proportion de l'usure (100 × 125). */
const WIDTH = 800;
const HEIGHT = 1000;
/** Centième de la largeur du plat (le `cqw` du CSS des couvertures). */
const CQW = WIDTH / 100;
const GOLD = '#d9b56a';

export interface LeatherCover {
  front: THREE.CanvasTexture;
  back: THREE.CanvasTexture;
  /** Cuir nu, un peu usé : le dos et l'intérieur des plats. */
  plain: THREE.CanvasTexture;
}

const canvas = (): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const node = document.createElement('canvas');
  node.width = WIDTH;
  node.height = HEIGHT;
  return [node, node.getContext('2d')!];
};

/** Le cuir : plus sombre sur les bords, comme les plats du livre 2D. */
const leather = (context: CanvasRenderingContext2D, binding: Binding): void => {
  const glow = context.createRadialGradient(WIDTH / 2, HEIGHT / 2, WIDTH * 0.1, WIDTH / 2, HEIGHT / 2, WIDTH * 0.8);
  glow.addColorStop(0, binding.leather);
  glow.addColorStop(1, binding.dark);
  context.fillStyle = glow;
  context.fillRect(0, 0, WIDTH, HEIGHT);
};

/** Encadrement doré (modèles 1 à 3 des couvertures). */
const frame = (context: CanvasRenderingContext2D, model: number): void => {
  const box = (inset: number, width: number): void => {
    context.lineWidth = width * CQW;
    const at = (inset + width / 2) * CQW;
    context.strokeRect(at, at, WIDTH - 2 * at, HEIGHT - 2 * at);
  };
  context.save();
  context.strokeStyle = GOLD;
  context.globalAlpha = 0.85;
  if (model === 3) {
    // Filet double.
    box(7, 0.55);
    box(8.05, 0.55);
  } else box(7, 0.6);
  if (model === 2) box(5, 0.4);
  context.restore();
};

/** Or repoussé : dégradé doré, creux sombre dessous. */
const gilt = (context: CanvasRenderingContext2D, top: number, bottom: number): void => {
  const gold = context.createLinearGradient(0, top, 0, bottom);
  gold.addColorStop(0, '#f3dc9c');
  gold.addColorStop(0.55, '#c8993f');
  gold.addColorStop(1, '#8f6a26');
  context.fillStyle = gold;
  context.shadowColor = 'rgba(0, 0, 0, 0.55)';
  context.shadowOffsetY = 0.3 * CQW;
};

const title = (context: CanvasRenderingContext2D, words: string[]): void => {
  const size = 8 * CQW;
  const line = size * 1.15 + 1.5 * CQW;
  context.save();
  context.font = `${size}px Georgia, 'Times New Roman', serif`;
  context.letterSpacing = `${0.18 * size}px`;
  context.textAlign = 'center';
  context.textBaseline = 'top';
  const top = HEIGHT * 0.26;
  gilt(context, top, top + line * words.length);
  words.forEach((word, index) => {
    // Plusieurs mots trop larges : réduits pour tenir entre les filets.
    const width = context.measureText(word.toUpperCase()).width;
    const room = WIDTH - 24 * CQW;
    context.save();
    if (width > room) {
      context.translate(WIDTH / 2, 0);
      context.scale(room / width, 1);
      context.translate(-WIDTH / 2, 0);
    }
    context.fillText(word.toUpperCase(), WIDTH / 2, top + index * line);
    context.restore();
  });
  context.restore();
};

const wear = async (context: CanvasRenderingContext2D, design: CoverDesign, strength = 1): Promise<void> => {
  const svg = createWear(design, { strength }).querySelector('svg')!;
  context.drawImage(await svgImage(svg, WIDTH, HEIGHT), 0, 0, WIDTH, HEIGHT);
};

/**
 * Plats de cuir d'un livre ancien en texture, pour le livre 3D : le même décor que les couvertures du
 * livre 2D (coverArt.ts) — titre doré, encadrement, fleuron et usure devant ; filet et cote derrière.
 */
export const leatherCover = async (design: CoverDesign, binding: Binding): Promise<LeatherCover> => {
  const [front, frontContext] = canvas();
  leather(frontContext, binding);
  if (design.frame > 0) frame(frontContext, design.frame);
  title(frontContext, coverTitle(design));
  const flower = ornament(design.ornament).querySelector('svg')!;
  // Le fleuron est dessiné en `currentColor` : l'or de la couverture.
  flower.setAttribute('color', GOLD);
  const size = 18 * CQW;
  frontContext.save();
  frontContext.shadowColor = 'rgba(0, 0, 0, 0.5)';
  frontContext.shadowOffsetY = 0.3 * CQW;
  frontContext.drawImage(await svgImage(flower, size, size), (WIDTH - size) / 2, HEIGHT * 0.62 - size / 2, size, size);
  frontContext.restore();
  await wear(frontContext, design);

  const [back, backContext] = canvas();
  leather(backContext, binding);
  frame(backContext, 1);
  await wear(backContext, design);
  backContext.save();
  backContext.font = `${4.5 * CQW}px Georgia, 'Times New Roman', serif`;
  backContext.letterSpacing = `${0.2 * 4.5 * CQW}px`;
  backContext.textAlign = 'center';
  backContext.textBaseline = 'bottom';
  backContext.fillStyle = GOLD;
  backContext.globalAlpha = 0.9;
  backContext.fillText(shelfMarkText(design), WIDTH / 2, HEIGHT * 0.87);
  backContext.restore();

  const [plain, plainContext] = canvas();
  leather(plainContext, binding);
  await wear(plainContext, design, 0.5);

  return { front: canvasTexture(front), back: canvasTexture(back), plain: canvasTexture(plain) };
};
