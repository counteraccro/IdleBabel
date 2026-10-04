import '@fontsource/bangers/400.css';
import { coverTitle } from '../../../systems/coverTitle';
import { MCQW, MH, MW, SPINE_W, mockupCanvas, rng, type Context } from './mockup';
import { babelWord, barcode, gloss, publisherMark } from './modernDraw';
import type { CoverDesign } from '../../../systems/coverDesign';
import type { CoverDetails } from '../../../systems/coverDetails';

/**
 * La bande dessinée (maquette .ai/maquette-livres-ordinaires.html) : un album numéroté d'une série, une case
 * avec des rayons, une trame, un lecteur surpris, une bulle et une onomatopée ; au dos, les albums de la série.
 */
const BANGERS = "'Bangers', Impact, sans-serif";

/** Couleurs des séries : fond de la case, rayons, encre vive. */
export const COMIC = [
  { paper: '#f7d117', dark: '#d9a90a', ink: '#e8402a' },
  { paper: '#2bb6d9', dark: '#1a8db0', ink: '#f7d117' },
  { paper: '#e8402a', dark: '#b82a18', ink: '#f7d117' },
  { paper: '#7ac143', dark: '#559a28', ink: '#e8402a' },
] as const;
type Palette = (typeof COMIC)[number];

export const loadComicFonts = (): Promise<unknown> => document.fonts.load(`40px ${BANGERS}`);

/** Lettrage de bande dessinée : lettres pleines, contour noir épais, ombre portée décalée. */
const comicText = (context: Context, value: string, x: number, y: number, size: number, fill: string, room?: number, angle = 0): void => {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.font = `${size}px ${BANGERS}`;
  context.letterSpacing = `${size * 0.03}px`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const width = context.measureText(value).width;
  if (room && width > room) context.scale(room / width, 1);
  context.lineJoin = 'round';
  context.lineWidth = size * 0.16;
  context.strokeStyle = '#111';
  context.fillStyle = '#111';
  context.fillText(value, size * 0.06, size * 0.07);
  context.strokeText(value, size * 0.06, size * 0.07);
  context.strokeText(value, 0, 0);
  context.fillStyle = fill;
  context.fillText(value, 0, 0);
  context.restore();
};

/** Le chemin d'une étoile d'onomatopée, aux branches inégales. */
const burst = (context: Context, cx: number, cy: number, rays: number, inner: number, outer: number, random: () => number): void => {
  context.beginPath();
  for (let i = 0; i < rays * 2; i++) {
    const angle = (i * Math.PI) / rays;
    const radius = i % 2 ? inner * (0.85 + random() * 0.3) : outer * (0.8 + random() * 0.35);
    if (i) context.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    else context.moveTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
  }
  context.closePath();
};

/** Trame d'imprimerie : des points qui grossissent en s'éloignant de (cx, cy). */
const halftone = (context: Context, x: number, y: number, w: number, h: number, color: string, cx: number, cy: number): void => {
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  context.fillStyle = color;
  const [step, far] = [1.6 * MCQW, Math.hypot(w, h)];
  for (let j = 0; j * step < h + step; j++)
    for (let i = 0; i * step < w + step; i++) {
      const [px, py] = [x + i * step + ((j % 2) * step) / 2, y + j * step];
      const radius = (Math.hypot(px - cx, py - cy) / far) * step * 0.95;
      if (radius > 0.4) {
        context.beginPath();
        context.arc(px, py, Math.min(radius, step * 0.55), 0, 2 * Math.PI);
        context.fill();
      }
    }
  context.restore();
};

/** Le héros de la série : un lecteur surpris, un livre ouvert dans les mains. */
const reader = (context: Context, cx: number, cy: number, s: number, palette: Palette): void => {
  context.save();
  context.lineWidth = 0.7 * MCQW;
  context.strokeStyle = '#111';
  context.lineJoin = 'round';
  context.lineCap = 'round';
  // Corps.
  context.fillStyle = palette.ink;
  context.beginPath();
  context.moveTo(cx - s * 0.55, cy + s * 1.6);
  context.quadraticCurveTo(cx - s * 0.6, cy + s * 0.55, cx, cy + s * 0.5);
  context.quadraticCurveTo(cx + s * 0.6, cy + s * 0.55, cx + s * 0.55, cy + s * 1.6);
  context.closePath();
  context.fill();
  context.stroke();
  // Tête, cheveux en pointes, yeux ronds, bouche bée.
  context.fillStyle = '#ffe0c2';
  context.beginPath();
  context.arc(cx, cy, s * 0.42, 0, 2 * Math.PI);
  context.fill();
  context.stroke();
  context.fillStyle = '#111';
  context.beginPath();
  context.moveTo(cx - s * 0.42, cy - s * 0.05);
  for (let i = 0; i <= 6; i++) {
    const [angle, radius] = [Math.PI + (i * Math.PI) / 6, s * (i % 2 ? 0.75 : 0.42)];
    context.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius - s * 0.05);
  }
  context.closePath();
  context.fill();
  for (const dx of [-0.15, 0.15]) {
    context.fillStyle = '#fff';
    context.beginPath();
    context.ellipse(cx + dx * s, cy + s * 0.05, s * 0.1, s * 0.13, 0, 0, 2 * Math.PI);
    context.fill();
    context.stroke();
    context.fillStyle = '#111';
    context.beginPath();
    context.arc(cx + dx * s, cy + s * 0.08, s * 0.04, 0, 2 * Math.PI);
    context.fill();
  }
  context.beginPath();
  context.ellipse(cx, cy + s * 0.27, s * 0.06, s * 0.08, 0, 0, 2 * Math.PI);
  context.fillStyle = '#111';
  context.fill();
  // Le livre ouvert, tenu devant.
  context.fillStyle = '#fff';
  context.beginPath();
  context.moveTo(cx - s * 0.62, cy + s * 0.95);
  context.lineTo(cx, cy + s * 1.05);
  context.lineTo(cx + s * 0.62, cy + s * 0.95);
  context.lineTo(cx + s * 0.6, cy + s * 1.45);
  context.lineTo(cx, cy + s * 1.55);
  context.lineTo(cx - s * 0.6, cy + s * 1.45);
  context.closePath();
  context.fill();
  context.stroke();
  context.beginPath();
  context.moveTo(cx, cy + s * 1.05);
  context.lineTo(cx, cy + s * 1.55);
  context.stroke();
  context.lineWidth = 0.3 * MCQW;
  for (let k = 0; k < 3; k++)
    for (const side of [-1, 1]) {
      context.beginPath();
      context.moveTo(cx + side * s * 0.12, cy + s * (1.15 + k * 0.1));
      context.lineTo(cx + side * s * 0.5, cy + s * (1.1 + k * 0.1));
      context.stroke();
    }
  context.restore();
};

export const comicFront = (design: CoverDesign, details: CoverDetails): HTMLCanvasElement => {
  const [node, context] = mockupCanvas(MW, MH);
  const random = rng(details.seed + 61);
  const palette = COMIC[details.comicColor];
  context.fillStyle = '#fff';
  context.fillRect(0, 0, MW, MH);
  // Le bandeau de la collection : logo, nom de la série, numéro de l'album.
  context.save();
  context.font = `${4.2 * MCQW}px ${BANGERS}`;
  context.letterSpacing = `${0.3 * MCQW}px`;
  context.fillStyle = '#111';
  context.textBaseline = 'middle';
  context.fillText(`${babelWord(random).toUpperCase()} ${design.author[0].toUpperCase()}`, 17 * MCQW, 6.5 * MCQW);
  context.restore();
  publisherMark(context, 7, 3.5, '#111');
  context.fillStyle = palette.ink;
  context.beginPath();
  context.arc(88 * MCQW, 6.5 * MCQW, 4.6 * MCQW, 0, 2 * Math.PI);
  context.fill();
  context.lineWidth = 0.5 * MCQW;
  context.strokeStyle = '#111';
  context.stroke();
  comicText(context, String(details.album), 88 * MCQW, 6.9 * MCQW, 5.6 * MCQW, '#fff');
  // La case : rayons, trame, personnage, onomatopée, bulle.
  const [x, y, w, h] = [4 * MCQW, 13 * MCQW, 92 * MCQW, 108 * MCQW];
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  context.fillStyle = palette.paper;
  context.fillRect(x, y, w, h);
  const [fx, fy] = [x + w * 0.5, y + h * 0.62];
  context.fillStyle = palette.dark;
  for (let i = 0; i < 24; i += 2) {
    const [a0, a1] = [(i * Math.PI) / 12, ((i + 1) * Math.PI) / 12];
    context.beginPath();
    context.moveTo(fx, fy);
    context.lineTo(fx + Math.cos(a0) * MW * 2, fy + Math.sin(a0) * MW * 2);
    context.lineTo(fx + Math.cos(a1) * MW * 2, fy + Math.sin(a1) * MW * 2);
    context.closePath();
    context.fill();
  }
  halftone(context, x, y + h * 0.55, w, h * 0.45, 'rgba(0,0,0,0.18)', fx, fy - h * 0.1);
  reader(context, fx, fy + h * 0.04, 18 * MCQW, palette);
  // Onomatopée, en haut à droite.
  context.fillStyle = '#fff';
  context.strokeStyle = '#111';
  context.lineWidth = 0.6 * MCQW;
  burst(context, x + w * 0.74, y + h * 0.43, 11, 9 * MCQW, 15 * MCQW, random);
  context.fill();
  context.stroke();
  comicText(
    context,
    `${babelWord(random).slice(0, 4).toUpperCase()} !`,
    x + w * 0.74,
    y + h * 0.43,
    7 * MCQW,
    palette.ink,
    20 * MCQW,
    -0.15,
  );
  // Bulle, à gauche du personnage.
  const [bx, by] = [x + w * 0.24, y + h * 0.43];
  context.fillStyle = '#fff';
  context.beginPath();
  context.ellipse(bx, by, 14 * MCQW, 7.5 * MCQW, 0, 0, 2 * Math.PI);
  context.moveTo(bx + 6 * MCQW, by + 6 * MCQW);
  context.lineTo(fx - 7 * MCQW, fy - 8 * MCQW);
  context.lineTo(bx + 11 * MCQW, by + 4 * MCQW);
  context.fill();
  context.beginPath();
  context.ellipse(bx, by, 14 * MCQW, 7.5 * MCQW, 0, -0.9, 0.62 + Math.PI * 0.03, true);
  context.lineTo(fx - 7 * MCQW, fy - 8 * MCQW);
  context.lineTo(bx + 6 * MCQW, by + 6.5 * MCQW);
  context.stroke();
  context.save();
  context.fillStyle = '#111';
  context.font = `${3.8 * MCQW}px ${BANGERS}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.letterSpacing = `${0.15 * MCQW}px`;
  context.fillText(`${babelWord(random).toUpperCase()} ${babelWord(random).toUpperCase()}`, bx, by - 1.8 * MCQW);
  context.fillText(`${babelWord(random).toUpperCase()} ?!`, bx, by + 2.4 * MCQW);
  context.restore();
  context.restore();
  context.lineWidth = MCQW;
  context.strokeStyle = '#111';
  context.strokeRect(x, y, w, h);
  // Le titre, énorme, penché, par-dessus la case.
  coverTitle(design).forEach((word, index) =>
    comicText(
      context,
      word.toUpperCase(),
      MW / 2,
      y + (10 + index * 12) * MCQW,
      13 * MCQW,
      index % 2 ? '#fff' : palette.ink,
      84 * MCQW,
      -0.06,
    ),
  );
  gloss(context, MW, MH);
  return node;
};

/** Le dos de l'album : « dans la même collection », les douze albums de la série, celui-ci entouré. */
export const comicBack = (design: CoverDesign, details: CoverDetails): HTMLCanvasElement => {
  const [node, context] = mockupCanvas(MW, MH);
  const palette = COMIC[details.comicColor];
  const random = rng(details.seed + 67);
  context.fillStyle = palette.paper;
  context.fillRect(0, 0, MW, MH);
  halftone(context, 0, 0, MW, MH, 'rgba(0,0,0,0.08)', MW / 2, MH / 2);
  comicText(
    context,
    `${babelWord(random).toUpperCase()} ${babelWord(random).toUpperCase()}`,
    MW / 2,
    10 * MCQW,
    6 * MCQW,
    '#fff',
    80 * MCQW,
  );
  const [columns, size, gap] = [4, 17 * MCQW, 3.5 * MCQW];
  const left = (MW - columns * size - (columns - 1) * gap) / 2;
  for (let i = 0; i < 12; i++) {
    const cx = left + (i % columns) * (size + gap);
    const cy = 18 * MCQW + Math.floor(i / columns) * (size * 1.3 + gap);
    const album = COMIC[(i + details.album) % COMIC.length];
    context.fillStyle = '#fff';
    context.fillRect(cx, cy, size, size * 1.3);
    context.fillStyle = album.paper;
    context.fillRect(cx + 0.8 * MCQW, cy + 3.2 * MCQW, size - 1.6 * MCQW, size * 1.3 - 4 * MCQW);
    context.fillStyle = album.dark;
    context.beginPath();
    context.arc(cx + size / 2, cy + size * 0.8, size * 0.22, 0, 2 * Math.PI);
    context.fill();
    context.lineWidth = 0.35 * MCQW;
    context.strokeStyle = '#111';
    context.strokeRect(cx, cy, size, size * 1.3);
    comicText(context, String(i + 1), cx + size / 2, cy + 1.7 * MCQW, 2.6 * MCQW, '#111');
    if (i + 1 === details.album) {
      context.lineWidth = 0.9 * MCQW;
      context.strokeStyle = palette.ink;
      context.strokeRect(cx - 0.8 * MCQW, cy - 0.8 * MCQW, size + 1.6 * MCQW, size * 1.3 + 1.6 * MCQW);
    }
  }
  barcode(context, design.barcode, 58, 99);
  publisherMark(context, 8, 104, '#111');
  gloss(context, MW, MH);
  return node;
};

export const comicSpine = (design: CoverDesign, details: CoverDetails): HTMLCanvasElement => {
  const [node, context] = mockupCanvas(SPINE_W, MH);
  const palette = COMIC[details.comicColor];
  context.fillStyle = palette.paper;
  context.fillRect(0, 0, SPINE_W, MH);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, SPINE_W, 120);
  context.fillStyle = palette.ink;
  context.beginPath();
  context.arc(SPINE_W / 2, 62, 38, 0, 2 * Math.PI);
  context.fill();
  context.lineWidth = 4;
  context.strokeStyle = '#111';
  context.stroke();
  comicText(context, String(details.album), SPINE_W / 2, 65, 48, '#fff');
  comicText(
    context,
    coverTitle(design)
      .map((word) => word.toUpperCase())
      .join(' '),
    SPINE_W / 2,
    440,
    64,
    '#fff',
    520,
    Math.PI / 2,
  );
  publisherMark(context, SPINE_W / 2 / MCQW - 3, (MH - 70) / MCQW, '#111');
  gloss(context, SPINE_W, MH);
  return node;
};

/** Pages de garde : le héros en petit, répété, en deux tons. */
export const comicInside = (details: CoverDetails): HTMLCanvasElement => {
  const [node, context] = mockupCanvas(MW, MH);
  const palette = COMIC[details.comicColor];
  context.fillStyle = palette.paper;
  context.fillRect(0, 0, MW, MH);
  context.globalAlpha = 0.35;
  for (let j = 0; j < 9; j++)
    for (let i = 0; i < 6; i++) reader(context, (i + (j % 2) * 0.5) * 19 * MCQW, j * 15 * MCQW, 5 * MCQW, palette);
  context.globalAlpha = 1;
  return node;
};
