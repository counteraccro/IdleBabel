import * as THREE from 'three';
import { seeded } from '../../core/random';
import { randomBabelText } from '../../systems/babelText';
import { SETS, type PieceId } from '../../data/curiosities';
import { setTitle } from './atelierText';
import type { CuriosityPiece } from '../../core/state';

/**
 * Ce que l'atelier dessine sur des toiles (maquette validée, .ai/maquette-atelier-interface.html, mêmes mesures) : les pièces
 * d'une curiosité (cuir ou papier marbré, ornements, puis l'usure de leur état ; une pièce S porte son vrai titre, en or), et
 * le papier écrit à la main (étiquettes, cartes, fiches de rang).
 */

export const canvasOf = (width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return [canvas, canvas.getContext('2d')!];
};

export const textureOf = (canvas: HTMLCanvasElement): THREE.CanvasTexture => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

type Ctx = CanvasRenderingContext2D;
type Random = () => number;
const GOLD = '#e3c26f';

const wrap = (x: Ctx, text: string, max: number): string[] => {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (x.measureText(next).width > max && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
};

const hexagon = (x: Ctx, cx: number, cy: number, r: number): void => {
  x.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    x.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  x.closePath();
};

const leather = (x: Ctx, w: number, h: number, hue: number, r: Random, gold: boolean): void => {
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, `hsl(${hue} ${gold ? 42 : 30}% ${gold ? 27 : 24}%)`);
  g.addColorStop(1, `hsl(${hue} ${gold ? 38 : 26}% ${gold ? 17 : 15}%)`);
  x.fillStyle = g;
  x.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 40; i++) {
    x.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,235,200'},${r() * 0.07})`;
    x.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
  }
};

const marble = (x: Ctx, w: number, h: number, hue: number, r: Random): void => {
  x.fillStyle = `hsl(${hue} 28% 72%)`;
  x.fillRect(0, 0, w, h);
  x.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    x.strokeStyle = `hsla(${hue + (r() - 0.5) * 90} ${30 + r() * 30}% ${28 + r() * 45}% / ${0.25 + r() * 0.35})`;
    x.lineWidth = 1.5 + r() * 6;
    const y = r() * h;
    const a = r() * w;
    x.beginPath();
    x.moveTo(a - 60, y);
    x.bezierCurveTo(a - 20, y - 30 * r(), a + 20, y + 30 * r(), a + 60, y + (r() - 0.5) * 20);
    x.stroke();
  }
  x.fillStyle = 'rgba(240,230,205,0.18)';
  x.fillRect(0, 0, w, h);
};

const blindFrame = (x: Ctx, w: number, h: number, inset: number): void => {
  x.lineWidth = 3;
  x.strokeStyle = 'rgba(0,0,0,0.38)';
  x.strokeRect(inset, inset, w - 2 * inset, h - 2 * inset);
  x.lineWidth = 1;
  x.strokeStyle = 'rgba(255,230,190,0.10)';
  x.strokeRect(inset + 2, inset + 2, w - 2 * inset, h - 2 * inset);
};

const goldFrame = (x: Ctx, w: number, h: number): void => {
  x.strokeStyle = GOLD;
  x.lineWidth = 2.5;
  x.strokeRect(16, 16, w - 32, h - 32);
  x.lineWidth = 1;
  x.strokeRect(24, 24, w - 48, h - 48);
  x.fillStyle = GOLD;
  for (const [a, b] of [
    [24, 24],
    [w - 24, 24],
    [24, h - 24],
    [w - 24, h - 24],
  ]) {
    x.beginPath();
    x.arc(a, b, 5, 0, Math.PI * 2);
    x.fill();
  }
};

const front = (x: Ctx, w: number, h: number, title: string, set: string | null): void => {
  if (set) {
    goldFrame(x, w, h);
    x.fillStyle = GOLD;
    x.font = "600 25px 'Cinzel'";
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    const lines = wrap(x, set, w - 74);
    lines.forEach((line, i) => x.fillText(line, w / 2, 120 + (i - (lines.length - 1) / 2) * 34));
    x.lineWidth = 2;
    x.strokeStyle = GOLD;
    hexagon(x, w / 2, h * 0.66, 30);
    x.stroke();
    hexagon(x, w / 2, h * 0.66, 18);
    x.stroke();
    return;
  }
  blindFrame(x, w, h, 18);
  x.fillStyle = 'rgba(214,186,120,0.55)';
  x.font = "600 20px 'Cinzel'";
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  wrap(x, title, w - 80)
    .slice(0, 3)
    .forEach((line, i) => x.fillText(line, w / 2, 100 + i * 28));
  x.fillStyle = 'rgba(214,186,120,0.4)';
  x.beginPath();
  x.moveTo(w / 2, h - 110);
  x.lineTo(w / 2 + 9, h - 98);
  x.lineTo(w / 2, h - 86);
  x.lineTo(w / 2 - 9, h - 98);
  x.fill();
};

const back = (x: Ctx, w: number, h: number, set: string | null): void => {
  if (set) {
    goldFrame(x, w, h);
    x.strokeStyle = GOLD;
    x.lineWidth = 2;
    hexagon(x, w / 2, h / 2, 16);
    x.stroke();
    return;
  }
  blindFrame(x, w, h, 18);
  blindFrame(x, w, h, 30);
};

const spine = (x: Ctx, w: number, title: string, set: string | null): void => {
  for (const y of [34, 110, 300, 376]) {
    x.fillStyle = 'rgba(0,0,0,0.45)';
    x.fillRect(0, y, w, 9);
    x.fillStyle = 'rgba(255,230,190,0.16)';
    x.fillRect(0, y, w, 2);
  }
  x.save();
  x.translate(w / 2, 205);
  x.rotate(-Math.PI / 2);
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  if (set) {
    x.fillStyle = GOLD;
    x.font = "600 15px 'Cinzel'";
    x.fillText(set.length > 24 ? `${set.slice(0, 23)}…` : set, 0, 0);
  } else {
    x.fillStyle = 'rgba(214,186,120,0.5)';
    x.font = "600 14px 'Cinzel'";
    x.fillText(title.slice(0, 13), 0, 0);
  }
  x.restore();
  if (set) {
    x.strokeStyle = GOLD;
    x.lineWidth = 1.5;
    hexagon(x, w / 2, 340, 10);
    x.stroke();
  }
};

const exlibris = (x: Ctx, w: number, h: number, set: string): void => {
  x.fillStyle = '#efe4c6';
  x.fillRect(w / 2 - 82, h / 2 - 62, 164, 124);
  x.strokeStyle = '#5a4630';
  x.lineWidth = 2;
  x.strokeRect(w / 2 - 76, h / 2 - 56, 152, 112);
  x.fillStyle = '#4a3a28';
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.font = "600 13px 'Cinzel'";
  x.fillText('EX-LIBRIS', w / 2, h / 2 - 36);
  x.font = 'italic 15px Georgia';
  wrap(x, set, 136).forEach((line, i, all) => x.fillText(line, w / 2, h / 2 + 4 + (i - (all.length - 1) / 2) * 18));
};

/** L'usure de l'état : neuf lustré ; usagé, coins frottés et éraflures ; médiocre, tache d'eau, coin arraché, couleur éteinte. */
const wear = (x: Ctx, w: number, h: number, state: number, r: Random, paper: boolean): void => {
  if (state === 3) {
    const g = x.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, 'rgba(255,240,210,0.13)');
    g.addColorStop(0.45, 'rgba(255,240,210,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    return;
  }
  const k = 3 - state;
  x.lineCap = 'round';
  for (let i = 0; i < k * k * 9; i++) {
    x.strokeStyle = paper ? `rgba(110,80,40,${0.06 + r() * 0.1})` : `rgba(235,215,180,${0.07 + r() * 0.13})`;
    x.lineWidth = 0.6 + r() * 1.5;
    const a = r() * w;
    const b = r() * h;
    const l = 6 + r() * 34;
    const an = r() * Math.PI;
    x.beginPath();
    x.moveTo(a, b);
    x.lineTo(a + Math.cos(an) * l, b + Math.sin(an) * l);
    x.stroke();
  }
  if (k >= 2) {
    for (const [a, b] of [
      [0, 0],
      [w, 0],
      [0, h],
      [w, h],
    ]) {
      const g = x.createRadialGradient(a, b, 0, a, b, 26 + k * 14);
      g.addColorStop(0, paper ? 'rgba(120,85,40,0.35)' : `rgba(190,160,120,${0.18 * k})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, w, h);
    }
    x.strokeStyle = 'rgba(0,0,0,0.28)';
    x.lineWidth = 12;
    x.strokeRect(0, 0, w, h);
    if (paper)
      for (let i = 0; i < k * 14; i++) {
        x.fillStyle = `rgba(140,90,40,${0.15 + r() * 0.3})`;
        x.beginPath();
        x.arc(r() * w, r() * h, 1 + r() * 4, 0, Math.PI * 2);
        x.fill();
      }
  }
  if (k >= 3) {
    x.globalCompositeOperation = 'saturation';
    x.fillStyle = 'rgba(128,128,128,0.55)';
    x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'source-over';
    const cx = w * (0.3 + r() * 0.4);
    const cy = h * (0.45 + r() * 0.3);
    const radius = Math.min(w, h) * 0.28;
    x.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const q = radius * (0.8 + r() * 0.35);
      x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q * 1.2);
    }
    x.closePath();
    x.fillStyle = paper ? 'rgba(150,110,60,0.22)' : 'rgba(90,60,30,0.16)';
    x.fill();
    x.strokeStyle = 'rgba(70,45,20,0.5)';
    x.lineWidth = 3;
    x.stroke();
    x.fillStyle = '#140d07';
    x.beginPath();
    x.moveTo(w, h - 70 - r() * 30);
    for (let i = 1; i < 7; i++) x.lineTo(w - i * 11 - r() * 8, h - 70 + i * 10 + r() * 6);
    x.lineTo(w - 90, h);
    x.lineTo(w, h);
    x.fill();
  }
};

/** Le titre d'une pièce ordinaire : du charabia de Babel, tiré de sa graine (il la suit d'un livre à l'autre). */
const pieceTitle = (piece: CuriosityPiece): string => randomBabelText(16, seeded(piece.seed)).trim();

/** L'image d'une pièce : gardée tant que la page est ouverte (libérée avec elle : `dispose`). */
export const createPieceTextures = () => {
  const cache = new Map<string, THREE.CanvasTexture>();
  const piece = (part: PieceId, p: CuriosityPiece): THREE.CanvasTexture => {
    const key = `${part}|${p.seed}|${p.hue}|${p.state}|${p.set ?? ''}`;
    const known = cache.get(key);
    if (known) return known;
    const set = p.set !== undefined ? setTitle(p.set) : null;
    const [w, h] = part === 'spine' ? [64, 410] : [300, 410];
    const [canvas, x] = canvasOf(w, h);
    const r = seeded(p.seed);
    const hue = p.set !== undefined ? SETS[p.set].hue : p.hue;
    if (part === 'endpaper') marble(x, w, h, hue, r);
    else leather(x, w, h, hue, r, set !== null);
    const title = pieceTitle(p);
    if (part === 'front') front(x, w, h, title, set);
    if (part === 'back') back(x, w, h, set);
    if (part === 'spine') spine(x, w, title, set);
    if (part === 'endpaper' && set) exlibris(x, w, h, set);
    wear(x, w, h, p.state, r, part === 'endpaper');
    const texture = textureOf(canvas);
    cache.set(key, texture);
    return texture;
  };
  return { piece, dispose: () => cache.forEach((texture) => texture.dispose()) };
};

/** Une ligne de papier écrit à la main : son texte, et ses options (taille, gras, couleur, pas jusqu'à la suivante). */
export type NoteLine = string | [string, { size?: number; bold?: boolean; color?: string; step?: number }];

/** Du papier écrit à la main (étiquettes, cartes, notes), comme la maquette. */
export const note = (
  w: number,
  h: number,
  lines: NoteLine[],
  {
    frame = false,
    size = 30,
    bg = '#efe4c6',
    align = 'center',
    top = null,
  }: { frame?: boolean; size?: number; bg?: string; align?: CanvasTextAlign; top?: number | null } = {},
): HTMLCanvasElement => {
  const [canvas, x] = canvasOf(w, h);
  if (frame) {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#d9b768');
    g.addColorStop(0.5, '#8a6a30');
    g.addColorStop(1, '#c9a458');
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.fillStyle = bg;
    x.fillRect(9, 9, w - 18, h - 18);
  } else {
    x.fillStyle = bg;
    x.fillRect(0, 0, w, h);
  }
  const r = seeded(w * 7 + h);
  for (let i = 0; i < 300; i++) {
    x.fillStyle = `rgba(120,90,50,${r() * 0.06})`;
    x.fillRect(r() * w, r() * h, 2, 2);
  }
  x.textBaseline = 'middle';
  x.textAlign = align;
  const step = h / (lines.length + 1);
  lines.forEach((line, i) => {
    const [text, options = {}] = typeof line === 'string' ? [line] : line;
    x.font = `${options.bold ? 600 : 400} ${options.size ?? size}px 'Caveat'`;
    x.fillStyle = options.color ?? '#2a2a3a';
    x.fillText(text, align === 'center' ? w / 2 : 22, (top ?? step) + i * (top !== null ? (options.step ?? size * 1.1) : step));
  });
  return canvas;
};

/** Redessine un papier dans la toile d'une étiquette déjà posée. */
export const repaint = (canvas: HTMLCanvasElement, texture: THREE.Texture, paper: HTMLCanvasElement): void => {
  const x = canvas.getContext('2d')!;
  x.clearRect(0, 0, canvas.width, canvas.height);
  x.drawImage(paper, 0, 0);
  texture.needsUpdate = true;
};

/** La fiche glissée dans les pages : le rang, au crayon. */
export const slipCanvas = (rank: string, gold: boolean): HTMLCanvasElement => {
  const [canvas, x] = canvasOf(48, 200);
  x.fillStyle = '#ece0c0';
  x.fillRect(0, 0, 48, 200);
  x.fillStyle = gold ? '#a07818' : '#3a3a44';
  x.font = "600 44px 'Caveat'";
  x.textAlign = 'center';
  x.textBaseline = 'middle';
  x.fillText(rank, 24, 36);
  return canvas;
};
