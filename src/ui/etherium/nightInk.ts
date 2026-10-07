import { PAGE_TEXTURE } from '../book/pageLayout';
import { TEXTURE_SCALE } from '../book/pageRender';
import { HAND } from '../strangeBook/pageItems';
import { babelTextWidth, drawBabelText, hasBabelDigits } from '../babelDigits';
import { writeDigits } from '../../core/format';

/**
 * L'encre de nuit des pages de l'Etherium (encre D2 « La nuit », choisie par l'auteur le 06/10/2026) : papier violet nuit,
 * poussière d'étoiles fixe, or qui brille. Mesures et couleurs reprises de .ai/maquette-etherium-constellations.html
 * (repère de la page : 640 × 800).
 */

export type Ctx = CanvasRenderingContext2D;

const W = PAGE_TEXTURE.width;
const H = PAGE_TEXTURE.height;

/** Le papier de nuit, de haut en bas ; les pages vierges du bloc prennent celle du milieu. */
export const NIGHT = ['#2a1d3a', '#211630', '#180f24'] as const;
export const GOLD = '#b8913a';
export const SERIF = "Georgia, 'Times New Roman', serif";
export const TITLE = "'Cinzel', Georgia, serif";
export { HAND };

/** L'ombre du dos sur la page de nuit, du dos vers la tranche. */
const GUTTER: readonly [number, string][] = [
  [0, 'rgba(0,0,0,0.6)'],
  [0.03, 'rgba(0,0,0,0.3)'],
  [0.08, 'rgba(0,0,0,0.08)'],
  [0.12, 'rgba(200,170,255,0.05)'],
  [0.18, 'rgba(0,0,0,0)'],
  [0.88, 'rgba(0,0,0,0)'],
  [1, 'rgba(0,0,0,0.25)'],
];

export const C = {
  ink: 'rgb(230,220,242)',
  faded: 'rgb(165,151,184)',
  link: 'rgba(200,185,230,0.45)',
  deco: 'rgba(200,185,230,0.28)',
  gold: 'rgb(232,199,118)',
  hidden: 'rgba(200,185,230,0.4)',
  star: 'rgba(225,212,245,0.85)',
  far: 'rgba(200,185,230,0.35)',
  ring: 'rgba(232,199,118,0.7)',
} as const;

/** Hasard reproductible (Park-Miller) : la poussière est toujours la même. */
const seeded = (seed: number) => (): number => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** Une page de nuit, à la résolution de la texture ; renvoie un contexte dans le repère de la page. */
export const nightPage = (canvas: HTMLCanvasElement, spineOnLeft: boolean): Ctx => {
  canvas.width = W * TEXTURE_SCALE;
  canvas.height = H * TEXTURE_SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(TEXTURE_SCALE, TEXTURE_SCALE);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, NIGHT[0]);
  g.addColorStop(0.7, NIGHT[1]);
  g.addColorStop(1, NIGHT[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // Poussière d'étoiles, toujours la même.
  const r = seeded(77);
  for (let i = 0; i < 260; i++) {
    const x = r() * W;
    const y = r() * H;
    const a = 0.15 + r() * 0.45;
    const size = r() < 0.9 ? 0.8 : 1.6;
    ctx.fillStyle = `rgba(230,215,255,${a})`;
    ctx.fillRect(x, y, size, size);
  }
  // La maquette montre une page de droite (le dos à gauche) ; sur une page de gauche, l'ombre passe de l'autre côté.
  const gut = ctx.createLinearGradient(spineOnLeft ? 0 : W, 0, spineOnLeft ? W : 0, 0);
  for (const [at, color] of GUTTER) gut.addColorStop(at, color);
  ctx.fillStyle = gut;
  ctx.fillRect(0, 0, W, H);
  return ctx;
};

export interface WriteOptions {
  size?: number;
  face?: string;
  weight?: string;
  italic?: boolean;
  color?: string;
  align?: CanvasTextAlign;
  spacing?: number;
  /** Largeur à ne pas dépasser : le texte rapetisse jusqu'à tenir. */
  fit?: number;
}

const fontOf = (size: number, { face = SERIF, weight = '', italic = false }: WriteOptions): string =>
  `${italic ? 'italic ' : ''}${weight} ${size}px ${face}`;

/** Un texte posé par le haut de sa ligne, comme dans la maquette. */
export const write = (ctx: Ctx, text: string, x: number, top: number, options: WriteOptions = {}): void => {
  const { color = C.ink, align = 'left', spacing = 0, fit } = options;
  let size = options.size ?? 20;
  ctx.save();
  ctx.letterSpacing = `${spacing}px`;
  ctx.font = fontOf(size, options);
  const widthOf = (): number => (hasBabelDigits(text) ? babelTextWidth(ctx, text, size) : ctx.measureText(text).width);
  if (fit) while (size > 10 && widthOf() > fit) ctx.font = fontOf(--size, options);
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  const baseline = top + ctx.measureText('M').fontBoundingBoxAscent;
  if (hasBabelDigits(text)) {
    // Chiffres de Babel (notation du joueur) : dessinés un à un, le reste du texte dans sa police.
    const width = babelTextWidth(ctx, text, size);
    const left = align === 'center' ? x - width / 2 : align === 'right' || align === 'end' ? x - width : x;
    drawBabelText(ctx, text, left, top, size, baseline);
  } else {
    ctx.textAlign = align;
    ctx.fillText(text, x + (align === 'center' ? spacing / 2 : 0), baseline);
  }
  ctx.restore();
};

/** Deux traits d'or qui s'effacent vers les bouts, un losange au milieu. */
export const rule = (ctx: Ctx, y: number, half = 110): void => {
  for (const side of [-1, 1]) {
    const g = ctx.createLinearGradient(320, 0, 320 + side * half, 0);
    g.addColorStop(0, 'rgba(168,130,58,0.9)');
    g.addColorStop(1, 'rgba(168,130,58,0)');
    ctx.fillStyle = g;
    ctx.fillRect(side < 0 ? 320 - half : 328, y - 0.75, half - 8, 1.5);
  }
  ctx.save();
  ctx.translate(320, y);
  ctx.rotate(Math.PI / 4);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-4, -4, 8, 8);
  ctx.restore();
};

/** Le titre de la page : une lettrine d'or, le reste en capitales, le filet dessous. */
export const heading = (ctx: Ctx, title: string): void => {
  const text = title.toLocaleUpperCase();
  const [first, rest] = [text.slice(0, 1), text.slice(1)];
  ctx.save();
  ctx.letterSpacing = '6px';
  ctx.font = `45px ${TITLE}`;
  const head = ctx.measureText(first).width;
  const base = 72 + ctx.measureText('M').fontBoundingBoxAscent;
  ctx.font = `30px ${TITLE}`;
  const tail = ctx.measureText(rest).width;
  const left = 320 - (head + tail) / 2;
  ctx.font = `45px ${TITLE}`;
  ctx.fillStyle = GOLD;
  ctx.fillText(first, left, base);
  ctx.font = `30px ${TITLE}`;
  ctx.fillStyle = C.ink;
  ctx.fillText(rest, left + head, base);
  ctx.restore();
  rule(ctx, 134, 110);
};

/** Une étoile à quatre branches. */
export const starPath = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2;
    const rr = i % 2 ? r * 0.32 : r;
    ctx.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
  }
  ctx.closePath();
};

/** Une étoile allumée : son halo, puis l'étoile d'or. */
export const litStar = (ctx: Ctx, x: number, y: number, r: number): void => {
  const halo = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
  halo.addColorStop(0, 'rgba(240,205,125,0.55)');
  halo.addColorStop(1, 'rgba(232,199,118,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, r * 2.4, 0, Math.PI * 2);
  ctx.fill();
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  g.addColorStop(0, '#f3dc94');
  g.addColorStop(0.5, '#c9a24a');
  g.addColorStop(1, '#8a6a26');
  starPath(ctx, x, y, r);
  ctx.fillStyle = g;
  ctx.fill();
};

export interface Point {
  x: number;
  y: number;
}

export interface LineOptions {
  lit: boolean;
  dash: number[];
  width?: number;
  color: string;
  /** Le cercle sur lequel posent les deux points (la lune) : le trait le suit, par le court chemin. */
  circle?: readonly [number, number, number];
}

/** Un trait entre deux étoiles : d'or et lumineux quand les deux sont allumées, en pointillés sinon. */
export const line = (ctx: Ctx, a: Point, b: Point, { lit, dash, width = 1.2, color, circle }: LineOptions): void => {
  ctx.save();
  ctx.strokeStyle = lit ? C.gold : color;
  ctx.lineWidth = lit ? 2.2 : width;
  if (!lit) ctx.setLineDash(dash);
  if (lit) {
    ctx.shadowColor = 'rgba(232,199,118,0.7)';
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  if (circle) {
    const [cx, cy, r] = circle;
    const from = Math.atan2(a.y - cy, a.x - cx);
    const to = Math.atan2(b.y - cy, b.x - cx);
    const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
    ctx.arc(cx, cy, r, from, from + delta, delta < 0);
  } else {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.restore();
};

/** Le numéro de la page, en bas au milieu. */
export const nightFolio = (ctx: Ctx, n: number): void =>
  write(ctx, writeDigits(String(n)), 320, 745, { size: 18, color: C.faded, align: 'center' });
