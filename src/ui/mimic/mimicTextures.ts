import { coverDesign } from '../../systems/coverDesign';
import { bindingFor, type Binding } from '../book/bindings';
import { OLD_PAPER } from '../book/pageRender';
import { leatherCover } from '../book3d/leatherCover';
import { leatherGrain } from '../book3d/ordinary/leatherGrain';
import { rng } from '../book3d/ordinary/mockup';
import { TEX_H as H, TEX_W as W } from './mimicEyes';
import type { EdgeKind } from '../../systems/coverDetails';

/**
 * Les textures de la Mimic (maquette .ai/maquette-mimic.html) : un livre ORDINAIRE de la Bibliothèque (son plat, son dos,
 * son plat arrière, ceux du jeu), ses plats épais qui dépassent des pages, et ce qu'on voit quand elle ouvre la bouche :
 * les dents jaunies sous le plat, la gorge dans les pages.
 */

/** Le dos et les tranches, dans le repère de la maquette. */
const SPINE_W = 134;
const EDGE_W = 96;

export interface MimicTextures {
  binding: Binding;
  /** Par nom de texture (voir FACES dans mimicBook.ts). */
  canvases: Record<string, HTMLCanvasElement>;
}

const make = (w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const node = document.createElement('canvas');
  node.width = w;
  node.height = h;
  return [node, node.getContext('2d')!];
};

/** Une texture du jeu, ramenée à la taille de la maquette. */
const resized = (source: CanvasImageSource, w: number, h: number): HTMLCanvasElement => {
  const [node, ctx] = make(w, h);
  ctx.drawImage(source, 0, 0, w, h);
  return node;
};

/** Le papier des tranches, selon la tranche du livre (nature, teinte, dorée ; jaspée : mouchetée). */
const EDGE_COLORS: Partial<Record<EdgeKind, string>> = { red: '#a3352a', yellow: '#d9b24a', gilt: '#cfa952' };
const SPRINKLES: Partial<Record<EdgeKind, string>> = { redSprinkle: '165,40,28', blueSprinkle: '40,62,120' };

/**
 * Les feuilles vues par la tranche (long) ou par la tête et la queue (court) : du papier, une ligne par feuille.
 * Les plats sont des pièces à part, qui dépassent : le papier est en retrait, dans leur ombre en haut et en bas.
 */
const pages = (edge: EdgeKind, seed: number, w: number, h: number, lines: 'v' | 'h'): HTMLCanvasElement => {
  const [node, ctx] = make(w, h);
  const r = rng(seed + (lines === 'v' ? 17 : 19));
  ctx.fillStyle = EDGE_COLORS[edge] ?? OLD_PAPER[1];
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(80,55,25,0.35)';
  if (lines === 'v') for (let x = 0; x < w; x += 2.2) ctx.fillRect(x, 0, r() < 0.3 ? 0.8 : 0.45, h);
  else for (let y = 0; y < h; y += 2.2) ctx.fillRect(0, y, w, r() < 0.3 ? 0.8 : 0.45);
  const sprinkle = SPRINKLES[edge];
  if (sprinkle)
    for (let i = 0; i < (w * h) / 40; i++) {
      ctx.fillStyle = `rgba(${sprinkle},${0.4 + r() * 0.4})`;
      ctx.beginPath();
      ctx.arc(r() * w, r() * h, 0.6 + r() * 1.2, 0, 2 * Math.PI);
      ctx.fill();
    }
  // L'ombre des deux plats sur le papier, plus forte sous celui du dessus.
  const g = lines === 'v' ? ctx.createLinearGradient(0, 0, w, 0) : ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(20,8,0,0.75)');
  g.addColorStop(0.22, 'rgba(20,8,0,0)');
  g.addColorStop(0.85, 'rgba(20,8,0,0)');
  g.addColorStop(1, 'rgba(20,8,0,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // La tranche est creuse (en gouttière) : plus sombre au milieu de sa longueur.
  const cross = lines === 'v' ? ctx.createLinearGradient(0, 0, 0, h) : ctx.createLinearGradient(0, 0, w, 0);
  cross.addColorStop(0, 'rgba(255,240,210,0.08)');
  cross.addColorStop(0.5, 'rgba(40,20,0,0.12)');
  cross.addColorStop(1, 'rgba(255,240,210,0.08)');
  ctx.fillStyle = cross;
  ctx.fillRect(0, 0, w, h);
  return node;
};

/** Le chant d'un plat : du cuir, une arête usée plus claire du côté du dessus (x ou y = 0 : le dessus). */
const boardEdge = (binding: Binding, seed: number, w: number, h: number): HTMLCanvasElement => {
  const [node, ctx] = make(w, h);
  ctx.fillStyle = binding.leather;
  ctx.fillRect(0, 0, w, h);
  leatherGrain(ctx, w, h, seed + 9, 0.8);
  const g = h > w ? ctx.createLinearGradient(0, 0, w, 0) : ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, 'rgba(255,225,180,0.32)');
  g.addColorStop(0.25, 'rgba(255,225,180,0.08)');
  g.addColorStop(0.8, 'rgba(0,0,0,0.1)');
  g.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  return node;
};

/** L'intérieur d'un plat (ce qui dépasse sous les pages) : du cuir rabattu, sombre. */
const boardInside = (binding: Binding): HTMLCanvasElement => {
  const [node, ctx] = make(64, 64);
  ctx.fillStyle = binding.dark;
  ctx.fillRect(0, 0, 64, 64);
  return node;
};

/** Une rangée de dents jaunies le long d'un bord (x = edge), pointées vers l'intérieur (sens dir). */
const teeth = (ctx: CanvasRenderingContext2D, edge: number, dir: number, seed: number): void => {
  const r = rng(seed);
  const n = 9;
  for (let i = 0; i < n; i++) {
    const y0 = H * (0.06 + (0.88 * i) / n);
    const y1 = H * (0.06 + (0.88 * (i + 1)) / n);
    const long = W * (0.12 + r() * 0.07);
    const g = ctx.createLinearGradient(edge, 0, edge + dir * long, 0);
    g.addColorStop(0, '#d8cba0');
    g.addColorStop(1, '#f4ecd0');
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(60,30,10,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(edge, y0 + 2);
    ctx.lineTo(edge + dir * long, (y0 + y1) / 2 + (r() - 0.5) * 6);
    ctx.lineTo(edge, y1 - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
};

/** Dessous du plat : une gencive sombre, les dents du haut le long de la tranche (x = 0 dans ce repère). */
const coverInside = (seed: number): HTMLCanvasElement => {
  const [node, ctx] = make(W, H);
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#5a1414');
  g.addColorStop(1, '#1a0606');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  teeth(ctx, 0, 1, seed + 5);
  return node;
};

/** Le dessus des pages, quand elle ouvre la bouche : le papier, une gorge au milieu, les dents du bas le long de la tranche. */
const pagesTop = (seed: number): HTMLCanvasElement => {
  const [node, ctx] = make(W, H);
  ctx.fillStyle = OLD_PAPER[0];
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.55, H / 2, 10, W * 0.55, H / 2, W * 0.5);
  g.addColorStop(0, '#080202');
  g.addColorStop(0.55, '#3a0a0a');
  g.addColorStop(0.75, '#6a2a1a');
  g.addColorStop(1, 'rgba(106,42,26,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(W * 0.55, H / 2, W * 0.4, H * 0.42, 0, 0, 2 * Math.PI);
  ctx.fill();
  teeth(ctx, W, -1, seed + 6);
  return node;
};

/**
 * Le livre n° `book` de la Bibliothèque, ou le premier après lui qui soit une reliure de cuir entière : ni livre moderne,
 * ni demi-reliure (le plat de papier marbré ne ferait pas de paupières).
 */
export const mimicBookIndex = (book: number): number => {
  for (let index = book; ; index++) {
    const design = coverDesign(index);
    if (!design.modern && design.details && !design.details.half) return index;
  }
};

export const mimicTextures = async (book: number): Promise<MimicTextures> => {
  const index = mimicBookIndex(book);
  const design = coverDesign(index);
  const details = design.details!;
  const binding = bindingFor(index);
  const cover = await leatherCover(design, binding);
  const image = (texture: { image: unknown } | undefined) => texture?.image as CanvasImageSource;
  const seed = details.seed;
  return {
    binding,
    canvases: {
      cover: resized(image(cover.front), W, H),
      back: resized(image(cover.back), W, H),
      spine: resized(image(cover.spine ?? cover.plain), SPINE_W, H),
      coverIn: coverInside(seed),
      edgeV: boardEdge(binding, seed, 28, H),
      edgeH: boardEdge(binding, seed, W, 28),
      baseIn: boardInside(binding),
      pagesTop: pagesTop(seed),
      fore: pages(details.edge, seed, EDGE_W, H, 'v'),
      tail: pages(details.edge, seed, W, EDGE_W, 'h'),
      head: pages(details.edge, seed, W, EDGE_W, 'h'),
    },
  };
};
