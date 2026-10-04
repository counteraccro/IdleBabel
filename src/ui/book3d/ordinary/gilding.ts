import { GOLD, MCQW, MH, MW, SERIF, hexagon, rng, type Context } from './mockup';
import type { CoverDesign } from '../../../systems/coverDesign';

/**
 * Les fers de la reliure, dans le repère de la maquette (plats de 640 × 800) : roulette, filets à froid,
 * fers d'angle, cartouche du titre, or usé, marque de la Bibliothèque.
 */

/** Roulette : une frise le long d'un cadre (`inset` en cqw), entre deux filets fins. */
export const frieze = (context: Context, inset: number, kind: number): void => {
  const at = inset * MCQW;
  const step = 1.5 * MCQW;
  context.save();
  context.fillStyle = GOLD;
  context.strokeStyle = GOLD;
  context.globalAlpha = 0.85;
  context.lineWidth = 0.22 * MCQW;
  for (const offset of [-0.85, 0.85]) {
    const line = at + offset * MCQW;
    context.strokeRect(line, line, MW - 2 * line, MH - 2 * line);
  }
  const motif = (x: number, y: number, horizontal: boolean, index: number): void => {
    context.beginPath();
    if (kind === 0) context.arc(x, y, 0.36 * MCQW, 0, 2 * Math.PI);
    else if (kind === 1) {
      // Dents de rat, pointées vers l'intérieur.
      const s = 0.5 * MCQW;
      if (horizontal) {
        context.moveTo(x - s, y + s);
        context.lineTo(x, y - s);
        context.lineTo(x + s, y + s);
      } else {
        context.moveTo(x + s, y - s);
        context.lineTo(x - s, y);
        context.lineTo(x + s, y + s);
      }
    } else if (kind === 2) {
      // Chaînette : losanges et points.
      if (index % 2) context.arc(x, y, 0.22 * MCQW, 0, 2 * Math.PI);
      else {
        const s = 0.55 * MCQW;
        context.moveTo(x, y - s);
        context.lineTo(x + s, y);
        context.lineTo(x, y + s);
        context.lineTo(x - s, y);
      }
    } else {
      // Feuilles penchées, en épi.
      const s = 0.45 * MCQW;
      context.ellipse(x, y, horizontal ? s : s * 0.45, horizontal ? s * 0.45 : s, index % 2 ? 0.6 : -0.6, 0, 2 * Math.PI);
    }
    context.fill();
  };
  const across = Math.floor((MW - 2 * at) / step);
  const down = Math.floor((MH - 2 * at) / step);
  for (let i = 0; i <= across; i++) {
    const x = at + ((MW - 2 * at) * i) / across;
    motif(x, at, true, i);
    motif(x, MH - at, true, i);
  }
  for (let i = 1; i < down; i++) {
    const y = at + ((MH - 2 * at) * i) / down;
    motif(at, y, false, i);
    motif(MW - at, y, false, i);
  }
  context.restore();
};

/** Filets à froid : un double filet poussé sans or, en creux (une ombre, un reflet décalé). */
export const blindFrame = (context: Context, inset: number): void => {
  context.save();
  for (const [offset, width] of [
    [0, 0.35],
    [1.1, 0.2],
  ]) {
    const at = (inset + offset) * MCQW;
    context.lineWidth = width * MCQW;
    context.strokeStyle = 'rgba(0,0,0,0.38)';
    context.strokeRect(at, at, MW - 2 * at, MH - 2 * at);
    context.strokeStyle = 'rgba(255,232,195,0.09)';
    context.strokeRect(at + 0.25 * MCQW, at + 0.25 * MCQW, MW - 2 * at, MH - 2 * at);
  }
  context.restore();
};

/** Les quatre fers d'angle (image `fer`, coin en haut à gauche), à `inset` cqw des bords, de `size` cqw. */
export const corners = (context: Context, fer: CanvasImageSource, inset: number, size = 12): void => {
  const [s, at] = [size * MCQW, inset * MCQW];
  for (const [x, y, angle] of [
    [at, at, 0],
    [MW - at, at, 90],
    [MW - at, MH - at, 180],
    [at, MH - at, 270],
  ]) {
    context.save();
    context.translate(x, y);
    context.rotate((angle * Math.PI) / 180);
    context.drawImage(fer, 0, 0, s, s);
    context.restore();
  }
};

/** Place du titre doré (leatherCover.ts) dans le repère de la maquette. */
const TITLE_SIZE = 8 * MCQW;
const TITLE_LINE = TITLE_SIZE * 1.15 + 1.5 * MCQW;
const TITLE_TOP = MH * 0.26;

/** Cartouche autour du titre : à pans coupés (`model` 1) ou en étiquette pointue (2). */
export const cartouche = (context: Context, words: readonly string[], model: number): void => {
  context.save();
  context.font = `${TITLE_SIZE}px ${SERIF}`;
  context.letterSpacing = `${0.18 * TITLE_SIZE}px`;
  const widest = Math.min(MW - 24 * MCQW, Math.max(...words.map((word) => context.measureText(word.toUpperCase()).width)));
  const w = Math.max(widest + 10 * MCQW, 40 * MCQW);
  const [x, y, h, cut] = [(MW - w) / 2, TITLE_TOP - 3 * MCQW, TITLE_LINE * words.length + 3.2 * MCQW, 2.4 * MCQW];
  context.strokeStyle = GOLD;
  context.globalAlpha = 0.85;
  const shape = (o: number): void => {
    context.beginPath();
    if (model === 1) {
      context.moveTo(x - o + cut, y - o);
      context.lineTo(x + w + o - cut, y - o);
      context.lineTo(x + w + o, y - o + cut);
      context.lineTo(x + w + o, y + h + o - cut);
      context.lineTo(x + w + o - cut, y + h + o);
      context.lineTo(x - o + cut, y + h + o);
      context.lineTo(x - o, y + h + o - cut);
      context.lineTo(x - o, y - o + cut);
    } else {
      const point = 3.2 * MCQW;
      context.moveTo(x - o, y - o);
      context.lineTo(x + w + o, y - o);
      context.lineTo(x + w + o + point, y + h / 2);
      context.lineTo(x + w + o, y + h + o);
      context.lineTo(x - o, y + h + o);
      context.lineTo(x - o - point, y + h / 2);
    }
    context.closePath();
    context.stroke();
  };
  context.lineWidth = 0.45 * MCQW;
  shape(0);
  context.lineWidth = 0.18 * MCQW;
  shape(1.1 * MCQW);
  context.restore();
};

/** L'or s'en va avec le cuir : des points et des plaques usés, surtout aux bords et autour des éraflures. */
export const rubGold = (context: Context, design: CoverDesign, seed: number): void => {
  const random = rng(seed + 11);
  context.save();
  context.globalCompositeOperation = 'destination-out';
  const count = Math.floor(250 + design.wear * 1400);
  for (let i = 0; i < count; i++) {
    let [x, y] = [random() * MW, random() * MH];
    if (random() < 0.5) {
      const scuff = design.scuffs[Math.floor(random() * design.scuffs.length)];
      x = scuff.x * MW + (random() - 0.5) * scuff.size * 60 * MCQW;
      y = scuff.y * MH + (random() - 0.5) * scuff.size * 40 * MCQW;
    }
    context.fillStyle = `rgba(0,0,0,${0.25 + random() * 0.6})`;
    context.beginPath();
    context.arc(x, y, (0.12 + random() * 0.5) * MCQW, 0, 2 * Math.PI);
    context.fill();
  }
  const rub = context.createRadialGradient(MW * 0.5, MH * 0.5, MW * 0.3, MW * 0.5, MH * 0.5, MW * 0.75);
  rub.addColorStop(0, 'rgba(0,0,0,0)');
  rub.addColorStop(1, `rgba(0,0,0,${0.15 + design.wear * 0.5})`);
  context.fillStyle = rub;
  context.fillRect(0, 0, MW, MH);
  context.restore();
};

/** La marque de la Bibliothèque, à froid : un hexagone poussé dans le cuir du plat arrière. */
export const libraryMark = (context: Context, x: number, y: number, size: number): void => {
  context.save();
  for (const [shift, color] of [
    [0.3 * MCQW, 'rgba(255,232,195,0.08)'],
    [0, 'rgba(0,0,0,0.4)'],
  ] as const) {
    context.translate(shift, shift);
    context.strokeStyle = color;
    context.lineWidth = 0.5 * MCQW;
    hexagon(context, x, y, size);
    context.stroke();
    context.lineWidth = 0.25 * MCQW;
    hexagon(context, x, y, size * 0.72);
    context.stroke();
    context.fillStyle = color;
    hexagon(context, x, y, size * 0.22);
    context.fill();
    context.translate(-shift, -shift);
  }
  context.restore();
};
