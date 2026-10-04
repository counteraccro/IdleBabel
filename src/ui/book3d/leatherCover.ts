import type * as THREE from 'three';
import { cornerOrnament, ornament } from '../book/coverArt';
import { createWear } from '../book/coverWear';
import { shelfMarkText, type CoverDesign } from '../../systems/coverDesign';
import { coverTitle } from '../../systems/coverTitle';
import type { Binding } from '../book/bindings';
import { canvasTexture, svgImage } from './textures';
import { blindFrame, cartouche, corners, frieze, libraryMark, rubGold } from './ordinary/gilding';
import { halfBinding, paperLabel } from './ordinary/halfBinding';
import { leatherGrain } from './ordinary/leatherGrain';
import { endpaperGrain, marbledEndpaper } from './ordinary/endpapers';
import { ordinarySpine } from './ordinary/ordinarySpine';
import { MCQW, MH, MW, inMockup } from './ordinary/mockup';
import type { CoverDetails } from '../../systems/coverDetails';

/** Taille d'un plat en texture : la proportion de l'usure (100 × 125). */
export const WIDTH = 800;
export const HEIGHT = 1000;
/** Centième de la largeur du plat (le `cqw` du CSS des couvertures). */
export const CQW = WIDTH / 100;
const GOLD = '#d9b56a';

export interface LeatherCover {
  front: THREE.CanvasTexture;
  back: THREE.CanvasTexture;
  /** Cuir nu, un peu usé : le dos et l'intérieur des plats. */
  plain: THREE.CanvasTexture;
  /** Livre ordinaire (CoverDesign.details) : son dos orné, et ses gardes ; sinon le cuir nu. */
  spine?: THREE.CanvasTexture;
  inside?: THREE.CanvasTexture;
}

export const canvas = (): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const node = document.createElement('canvas');
  node.width = WIDTH;
  node.height = HEIGHT;
  return [node, node.getContext('2d')!];
};

/** Le cuir : plus sombre sur les bords, comme les couvertures du livre en main. */
const leather = (context: CanvasRenderingContext2D, binding: Binding): void => {
  const glow = context.createRadialGradient(WIDTH / 2, HEIGHT / 2, WIDTH * 0.1, WIDTH / 2, HEIGHT / 2, WIDTH * 0.8);
  glow.addColorStop(0, binding.leather);
  glow.addColorStop(1, binding.dark);
  context.fillStyle = glow;
  context.fillRect(0, 0, WIDTH, HEIGHT);
};

/** Encadrement doré (modèles 1 à 3 des couvertures). `roll` : la roulette remplace le filet extérieur du modèle 2. */
const frame = (context: CanvasRenderingContext2D, model: number, roll?: number): void => {
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
  if (model === 2 && roll === undefined) box(5, 0.4);
  context.restore();
  if (roll !== undefined && model > 0) inMockup(context, (mockup) => frieze(mockup, 4.6, roll));
};

/** Or repoussé : dégradé doré, creux sombre dessous (`shadow` faux : l'ombre viendra du calque d'or). */
const gilt = (context: CanvasRenderingContext2D, top: number, bottom: number, shadow = true): void => {
  const gold = context.createLinearGradient(0, top, 0, bottom);
  gold.addColorStop(0, '#f3dc9c');
  gold.addColorStop(0.55, '#c8993f');
  gold.addColorStop(1, '#8f6a26');
  context.fillStyle = gold;
  if (!shadow) return;
  context.shadowColor = 'rgba(0, 0, 0, 0.55)';
  context.shadowOffsetY = 0.3 * CQW;
};

const title = (context: CanvasRenderingContext2D, words: string[], shadow = true): void => {
  const size = 8 * CQW;
  const line = size * 1.15 + 1.5 * CQW;
  context.save();
  context.font = `${size}px Georgia, 'Times New Roman', serif`;
  context.letterSpacing = `${0.18 * size}px`;
  context.textAlign = 'center';
  context.textBaseline = 'top';
  const top = HEIGHT * 0.26;
  gilt(context, top, top + line * words.length, shadow);
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
 * Plats de cuir d'un livre ancien en texture, pour le livre 3D, tirés de sa couverture (coverDesign.ts) :
 * titre doré, encadrement, fleuron (coverArt.ts) et usure devant ; filet et cote derrière.
 */
export const leatherCover = async (design: CoverDesign, binding: Binding): Promise<LeatherCover> => {
  if (design.details && !design.strange) return ordinaryCover(design, design.details, binding);
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

/** Un fer doré (fleuron ou fer d'angle, en SVG `currentColor`) en image, à `size` pixels. */
const goldFer = (element: HTMLElement, size: number): Promise<HTMLImageElement> => {
  const svg = element.querySelector('svg')!;
  svg.setAttribute('color', GOLD);
  return svgImage(svg, size, size);
};

/** Un calque de la taille d'un plat. */
const layer = (): [HTMLCanvasElement, CanvasRenderingContext2D] => canvas();

/**
 * Un livre ordinaire (maquette .ai/maquette-livres-ordinaires.html) : grain du cuir, filets à froid, roulette,
 * fers d'angle, cartouche, fleuron parmi huit, or usé ; une demi-reliure sur quatre (papier marbré, titre
 * sur une étiquette) ; au dos les nerfs et la pièce de titre ; à l'intérieur, les gardes marbrées et l'ex-libris.
 */
const ordinaryCover = async (design: CoverDesign, details: CoverDetails, binding: Binding): Promise<LeatherCover> => {
  const words = coverTitle(design);
  const [flower, fer] = await Promise.all([
    goldFer(ornament(details.ornament), 18 * CQW),
    goldFer(cornerOrnament(details.corner), 12 * CQW),
  ]);

  const [front, frontContext] = canvas();
  leather(frontContext, binding);
  inMockup(frontContext, (mockup) => leatherGrain(mockup, MW, MH, details.seed));
  if (details.half)
    inMockup(frontContext, (mockup) => {
      halfBinding(mockup, details, binding, true);
      paperLabel(
        mockup,
        words.map((word) => word.toUpperCase()),
        MW * 0.6,
        MH * 0.3,
        44 * MCQW,
        4.6 * MCQW,
        -0.012,
      );
    });
  else {
    inMockup(frontContext, (mockup) => blindFrame(mockup, design.frame > 0 ? 11 : 7));
    const [gold, goldContext] = layer();
    if (design.frame > 0) frame(goldContext, design.frame, details.roll);
    inMockup(goldContext, (mockup) => corners(mockup, fer, design.frame > 0 ? 7.6 : 6));
    title(goldContext, words, false);
    if (details.cartouche) inMockup(goldContext, (mockup) => cartouche(mockup, words, details.cartouche));
    const size = 18 * CQW;
    goldContext.drawImage(flower, (WIDTH - size) / 2, HEIGHT * 0.62 - size / 2, size, size);
    inMockup(goldContext, (mockup) => rubGold(mockup, design, details.seed));
    frontContext.save();
    frontContext.shadowColor = 'rgba(0, 0, 0, 0.55)';
    frontContext.shadowOffsetY = 0.3 * CQW;
    frontContext.drawImage(gold, 0, 0);
    frontContext.restore();
  }
  await wear(frontContext, design);

  const [back, backContext] = canvas();
  leather(backContext, binding);
  inMockup(backContext, (mockup) => leatherGrain(mockup, MW, MH, details.seed + 1));
  if (details.half) inMockup(backContext, (mockup) => halfBinding(mockup, details, binding, false));
  else {
    frame(backContext, 1);
    inMockup(backContext, (mockup) => blindFrame(mockup, 11));
    const [gold, goldContext] = layer();
    inMockup(goldContext, (mockup) => {
      corners(mockup, fer, 7.6, 9);
      rubGold(mockup, design, details.seed);
    });
    backContext.drawImage(gold, 0, 0);
    inMockup(backContext, (mockup) => libraryMark(mockup, MW / 2, MH * 0.45, 9 * MCQW));
  }
  await wear(backContext, design);
  if (details.half)
    inMockup(backContext, (mockup) => paperLabel(mockup, [shelfMarkText(design)], MW * 0.4, MH * 0.86, 30 * MCQW, 3.6 * MCQW, 0.02));
  else {
    backContext.save();
    backContext.font = `${4.5 * CQW}px Georgia, 'Times New Roman', serif`;
    backContext.letterSpacing = `${0.2 * 4.5 * CQW}px`;
    backContext.textAlign = 'center';
    backContext.textBaseline = 'bottom';
    backContext.fillStyle = GOLD;
    backContext.globalAlpha = 0.9;
    backContext.fillText(shelfMarkText(design), WIDTH / 2, HEIGHT * 0.87);
    backContext.restore();
  }

  const [plain, plainContext] = canvas();
  leather(plainContext, binding);
  await wear(plainContext, design, 0.5);

  const [inside, insideContext] = canvas();
  leather(insideContext, binding);
  inMockup(insideContext, (mockup) => endpaperGrain(mockup, details));
  await wear(insideContext, design, 0.5);
  inMockup(insideContext, (mockup) => marbledEndpaper(mockup, design, details));

  const spine = await ordinarySpine(design, details, binding, flower);
  return {
    front: canvasTexture(front),
    back: canvasTexture(back),
    plain: canvasTexture(plain),
    spine: canvasTexture(spine),
    inside: canvasTexture(inside),
  };
};
