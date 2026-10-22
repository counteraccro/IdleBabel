import { LINE } from './comicDraw';

/**
 * Les décors de « Gare aux pages », en ligne claire, noir sur blanc, avant d'être réécrits en lettres (comicDraw.ts) :
 * la salle, les étagères, le livre ouvert, la ruche des méthodes, la vitrine, les sceaux. Mesures de la maquette.
 */

type Ctx = CanvasRenderingContext2D;

export const limb = (o: Ctx, x1: number, y1: number, x2: number, y2: number, t: number): void => {
  o.lineCap = 'round';
  o.lineWidth = t;
  o.beginPath();
  o.moveTo(x1, y1);
  o.lineTo(x2, y2);
  o.stroke();
};

export const box = (o: Ctx, x: number, y: number, w: number, h: number, fill = '#fff'): void => {
  o.fillStyle = fill;
  o.strokeStyle = '#000';
  o.lineWidth = LINE();
  o.fillRect(x, y, w, h);
  o.strokeRect(x, y, w, h);
};

export const floor = (o: Ctx, w: number, y: number): void => limb(o, 0, y, w, y, LINE());

/** Un mur de livres, en `rows` rayons. */
export const shelves = (o: Ctx, x: number, y: number, w: number, h: number, rows = 3): void => {
  const L = LINE();
  o.strokeStyle = '#000';
  o.lineWidth = L;
  const rh = h / rows;
  for (let r = 0; r < rows; r++) {
    const by = y + r * rh;
    let bx = x + L;
    let s = r * 13 + 5;
    while (bx < x + w - L * 3) {
      s = (s * 37 + 11) % 97;
      const bw = L * (5 + (s % 4) * 1.2);
      const bh = rh * (0.6 + (s % 4) * 0.08);
      o.fillStyle = s % 7 === 0 ? '#000' : '#fff';
      o.fillRect(bx, by + rh - bh - L, bw, bh);
      o.strokeRect(bx, by + rh - bh - L, bw, bh);
      bx += bw + L * 1.4;
    }
    limb(o, x, by + rh - L * 0.5, x + w, by + rh - L * 0.5, L * 1.2);
  }
};

/** La salle hexagonale vue du jeu : le mur du fond garni de livres, les deux pans de côté, le sol. */
export const room = (o: Ctx, w: number, h: number, floorY = h * 0.8): void => {
  const L = LINE();
  shelves(o, w * 0.24, h * 0.06, w * 0.52, floorY - h * 0.06, 2);
  o.strokeStyle = '#000';
  limb(o, w * 0.24, h * 0.06, w * 0.24, floorY, L);
  limb(o, w * 0.76, h * 0.06, w * 0.76, floorY, L);
  limb(o, w * 0.24, floorY, w * 0.76, floorY, L);
  limb(o, w * 0.24, floorY, 0, h, L);
  limb(o, w * 0.76, floorY, w, h, L);
  limb(o, w * 0.24, h * 0.06, 0, -h * 0.1, L);
  limb(o, w * 0.76, h * 0.06, w, -h * 0.1, L);
  for (const side of [0, 1])
    for (let k = 1; k <= 2; k++) {
      const fx = side ? w * 0.76 + (w * 0.24 * k) / 3 : w * 0.24 - (w * 0.24 * k) / 3;
      const top = h * 0.06 - (h * 0.16 * k) / 3;
      const bot = floorY + ((h - floorY) * k) / 3;
      limb(o, fx, top, fx, bot, L * 0.8);
    }
};

export const openBook = (o: Ctx, cx: number, cy: number, s: number): void => {
  o.fillStyle = '#fff';
  o.strokeStyle = '#000';
  o.lineWidth = LINE();
  for (const side of [-1, 1]) {
    o.beginPath();
    o.moveTo(cx, cy);
    o.quadraticCurveTo(cx + side * s * 0.5, cy - s * 0.12, cx + side * s, cy - s * 0.02);
    o.lineTo(cx + side * s, cy + s * 0.55);
    o.quadraticCurveTo(cx + side * s * 0.5, cy + s * 0.45, cx, cy + s * 0.6);
    o.closePath();
    o.fill();
    o.stroke();
  }
};

/** Le coin d'une page qui se soulève, sur un livre ouvert en (cx, cy). */
export const turningPage = (o: Ctx, w: number, h: number): void => {
  o.fillStyle = '#fff';
  o.strokeStyle = '#000';
  o.lineWidth = LINE();
  o.beginPath();
  o.moveTo(w * 0.46, h * 0.36);
  o.quadraticCurveTo(w * 0.62, h * 0.08, w * 0.8, h * 0.14);
  o.lineTo(w * 0.82, h * 0.56);
  o.quadraticCurveTo(w * 0.62, h * 0.52, w * 0.46, h * 0.6);
  o.closePath();
  o.fill();
  o.stroke();
};

export const closedBook = (o: Ctx, cx: number, cy: number, w: number, h: number, fill = '#fff'): void => {
  box(o, cx - w / 2, cy - h / 2, w, h, fill);
  limb(o, cx - w / 2 + w * 0.12, cy - h / 2, cx - w / 2 + w * 0.12, cy + h / 2, LINE());
};

/** Des traits de vitesse, vers la gauche. */
export const speed = (o: Ctx, x: number, y: number, len: number, n: number, gap: number): void => {
  o.strokeStyle = '#000';
  for (let i = 0; i < n; i++) limb(o, x, y + i * gap, x - len, y + i * gap, LINE());
};

const hexPath = (o: Ctx, cx: number, cy: number, r: number): void => {
  o.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    o.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  o.closePath();
};

export const hex = (o: Ctx, cx: number, cy: number, r: number, fill = '#fff'): void => {
  o.fillStyle = fill;
  o.strokeStyle = '#000';
  o.lineWidth = LINE() * 1.2;
  hexPath(o, cx, cy, r);
  o.fill();
  o.stroke();
};

/** Une alvéole encore fermée : grisée, elle se lit en « o » serrés. */
export const CLOSED = 'rgb(175,175,175)';
/** La ruche des méthodes : des alvéoles en quinconce ; `fills` donne la couleur de chacune (blanc, gris, ou rien). */
const HIVE = [
  [0, 0],
  [1, 0],
  [2, 0],
  [0.5, 1],
  [1.5, 1],
  [2.5, 1],
  [1, 2],
  [2, 2],
];
export type HiveFills = readonly (string | null)[];
export const hive = (o: Ctx, cx: number, cy: number, r: number, fills: HiveFills = []): void =>
  HIVE.forEach(([c, row], i) => {
    if (fills[i] === null) return;
    hex(o, cx + (c - 1.25) * r * 1.76, cy + (row - 1) * r * 1.52, r * 0.8, fills[i] ?? '#fff');
  });
export const hiveAt = (cx: number, cy: number, r: number, i: number): [number, number] => [
  cx + (HIVE[i][0] - 1.25) * r * 1.76,
  cy + (HIVE[i][1] - 1) * r * 1.52,
];

/** Le pointeur de la souris : la seule « main » de la notice. */
export const pointer = (o: Ctx, x: number, y: number, s: number): void => {
  o.fillStyle = '#fff';
  o.strokeStyle = '#000';
  o.lineWidth = LINE() * 1.2;
  o.beginPath();
  o.moveTo(x, y);
  o.lineTo(x, y + s);
  o.lineTo(x + s * 0.28, y + s * 0.74);
  o.lineTo(x + s * 0.48, y + s * 1.1);
  o.lineTo(x + s * 0.62, y + s * 1.02);
  o.lineTo(x + s * 0.42, y + s * 0.68);
  o.lineTo(x + s * 0.74, y + s * 0.66);
  o.closePath();
  o.fill();
  o.stroke();
};

/** Un cercle ; `t` < 1 : cerclé du temps qui reste (un médaillon). */
export const ring = (o: Ctx, cx: number, cy: number, r: number, t = 1): void => {
  o.strokeStyle = '#000';
  o.lineWidth = LINE() * 1.2;
  o.beginPath();
  o.arc(cx, cy, r, 0, Math.PI * 2);
  o.stroke();
  if (t < 1) {
    o.lineWidth = LINE() * 3;
    o.beginPath();
    o.arc(cx, cy, r * 1.18, -Math.PI / 2, -Math.PI / 2 + t * Math.PI * 2);
    o.stroke();
  }
};

export const rays = (o: Ctx, cx: number, cy: number, r1: number, r2: number, n = 10): void => {
  o.strokeStyle = '#000';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    limb(o, cx + Math.cos(a) * r1, cy + Math.sin(a) * r1, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2, LINE());
  }
};

/** Un sceau : un disque cranté ; plein s'il est obtenu. */
export const seal = (o: Ctx, cx: number, cy: number, r: number, got: boolean): void => {
  o.fillStyle = got ? '#000' : '#fff';
  o.strokeStyle = '#000';
  o.lineWidth = LINE() * 1.2;
  o.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const rr = i % 2 ? r : r * 0.86;
    o.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  o.closePath();
  o.fill();
  o.stroke();
  if (got) {
    o.fillStyle = '#fff';
    o.beginPath();
    o.arc(cx, cy, r * 0.42, 0, Math.PI * 2);
    o.fill();
  }
};

/** La vitrine : des cases, les `full` premières occupées par un livre de face ; la case `glow` rayonne. */
export const vitrine = (o: Ctx, x: number, y: number, w: number, h: number, cols: number, rows: number, full: number, glow = -1): void => {
  box(o, x, y, w, h);
  const [cw, ch] = [w / cols, h / rows];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const k = j * cols + i;
      const [cx, cy] = [x + i * cw, y + j * ch];
      o.strokeRect(cx, cy, cw, ch);
      if (k < full) box(o, cx + cw * 0.22, cy + ch * 0.16, cw * 0.56, ch * 0.74, k % 3 === 1 ? '#000' : '#fff');
      if (k === glow) rays(o, cx + cw / 2, cy + ch / 2, Math.min(cw, ch) * 0.62, Math.min(cw, ch) * 0.9, 12);
    }
};

/** Des points qui montent ou s'éteignent (la lettre qui s'échappe). */
export const dot = (o: Ctx, x: number, y: number, r: number): void => {
  o.fillStyle = '#000';
  o.beginPath();
  o.arc(x, y, r, 0, Math.PI * 2);
  o.fill();
};
