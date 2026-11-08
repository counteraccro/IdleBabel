import { t } from '../../i18n';
import { seeded } from '../../core/random';
import { HEIGHT, WIDTH } from '../book3d/leatherCover';

/**
 * Les plats du Livre d'or, à l'identique de la maquette validée le 08/11 (.ai/maquette-couverture-livre-dor.html, d'après le
 * Livre d'or de la ville de Saint-Étienne) : maroquin rouge grainé, dentelle dorée, fleurons aux coins ; au milieu, le sceau du
 * jeu entre deux branches de laurier nouées d'un ruban. La maquette dessine sur 800 × 1000, la taille d'un plat : ses nombres
 * sont repris tels quels.
 */

type Context = CanvasRenderingContext2D;
type Ink = string | CanvasGradient;

const canvas = (): [HTMLCanvasElement, Context] => {
  const node = document.createElement('canvas');
  node.width = WIDTH;
  node.height = HEIGHT;
  return [node, node.getContext('2d')!];
};

/** L'or poussé : un peu mat, pâle, comme la dorure du modèle. */
const gold = (c: Context, x: number, y: number, w: number, h: number): CanvasGradient => {
  const g = c.createLinearGradient(x, y, x + w * 0.5, y + h);
  for (const [color, at] of [
    ['#c9a24e', 0],
    ['#f4dd98', 0.3],
    ['#dcb862', 0.55],
    ['#f7e6ae', 0.75],
    ['#b88d3c', 1],
  ] as const)
    g.addColorStop(at, color);
  return g;
};

/** L'or est poussé dans le cuir : un creux sombre dessous, puis l'or. */
const pressed = (c: Context, draw: (ink: Ink | null) => void): void => {
  c.save();
  c.translate(1.5, 2);
  c.globalAlpha = 0.55;
  draw('rgba(40,5,0,1)');
  c.restore();
  draw(null);
};

/** Maroquin rouge : grain serré en petits plis, plus sombre aux bords ; sur `width` de large (le dos, étiré ensuite). */
const morocco = (c: Context, seed: number, width = WIDTH): void => {
  // Le dos, étroit : la lueur garde la taille de celle du plat, sinon ses deux bouts tomberaient dans le sombre.
  const g = c.createRadialGradient(width * 0.45, HEIGHT * 0.42, 60, width / 2, HEIGHT / 2, WIDTH * 0.85);
  g.addColorStop(0, '#c8432f');
  g.addColorStop(0.7, '#a8301f');
  g.addColorStop(1, '#6e1a12');
  c.fillStyle = g;
  c.fillRect(0, 0, width, HEIGHT);
  const r = seeded(seed);
  for (let i = 0; i < (60000 * width) / WIDTH; i++) {
    const [x, y, s] = [r() * width, r() * HEIGHT, 1.5 + r() * 2.5];
    c.fillStyle = `rgba(60,8,0,${0.08 + r() * 0.12})`;
    c.fillRect(x, y, s, s * 0.7);
    c.fillStyle = `rgba(255,170,140,${0.03 + r() * 0.05})`;
    c.fillRect(x - 1, y - 1, s * 0.6, s * 0.4);
  }
  const e = c.createLinearGradient(0, 0, width, 0);
  e.addColorStop(0, 'rgba(50,5,0,.35)');
  e.addColorStop(0.05, 'rgba(0,0,0,0)');
  e.addColorStop(0.95, 'rgba(0,0,0,0)');
  e.addColorStop(1, 'rgba(50,5,0,.4)');
  c.fillStyle = e;
  c.fillRect(0, 0, width, HEIGHT);
};

/** Une petite feuille (laurier, ou fleuron de la dentelle). */
const leaf = (c: Context, x: number, y: number, angle: number, len: number, wid: number): void => {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(len * 0.5, -wid, len, 0);
  c.quadraticCurveTo(len * 0.5, wid, 0, 0);
  c.fill();
  c.restore();
};

/** La dentelle : double filet, une frise de petites volutes entre les deux, fleurons aux coins. */
const lace = (c: Context, ink: Ink): void => {
  c.strokeStyle = ink;
  c.fillStyle = ink;
  for (const [inset, w] of [
    [22, 3],
    [30, 1.2],
    [78, 1.2],
    [86, 2.5],
  ]) {
    c.lineWidth = w;
    c.strokeRect(inset, inset, WIDTH - 2 * inset, HEIGHT - 2 * inset);
  }
  const band = (x0: number, y0: number, x1: number, y1: number): void => {
    const [n, ang] = [Math.round(Math.hypot(x1 - x0, y1 - y0) / 34), Math.atan2(y1 - y0, x1 - x0)];
    for (let i = 0; i < n; i++) {
      const [at, f] = [(i + 0.5) / n, i % 2 ? 1 : -1];
      c.save();
      c.translate(x0 + (x1 - x0) * at, y0 + (y1 - y0) * at);
      c.rotate(ang);
      c.beginPath();
      c.moveTo(-15, 0);
      c.bezierCurveTo(-8, -12 * f, 8, 12 * f, 15, 0);
      c.lineWidth = 2;
      c.stroke();
      c.beginPath();
      c.arc(0, -9 * f, 2.6, 0, 7);
      c.fill();
      leaf(c, 0, 0, (-Math.PI / 2) * f, 9, 3);
      c.restore();
    }
  };
  const [a, b, top, bottom] = [54, WIDTH - 54, 54, HEIGHT - 54];
  band(a + 40, top, b - 40, top);
  band(a + 40, bottom, b - 40, bottom);
  band(a, top + 40, a, bottom - 40);
  band(b, top + 40, b, bottom - 40);
  for (const [x, y] of [
    [a, top],
    [b, top],
    [a, bottom],
    [b, bottom],
  ]) {
    for (let k = 0; k < 8; k++) leaf(c, x, y, (k * Math.PI) / 4, k % 2 ? 18 : 30, k % 2 ? 4 : 7);
    c.beginPath();
    c.arc(x, y, 6, 0, 7);
    c.fill();
  }
};

/** Le sceau du jeu : deux hexagones et le point du milieu (public/favicon.svg). */
const seal = (c: Context, cx: number, cy: number, r: number, ink: Ink): void => {
  const hex = (rr: number): void => {
    c.beginPath();
    for (let k = 0; k < 6; k++) {
      const an = -Math.PI / 2 + (k * Math.PI) / 3;
      if (k) c.lineTo(cx + rr * Math.cos(an), cy + rr * Math.sin(an));
      else c.moveTo(cx + rr * Math.cos(an), cy + rr * Math.sin(an));
    }
    c.closePath();
  };
  c.strokeStyle = ink;
  c.fillStyle = ink;
  c.lineJoin = 'miter';
  hex(r * 0.88);
  c.lineWidth = r * 0.15;
  c.stroke();
  hex(r * 0.56);
  c.lineWidth = r * 0.11;
  c.stroke();
  c.beginPath();
  c.arc(cx, cy, r * 0.14, 0, 7);
  c.fill();
};

/** Deux branches de laurier en arc autour du sceau, nouées en bas d'un ruban. */
const branches = (c: Context, cx: number, cy: number, r: number, ink: Ink): void => {
  c.strokeStyle = ink;
  c.fillStyle = ink;
  for (const side of [-1, 1]) {
    c.beginPath();
    c.arc(cx, cy, r, Math.PI / 2 + side * 0.25, Math.PI / 2 + side * 2.55, side < 0);
    c.lineWidth = 4;
    c.stroke();
    for (let i = 0; i < 15; i++) {
      const an = Math.PI / 2 + side * (0.38 + i * 0.145);
      const [x, y] = [cx + Math.cos(an) * r, cy + Math.sin(an) * r];
      const [out, tang] = [an + side * 0.1, an + (side * Math.PI) / 2];
      // Deux feuilles par nœud, une baie de temps en temps.
      leaf(c, x, y, tang - 0.75 * side + Math.PI, 50, 12);
      leaf(c, x, y, tang + 0.85 * side + Math.PI, 44, 11);
      if (i % 3 === 1) {
        c.beginPath();
        c.arc(x + Math.cos(out) * 14, y + Math.sin(out) * 14, 5, 0, 7);
        c.fill();
      }
    }
  }
  const y = cy + r + 6;
  c.lineWidth = 3;
  for (const side of [-1, 1]) {
    c.beginPath();
    c.ellipse(cx + side * 22, y, 22, 10, side * 0.3, 0, 7);
    c.stroke();
    c.beginPath();
    c.moveTo(cx + side * 6, y + 4);
    c.quadraticCurveTo(cx + side * 30, y + 30, cx + side * 60, y + 34);
    c.lineTo(cx + side * 52, y + 22);
    c.quadraticCurveTo(cx + side * 30, y + 20, cx + side * 4, y);
    c.fill();
  }
  c.beginPath();
  c.arc(cx, y, 7, 0, 7);
  c.fill();
};

/** Un petit fleuron en long : une tige, deux feuilles de chaque côté, une fleur. */
const sprig = (c: Context, cx: number, cy: number, ink: Ink): void => {
  c.fillStyle = ink;
  c.strokeStyle = ink;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(cx - 70, cy);
  c.lineTo(cx + 70, cy);
  c.stroke();
  for (const s of [-1, 1]) {
    leaf(c, cx + s * 8, cy, s < 0 ? Math.PI + 0.4 : -0.4, 26, 6);
    leaf(c, cx + s * 8, cy, s < 0 ? Math.PI - 0.4 : 0.4, 26, 6);
  }
  c.beginPath();
  c.arc(cx, cy, 6, 0, 7);
  c.fill();
  for (const s of [-1, 1]) {
    c.beginPath();
    c.arc(cx + s * 70, cy, 3, 0, 7);
    c.fill();
  }
};

const text = (c: Context, words: string, font: string, y: number, ink: Ink, spacing: string): void => {
  c.font = font;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.letterSpacing = spacing;
  c.fillStyle = ink;
  c.fillText(words, WIDTH / 2, y, WIDTH - 200);
};

/** Les polices du plat, à charger avant de le dessiner. */
export const loadGoldBookCoverFonts = (): Promise<unknown> =>
  Promise.all([document.fonts.load('500 38px Cinzel'), document.fonts.load('600 84px Cinzel')]);

/** Le plat de devant : la maquette entière. */
export const goldBookFront = (): HTMLCanvasElement => {
  const [node, c] = canvas();
  morocco(c, 11);
  const g = gold(c, 0, 0, WIDTH, HEIGHT);
  pressed(c, (ink) => {
    const col = ink ?? g;
    lace(c, col);
    text(c, t('goldBook.cover.library'), '500 38px Cinzel, Georgia, serif', 205, col, '3px');
    sprig(c, WIDTH / 2, 252, col);
    branches(c, WIDTH / 2, 480, 165, col);
    seal(c, WIDTH / 2, 470, 120, col);
    text(c, t('goldBook.cover.title'), '600 84px Cinzel, Georgia, serif', 772, col, '6px');
    sprig(c, WIDTH / 2, 836, col);
  });
  return node;
};

/** Le plat arrière : le cuir et sa dentelle. Sans `laced`, le cuir nu (l'intérieur des plats). */
export const goldBookBoard = (seed: number, laced: boolean): HTMLCanvasElement => {
  const [node, c] = canvas();
  morocco(c, seed);
  if (laced) {
    const g = gold(c, 0, 0, WIDTH, HEIGHT);
    pressed(c, (ink) => lace(c, ink ?? g));
  }
  return node;
};

/** Largeur du dos dans son image, étirée sur la largeur d'un plat : sa part de la hauteur, comme l'épaisseur du livre. */
const SPINE_WIDTH = 140;

/** Le dos, comme celui du modèle : le maroquin, cinq nerfs soulignés d'or ; le titre en long entre les nerfs du milieu. */
export const goldBookSpine = (): HTMLCanvasElement => {
  const [node, c] = canvas();
  c.scale(WIDTH / SPINE_WIDTH, 1);
  morocco(c, 17, SPINE_WIDTH);
  const g = gold(c, 0, 0, SPINE_WIDTH, HEIGHT);
  // Les nerfs : une bosse (ombre dessous, reflet dessus), deux filets d'or.
  for (const y of [120, 230, 770, 880]) {
    const bump = c.createLinearGradient(0, y - 12, 0, y + 12);
    bump.addColorStop(0, 'rgba(255,190,160,.25)');
    bump.addColorStop(1, 'rgba(40,5,0,.5)');
    c.fillStyle = bump;
    c.fillRect(0, y - 12, SPINE_WIDTH, 24);
    pressed(c, (ink) => {
      c.fillStyle = ink ?? g;
      c.fillRect(8, y - 16, SPINE_WIDTH - 16, 2);
      c.fillRect(8, y + 14, SPINE_WIDTH - 16, 2);
    });
  }
  pressed(c, (ink) => {
    c.fillStyle = ink ?? g;
    for (const y of [175, 825]) {
      c.beginPath();
      c.arc(SPINE_WIDTH / 2, y, 7, 0, 7);
      c.fill();
    }
    c.save();
    c.translate(SPINE_WIDTH / 2, HEIGHT / 2);
    c.rotate(Math.PI / 2);
    c.font = '600 46px Cinzel, Georgia, serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.letterSpacing = '4px';
    c.fillText(t('goldBook.cover.title'), 0, 3, 480);
    c.restore();
  });
  return node;
};
