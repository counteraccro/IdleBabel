import { seeded, hashText } from '../../core/random';

/**
 * Sigle d'un sceau : un double hexagone (la forme des galeries de Babel) et quelques traits tirés de
 * l'identifiant de sa série. Chaque palier d'une série garde les traits du précédent et en ajoute un.
 * Repère 100 × 100 ; le même tracé sert à la page HTML (SVG) et à la feuille qui tourne (canevas).
 */
export type Look = 'gold' | 'embossed' | 'hidden';

type Shape = { kind: 'path'; d: string } | { kind: 'circle'; cx: number; cy: number; r: number; filled?: boolean };

const R = 47;
const corner = (i: number, r: number): [number, number] => {
  const a = (Math.PI / 3) * i - Math.PI / 2;
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
};
const fixed = (value: number): string => value.toFixed(1);
const hexagon = (r: number): string => `M${[0, 1, 2, 3, 4, 5].map((i) => corner(i, r).map(fixed).join(' ')).join(' L')} Z`;

export const sigil = (series: string, tier = 0): Shape[] => {
  const random = seeded(hashText(series));
  const points: [number, number][] = [];
  for (let i = 0; i < 6; i++) points.push(corner(i, 30), corner(i + 0.5, 26));
  points.push([50, 50]);
  const pick = (): [number, number] => points[Math.floor(random() * points.length)];
  const shapes: Shape[] = [
    { kind: 'path', d: hexagon(R) },
    { kind: 'path', d: hexagon(R - 6) },
  ];
  const roll = random();
  if (roll < 0.35) shapes.push({ kind: 'circle', cx: 50, cy: 50, r: 6 + random() * 10 });
  else if (roll < 0.65) shapes.push({ kind: 'circle', cx: 50, cy: 50, r: 2.4, filled: true });
  else shapes.push({ kind: 'path', d: hexagon(12) });
  for (let s = 0; s < 3 + tier; s++) {
    const [ax, ay] = pick();
    let [bx, by] = pick();
    if (ax === bx && ay === by) [bx, by] = [50, 50];
    shapes.push({ kind: 'path', d: `M${fixed(ax)} ${fixed(ay)} L${fixed(bx)} ${fixed(by)}` });
  }
  return shapes;
};

/** Contour seul, en pointillés pâles : un secret pas encore trouvé. */
const HIDDEN: Shape[] = [{ kind: 'path', d: hexagon(R) }];

const PAPER = '#d6d0c0';
/** Gaufrage : une ombre en bas à droite, une lumière en haut à gauche, puis le relief couleur papier. */
const EMBOSS: readonly [number, number, string][] = [
  [0.7, 0.9, 'rgba(107, 98, 80, 0.45)'],
  [-0.6, -0.6, 'rgba(255, 250, 240, 0.85)'],
  [0, 0, PAPER],
];
const GOLD: readonly [number, string][] = [
  [0, '#e8c776'],
  [0.45, '#b8913a'],
  [1, '#8a6a26'],
];
/** Le sceau survolé ou qu'on est venu voir (une vision cliquée) : un or plus sombre, qui ressort du papier. */
const DARK_GOLD: readonly [number, string][] = [
  [0, '#b07c16'],
  [0.45, '#7d5208'],
  [1, '#4f3203'],
];

const svgShape = (shape: Shape, color: string): string =>
  shape.kind === 'path'
    ? `<path d="${shape.d}"/>`
    : `<circle cx="${fixed(shape.cx)}" cy="${fixed(shape.cy)}" r="${fixed(shape.r)}"${shape.filled ? ` fill="${color}"` : ''}/>`;

/** SVG du sceau (repère 100 × 100). `uid` : identifiant unique pour le dégradé doré. */
export const sealSvg = (shapes: Shape[], look: Look, uid: string): string => {
  const open = '<svg viewBox="0 0 100 100" aria-hidden="true">';
  const group = (color: string, attrs = ''): string =>
    `<g fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"${attrs}>${shapes.map((s) => svgShape(s, color)).join('')}</g>`;
  if (look === 'hidden') {
    return `${open}<g fill="none" stroke="#bdb6a4" stroke-width="0.8" stroke-dasharray="1 4" stroke-linecap="round">${HIDDEN.map((s) => svgShape(s, '')).join('')}</g></svg>`;
  }
  if (look === 'embossed') {
    return `${open}${EMBOSS.map(([dx, dy, color]) => group(color, ` transform="translate(${dx} ${dy})"`)).join('')}</svg>`;
  }
  // Dégradé sur le carré du sceau (comme sur la texture) : calé sur chaque trait, il effacerait les traits
  // parfaitement droits (boîte de largeur nulle).
  const stops = GOLD.map(([at, color]) => `<stop offset="${at}" stop-color="${color}"/>`).join('');
  return `${open}<defs><linearGradient id="${uid}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="100">${stops}</linearGradient></defs>${group(`url(#${uid})`)}</svg>`;
};

/**
 * Même sceau sur la texture : `x`, `y` coin haut gauche, `size` côté du carré ; `weight`, traits plus épais (petit
 * sceau) ; `bright`, un or plus sombre (le sceau survolé ou qu'on est venu voir).
 */
export const drawSeal = (
  context: CanvasRenderingContext2D,
  shapes: Shape[],
  look: Look,
  x: number,
  y: number,
  size: number,
  weight = 1,
  bright = false,
): void => {
  context.save();
  context.translate(x, y);
  context.scale(size / 100, size / 100);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  const trace = (list: Shape[], color: string | CanvasGradient): void => {
    context.strokeStyle = color;
    context.fillStyle = color;
    for (const shape of list) {
      if (shape.kind === 'path') context.stroke(new Path2D(shape.d));
      else {
        context.beginPath();
        context.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
        if (shape.filled) context.fill();
        else context.stroke();
      }
    }
  };
  context.lineWidth = 2 * weight;
  if (look === 'hidden') {
    context.lineWidth = 0.8;
    context.setLineDash([1, 4]);
    trace(HIDDEN, '#bdb6a4');
  } else if (look === 'embossed') {
    for (const [dx, dy, color] of EMBOSS) {
      context.save();
      context.translate(dx, dy);
      trace(shapes, color);
      context.restore();
    }
  } else {
    const gradient = context.createLinearGradient(0, 0, 100, 100);
    for (const [at, color] of bright ? DARK_GOLD : GOLD) gradient.addColorStop(at, color);
    trace(shapes, gradient);
  }
  context.restore();
};
