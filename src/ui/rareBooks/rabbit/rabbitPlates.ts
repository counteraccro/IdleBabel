import { messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { FELL, FELL_SC, INK, PLATE_PAPER, SOFT, ellipse, grass, hatch, random, text, track } from './rabbitDraw';
import { drawEngraved, emptySpot } from './rabbitEngraving';

/**
 * Les douze planches hors-texte du « Lapin de garenne » (maquette .ai/maquette-lapin-pages.html) : des gravures à
 * l'encre brune où la place du lapin est vide, cernée d'un pointillé (sa silhouette gravée). Rentré dans ses
 * planches (attrapé trois fois), il y reprend sa place : le lapin gravé lui-même.
 */

const W = PAGE_TEXTURE.width;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
/** La scène de chaque planche, dans l'ordre des chapitres. */
const SCENES = ['gite', 'burrow', 'clover', 'listen', 'run', 'head', 'family', 'fox', 'snow', 'hutch', 'white', 'observer'] as const;
type Scene = (typeof SCENES)[number];
/** Le cadre de la gravure : x 70-570, y 150-590. */
const BOX = { x: 70, y: 150, w: 500, h: 440 };
/** Le lapin gravé est 1,5 fois plus large que le lapin de profil sur lequel les places ont été réglées. */
const ENGRAVED_K = 0.68;

export const romanNumeral = (index: number): string => ROMAN[index];

/**
 * Un pré gravé : ciel en hachures fines, colline ombrée de traits qui suivent son relief, herbe dense, sol de plus en
 * plus sombre vers le bas (hachures croisées tout en bas). Renvoie la ligne du sol.
 */
const meadow = (context: CanvasRenderingContext2D, seed: number, groundY = 470): ((x: number) => number) => {
  const { x, y, w, h } = BOX;
  const next = random(seed * 97 + 5);
  hatch(context, x, x + w, y + 6, y + 150, seed, 10, 'rgba(59,42,26,0.22)');
  const hill = (gx: number): number => y + 210 - Math.sin((gx - x) / 90 + seed) * 26;
  // L'ombre de la colline : des traits parallèles à sa crête, plus serrés et plus sombres vers le sol.
  for (let k = 0; ; k++) {
    const offset = k * (7 - Math.min(4, k * 0.25));
    let any = false;
    context.strokeStyle = `rgba(59,42,26,${Math.min(0.85, 0.25 + k * 0.05)})`;
    context.lineWidth = 0.9 + k * 0.04;
    context.beginPath();
    let pen = false;
    for (let gx = x; gx <= x + w; gx += 4) {
      const gy = hill(gx) + offset;
      if (gy > groundY - 4 || next() < 0.04) {
        pen = false;
        continue;
      }
      any = true;
      context[pen ? 'lineTo' : 'moveTo'](gx, gy);
      pen = true;
    }
    context.stroke();
    if (!any || k > 60) break;
  }
  context.strokeStyle = INK;
  context.lineWidth = 1.6;
  context.beginPath();
  for (let gx = x; gx <= x + w; gx += 4) context[gx === x ? 'moveTo' : 'lineTo'](gx, hill(gx));
  context.stroke();
  const ground = (gx: number): number => groundY + Math.sin((gx - x) / 60 + seed) * 5;
  hatch(context, x, x + w, groundY + 8, y + h, seed + 1, 4, INK);
  // Hachures croisées dans le bas du sol.
  context.save();
  context.beginPath();
  context.rect(x, groundY + (y + h - groundY) * 0.45, w, h);
  context.clip();
  context.strokeStyle = 'rgba(59,42,26,0.7)';
  context.lineWidth = 1;
  for (let k = -200; k < w + 200; k += 5) {
    context.beginPath();
    context.moveTo(x + k, y + h);
    context.lineTo(x + k + 60, groundY);
    context.stroke();
  }
  context.restore();
  grass(context, x, x + w, ground, INK, seed + 2, { tall: 1.15 });
  grass(context, x + 2, x + w, ground, INK, seed + 3, { tall: 0.7 });
  return ground;
};

/** Un terrier en coupe : un tunnel, cerné d'encre. */
const tunnel = (context: CanvasRenderingContext2D, points: [number, number][], radius: number): void => {
  context.lineWidth = radius * 2 + 4;
  context.strokeStyle = INK;
  context.beginPath();
  points.forEach(([px, py], index) => context[index ? 'lineTo' : 'moveTo'](px, py));
  context.stroke();
  context.lineWidth = radius * 2;
  context.strokeStyle = PLATE_PAPER;
  context.stroke();
};

const scene = (context: CanvasRenderingContext2D, kind: Scene, home: boolean): void => {
  const { x, y, w, h } = BOX;
  const cx = x + w / 2;
  /** Sa place, pieds en (sx, sy) : vide, ou le lapin revenu ; `facing` : 1 tête à droite, -1 à gauche. */
  const spot = (sx: number, sy: number, size: number, facing: 1 | -1 = -1): void =>
    home
      ? drawEngraved(context, sx, sy, size * ENGRAVED_K, facing)
      : emptySpot(context, sx, sy, size * ENGRAVED_K, facing, SOFT, PLATE_PAPER, 2, [6, 6]);
  if (kind === 'burrow') {
    hatch(context, x, x + w, y + 6, y + 60, 4, 10, 'rgba(59,42,26,0.3)');
    grass(context, x, x + w, () => y + 90, INK, 5, { tall: 0.8 });
    // La terre en coupe.
    hatch(context, x, x + w, y + 92, y + h, 6, 5, INK);
    context.save();
    context.lineCap = 'round';
    tunnel(
      context,
      [
        [x + 60, y + 90],
        [x + 110, y + 190],
        [cx, y + 300],
      ],
      18,
    );
    tunnel(
      context,
      [
        [x + w - 50, y + 90],
        [x + w - 120, y + 220],
        [cx + 40, y + 300],
      ],
      18,
    );
    tunnel(
      context,
      [
        [cx - 60, y + 300],
        [cx + 120, y + 300],
      ],
      20,
    );
    context.fillStyle = PLATE_PAPER;
    ellipse(context, cx, y + 330, 120, 66);
    context.lineWidth = 2.4;
    context.strokeStyle = INK;
    context.stroke();
    context.fill();
    context.restore();
    spot(cx + 10, y + 380, 0.42);
    return;
  }
  if (kind === 'snow') {
    hatch(context, x, x + w, y + 6, y + 120, 8, 12, 'rgba(59,42,26,0.25)');
    context.strokeStyle = INK;
    context.lineWidth = 1.2;
    context.beginPath();
    context.moveTo(x, y + 200);
    context.bezierCurveTo(x + 160, y + 170, x + 330, y + 230, x + w, y + 190);
    context.stroke();
    // Deux arbres nus.
    for (const tx of [x + 70, x + 430]) {
      context.lineWidth = 3;
      context.beginPath();
      context.moveTo(tx, y + 205);
      context.lineTo(tx, y + 90);
      context.stroke();
      context.lineWidth = 1.4;
      for (let k = 0; k < 6; k++) {
        const by = y + 110 + k * 14;
        context.beginPath();
        context.moveTo(tx, by);
        context.lineTo(tx + (k % 2 ? 1 : -1) * (26 - k * 3), by - 18);
        context.stroke();
      }
    }
    let [tx, ty] = [x + 40, y + 410];
    for (let k = 0; k < 6; k++) {
      track(context, tx, ty, 0.6, Math.PI / 2 - 0.25, INK);
      tx += 46 + k * 4;
      ty -= 14;
    }
    spot(tx + 60, ty + 10, 0.5, 1);
    return;
  }
  if (kind === 'hutch') {
    hatch(context, x, x + w, y + 6, y + h, 9, 14, 'rgba(59,42,26,0.18)');
    const [hx, hy, hw, hh] = [x + 70, y + 70, w - 140, 300];
    context.strokeStyle = INK;
    context.lineWidth = 3;
    context.strokeRect(hx, hy, hw, hh);
    context.lineWidth = 1.2;
    for (let k = 1; k < 4; k++) {
      context.beginPath();
      context.moveTo(hx, hy + k * 8);
      context.lineTo(hx + hw, hy + k * 8);
      context.stroke();
    }
    hatch(context, hx + 3, hx + hw - 3, hy + hh - 40, hy + hh - 3, 10, 5, INK);
    spot(cx, hy + hh - 40, 0.75);
    context.lineWidth = 2;
    context.strokeStyle = INK;
    for (let bx = hx + 22; bx < hx + hw; bx += 26) {
      context.beginPath();
      context.moveTo(bx, hy + 30);
      context.lineTo(bx, hy + hh);
      context.stroke();
    }
    return;
  }
  if (kind === 'head') {
    hatch(context, x, x + w, y + 6, y + h, 11, 9, 'rgba(59,42,26,0.2)');
    spot(cx + 180, y + 560, 2.3);
    return;
  }
  const ground = meadow(context, { gite: 1, clover: 2, listen: 3, run: 4, family: 5, fox: 6, white: 7, observer: 8 }[kind]);
  if (kind === 'clover') {
    context.strokeStyle = INK;
    context.lineWidth = 1.4;
    for (let k = 0; k < 9; k++) {
      const lx = x + 30 + k * 55;
      const ly = ground(lx) + 6 + (k % 3) * 10;
      for (let leaf = 0; leaf < 3; leaf++) {
        ellipse(context, lx + Math.cos(leaf * 2.1) * 9, ly + Math.sin(leaf * 2.1) * 9, 7, 7);
        context.stroke();
      }
    }
    spot(cx + 30, ground(cx) + 8, 0.75);
  }
  if (kind === 'gite') spot(cx, ground(cx) + 8, 0.8);
  if (kind === 'listen') spot(cx, ground(cx) + 8, 1.05);
  if (kind === 'run') {
    // Assis au bout de ses traces, tête vers la droite.
    spot(cx + 90, ground(cx) + 8, 0.8, 1);
    for (let k = 0; k < 4; k++) track(context, cx - 70 - k * 70, ground(cx) + 30, 0.55, Math.PI / 2, INK);
  }
  if (kind === 'family') {
    spot(cx - 90, ground(cx) + 8, 0.75);
    for (const [dx, size] of [
      [60, 0.36],
      [130, 0.32],
      [190, 0.38],
    ])
      spot(cx + dx, ground(cx + dx) + 8, size);
  }
  if (kind === 'fox') {
    // Le renard, à gauche, couché dans l'herbe (gravé plein).
    context.save();
    context.fillStyle = '#5a4128';
    const [fx, fy] = [x + 130, ground(x + 130) + 6];
    for (const [ex, ey, rx, ry, angle] of [
      [0, -30, 70, 26, 0],
      [70, -46, 30, 22, 0.2],
      [100, -40, 22, 9, 0.2],
      [-90, -26, 50, 16, -0.3],
    ]) {
      ellipse(context, fx + ex, fy + ey, rx, ry, angle);
      context.fill();
    }
    for (const ex of [60, 80]) {
      context.beginPath();
      context.moveTo(fx + ex - 10, fy - 60);
      context.lineTo(fx + ex, fy - 90);
      context.lineTo(fx + ex + 10, fy - 58);
      context.fill();
    }
    context.fillStyle = PLATE_PAPER;
    ellipse(context, fx + 78, fy - 50, 3, 3);
    context.fill();
    context.restore();
    spot(x + w - 110, ground(x + w - 110) + 8, 0.65, 1);
  }
  if (kind === 'white') spot(cx + 20, ground(cx) + 8, 0.85);
  if (kind === 'observer') {
    // Le chapeau de l'auteur, posé dans l'herbe.
    const [hx, hy] = [x + 120, ground(x + 120) + 10];
    context.fillStyle = '#4a3220';
    context.fillRect(hx - 40, hy - 90, 80, 84);
    ellipse(context, hx, hy - 6, 70, 12);
    context.fill();
    context.fillStyle = PLATE_PAPER;
    context.fillRect(hx - 40, hy - 32, 80, 8);
    spot(x + w - 140, ground(x + w - 140) + 8, 0.8, 1);
  }
};

/** La planche du chapitre `chapter` (numéro, gravure, légende) ; `home` : le lapin y est revenu. */
export const paintPlate = (context: CanvasRenderingContext2D, chapter: number, home: boolean): void => {
  const pages = messages().rareBooks.rabbit.pages;
  const { x, y, w, h } = BOX;
  text(context, `${pages.plate} ${ROMAN[chapter]}.`, W / 2, 110, `20px ${FELL_SC}`, INK, 'center', 4);
  context.save();
  context.fillStyle = PLATE_PAPER;
  context.fillRect(x, y, w, h);
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  scene(context, SCENES[chapter], home);
  context.restore();
  context.strokeStyle = INK;
  context.lineWidth = 1.5;
  context.strokeRect(x, y, w, h);
  context.lineWidth = 0.8;
  context.strokeRect(x - 6, y - 6, w + 12, h + 12);
  text(context, pages.plates[chapter], W / 2, y + h + 56, `italic 24px ${FELL}`, INK);
  text(context, pages.latin, W / 2, y + h + 88, `italic 17px ${FELL}`, SOFT);
  text(context, pages.engraver, x + w, y + h + 22, `italic 13px ${FELL}`, SOFT, 'right');
};
