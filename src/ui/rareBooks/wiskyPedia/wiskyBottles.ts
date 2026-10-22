import { DISPLAY, SERIF, text } from './wiskyDraw';

/**
 * Les bouteilles et les verres de WiskyPedia, dessinés de face sur fond blanc comme les photos d'un guide
 * (maquette .ai/maquette-wiskypedia.html). Toutes inventées : aucune forme ni étiquette de marque.
 */

interface BottleShape {
  /** Largeur et hauteur du corps, de l'épaule, du col (à l'échelle 1). */
  w: number;
  h: number;
  sh: number;
  neck: number;
  /** Largeur du col, en part du corps. */
  nw: number;
  round: number;
  cap: number;
  square?: boolean;
  glass: string;
  dark: string;
  liquid: string;
  /** Verre clair : on voit le whisky. */
  clear?: boolean;
  capColor: string;
  label: string;
  labelInk: string;
  /** Hauteur de l'étiquette, en part du corps. */
  labelH: number;
  /** Une bague au col. */
  collar?: boolean;
}

export const BOTTLES = {
  tall: {
    w: 56,
    h: 120,
    sh: 24,
    neck: 48,
    nw: 0.3,
    round: 6,
    cap: 18,
    glass: 'rgba(230,200,140,0.35)',
    dark: 'rgba(80,40,10,0.7)',
    liquid: '#c98a2a',
    clear: true,
    capColor: '#2a2420',
    label: '#f3ead6',
    labelInk: '#5a2a18',
    labelH: 0.48,
  },
  green: {
    w: 60,
    h: 118,
    sh: 26,
    neck: 46,
    nw: 0.3,
    round: 6,
    cap: 18,
    glass: '#3d6b3a',
    dark: '#14261a',
    liquid: '#6b4a10',
    capColor: '#7a1c18',
    label: '#efe6cc',
    labelInk: '#1f3a24',
    labelH: 0.5,
    collar: true,
  },
  squat: {
    w: 70,
    h: 96,
    sh: 18,
    neck: 40,
    nw: 0.3,
    round: 10,
    cap: 20,
    glass: 'rgba(225,190,130,0.35)',
    dark: 'rgba(70,35,8,0.75)',
    liquid: '#b8701c',
    clear: true,
    capColor: '#111',
    label: '#1c1c1c',
    labelInk: '#d9b25a',
    labelH: 0.55,
  },
  square: {
    w: 66,
    h: 112,
    sh: 18,
    neck: 38,
    nw: 0.32,
    round: 3,
    cap: 22,
    square: true,
    glass: 'rgba(235,190,120,0.3)',
    dark: 'rgba(80,35,5,0.75)',
    liquid: '#b5601a',
    clear: true,
    capColor: '#6e1410',
    label: '#f1e2c2',
    labelInk: '#3a1a0c',
    labelH: 0.5,
  },
  decanter: {
    w: 74,
    h: 92,
    sh: 30,
    neck: 34,
    nw: 0.26,
    round: 14,
    cap: 26,
    glass: 'rgba(235,210,160,0.3)',
    dark: 'rgba(80,45,10,0.6)',
    liquid: '#d79a35',
    clear: true,
    capColor: '#c9a24a',
    label: '#f7f2e6',
    labelInk: '#1a1a1a',
    labelH: 0.42,
  },
  brown: {
    w: 58,
    h: 122,
    sh: 22,
    neck: 50,
    nw: 0.3,
    round: 6,
    cap: 16,
    glass: '#6a3a14',
    dark: '#2a1406',
    liquid: '#3a1a04',
    capColor: '#d0b060',
    label: '#e9dcc0',
    labelInk: '#2a1406',
    labelH: 0.46,
  },
} satisfies Record<string, BottleShape>;

export type BottleName = keyof typeof BOTTLES;

/** La bouteille `shape` posée en (x, base), à l'échelle `scale`, penchée de `tilt`, son étiquette en deux lignes. */
export const bottle = (
  context: CanvasRenderingContext2D,
  x: number,
  base: number,
  scale: number,
  shape: BottleName,
  label: readonly string[],
  tilt = 0,
): void => {
  const b: BottleShape = BOTTLES[shape];
  const bw = b.w * scale;
  const bh = b.h * scale;
  const neck = b.neck * scale;
  const nw = bw * b.nw;
  const sh = b.sh * scale;
  const top = base - bh - sh - neck;
  context.save();
  const shadow = context.createRadialGradient(x, base, 2, x, base, bw * 0.9);
  shadow.addColorStop(0, 'rgba(0,0,0,0.25)');
  shadow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = shadow;
  context.beginPath();
  context.ellipse(x, base + 2, bw * 0.85, 7 * scale, 0, 0, Math.PI * 2);
  context.fill();
  context.translate(x, base);
  context.rotate(tilt);
  context.translate(-x, -base);
  const path = (): void => {
    context.beginPath();
    const l = x - bw / 2;
    const r = x + bw / 2;
    const rad = b.round * scale;
    context.moveTo(l + rad, base);
    context.lineTo(r - rad, base);
    context.quadraticCurveTo(r, base, r, base - rad);
    context.lineTo(r, base - bh);
    if (b.square) {
      context.lineTo(r - (bw - nw) * 0.15, base - bh - sh * 0.6);
      context.lineTo(x + nw / 2, base - bh - sh);
    } else context.bezierCurveTo(r, base - bh - sh * 0.7, x + nw / 2, base - bh - sh * 0.5, x + nw / 2, base - bh - sh);
    context.lineTo(x + nw / 2, top);
    context.lineTo(x - nw / 2, top);
    context.lineTo(x - nw / 2, base - bh - sh);
    if (b.square) {
      context.lineTo(l + (bw - nw) * 0.15, base - bh - sh * 0.6);
      context.lineTo(l, base - bh);
    } else context.bezierCurveTo(x - nw / 2, base - bh - sh * 0.5, l, base - bh - sh * 0.7, l, base - bh);
    context.lineTo(l, base - rad);
    context.quadraticCurveTo(l, base, l + rad, base);
    context.closePath();
  };
  // Le verre, puis le whisky dedans et les reflets.
  path();
  const glass = context.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
  glass.addColorStop(0, b.dark);
  glass.addColorStop(0.35, b.glass);
  glass.addColorStop(0.65, b.glass);
  glass.addColorStop(1, b.dark);
  context.fillStyle = glass;
  context.fill();
  context.save();
  path();
  context.clip();
  const liquid = context.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
  liquid.addColorStop(0, 'rgba(90,40,5,0.75)');
  liquid.addColorStop(0.5, b.liquid);
  liquid.addColorStop(1, 'rgba(90,40,5,0.75)');
  context.fillStyle = liquid;
  context.globalAlpha = b.clear ? 0.95 : 0.35;
  context.fillRect(x - bw / 2, base - bh * 0.97, bw, bh * 0.97);
  context.globalAlpha = 1;
  const shine = context.createLinearGradient(x - bw / 2, 0, x + bw / 2, 0);
  shine.addColorStop(0.12, 'rgba(255,255,255,0)');
  shine.addColorStop(0.2, 'rgba(255,255,255,0.45)');
  shine.addColorStop(0.27, 'rgba(255,255,255,0)');
  shine.addColorStop(0.8, 'rgba(255,255,255,0)');
  shine.addColorStop(0.85, 'rgba(255,255,255,0.18)');
  shine.addColorStop(0.9, 'rgba(255,255,255,0)');
  context.fillStyle = shine;
  context.fillRect(x - bw / 2, top, bw, base - top);
  context.restore();
  path();
  context.strokeStyle = 'rgba(0,0,0,0.35)';
  context.lineWidth = 1;
  context.stroke();
  // Le bouchon.
  const cap = b.cap * scale;
  context.fillStyle = b.capColor;
  context.fillRect(x - nw / 2 - 1.5, top - 2, nw + 3, cap);
  context.fillStyle = 'rgba(255,255,255,0.25)';
  context.fillRect(x - nw / 2, top - 2, nw * 0.25, cap);
  // L'étiquette.
  const lw = bw * 0.82;
  const lh = bh * b.labelH;
  const ly = base - bh * 0.18 - lh;
  context.fillStyle = b.label;
  context.fillRect(x - lw / 2, ly, lw, lh);
  context.strokeStyle = b.labelInk;
  context.lineWidth = 0.8 * scale;
  context.strokeRect(x - lw / 2 + 3 * scale, ly + 3 * scale, lw - 6 * scale, lh - 6 * scale);
  const lines = label.filter(Boolean);
  if (lines.length) {
    const size = Math.min(lw / (Math.max(...lines.map((line) => line.length)) * 0.62), 11 * scale);
    lines.forEach((line, i) =>
      text(
        context,
        line,
        x,
        ly + lh * 0.3 + i * size * 1.25 + size * 0.35,
        `${i === 0 ? 700 : 400} ${size}px ${i === 0 ? DISPLAY : SERIF}`,
        b.labelInk,
        'center',
      ),
    );
  }
  if (b.collar) {
    context.fillStyle = b.labelInk;
    context.fillRect(x - nw / 2 - 1, top + cap + neck * 0.35, nw + 2, neck * 0.18);
  }
  context.restore();
};

export interface GlassFill {
  /** Hauteur du liquide, en part du verre (0 : une goutte au fond). */
  level: number;
  /** Les deux teintes du liquide, en haut et en bas. */
  colors?: readonly [string, string];
}

const WHISKY: readonly [string, string] = ['#d79a35', '#9a5a14'];

/**
 * Un grand verre bas, de face, posé en (x, base) ou couché (`angle`, autour de son centre), rempli à
 * `fill.level`.
 */
export const glassOf = (context: CanvasRenderingContext2D, x: number, base: number, fill: GlassFill, angle = 0, tilt = 0): void => {
  const w = 130;
  const h = 140;
  context.save();
  const shadow = context.createRadialGradient(x, base, 2, x, base, w * 0.8);
  shadow.addColorStop(0, 'rgba(0,0,0,0.22)');
  shadow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = shadow;
  context.beginPath();
  context.ellipse(x, base + 2, w * 0.6, 8, 0, 0, Math.PI * 2);
  context.fill();
  if (angle) {
    // Couché : il tourne autour de son centre, posé sur son flanc.
    const center = base - w / 2;
    context.translate(x, center);
    context.rotate(angle);
    context.translate(-x, -center);
    base = center + h / 2;
  }
  context.translate(x, base);
  context.rotate(tilt);
  context.translate(-x, -base);
  const outline = (): void => {
    context.beginPath();
    context.moveTo(x - w / 2, base - h);
    context.lineTo(x - w / 2 + 8, base);
    context.lineTo(x + w / 2 - 8, base);
    context.lineTo(x + w / 2, base - h);
  };
  context.save();
  outline();
  context.clip();
  const bottom = 14;
  const level = fill.level ? (h - bottom) * fill.level : 3;
  const [top, low] = fill.colors ?? WHISKY;
  const liquid = context.createLinearGradient(0, base - bottom - level, 0, base - bottom);
  liquid.addColorStop(0, top);
  liquid.addColorStop(1, low);
  context.fillStyle = liquid;
  context.fillRect(x - w, base - bottom - level, w * 2, level);
  context.fillStyle = 'rgba(120,110,100,0.18)';
  context.fillRect(x - w, base - bottom, w * 2, bottom);
  const shine = context.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  shine.addColorStop(0.1, 'rgba(255,255,255,0)');
  shine.addColorStop(0.17, 'rgba(255,255,255,0.7)');
  shine.addColorStop(0.25, 'rgba(255,255,255,0)');
  context.fillStyle = shine;
  context.fillRect(x - w / 2, base - h, w, h);
  context.restore();
  outline();
  context.strokeStyle = 'rgba(70,60,50,0.55)';
  context.lineWidth = 2;
  context.stroke();
  context.beginPath();
  context.ellipse(x, base - h, w / 2, 7, 0, 0, Math.PI * 2);
  context.strokeStyle = 'rgba(70,60,50,0.35)';
  context.lineWidth = 1.5;
  context.stroke();
  context.restore();
};

/** Les verres des fiches à part : à moitié plein, vide, d'eau, plein de tous les fonds, couché. */
export type GlassName = 'half' | 'empty' | 'water' | 'full' | 'fallen';

export const GLASSES: Record<GlassName, { fill: GlassFill; angle?: number }> = {
  half: { fill: { level: 0.5 } },
  empty: { fill: { level: 0 } },
  water: { fill: { level: 0.75, colors: ['rgba(200,225,240,0.55)', 'rgba(150,190,215,0.6)'] } },
  full: { fill: { level: 0.85, colors: ['#8a6a3a', '#4a3416'] } },
  fallen: { fill: { level: 0 }, angle: Math.PI / 2 - 0.12 },
};
