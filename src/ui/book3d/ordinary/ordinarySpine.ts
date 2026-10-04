import { messages } from '../../../i18n';
import { toRoman, type CoverDesign } from '../../../systems/coverDesign';
import { coverTitle } from '../../../systems/coverTitle';
import { createWear } from '../../book/coverWear';
import { svgImage } from '../textures';
import { leatherGrain } from './leatherGrain';
import { GOLD, MH, SERIF, SPINE_W, goldGradient, mockupCanvas, rng, type Context } from './mockup';
import type { CoverDetails } from '../../../systems/coverDetails';
import type { Binding } from '../../book/bindings';

/** Pièces de titre du dos : rouge, vert, noir, fauve. */
const PIECES = ['#7a1f1a', '#1f4a2c', '#161210', '#7a5424'];

/** Usure du cuir, aux proportions du dos. */
export const spineWear = async (context: Context, design: CoverDesign, strength: number, grain: boolean): Promise<void> => {
  const svg = createWear(design, { strength, grain }).querySelector('svg')!;
  context.drawImage(await svgImage(svg, Math.round(SPINE_W * 1.25), Math.round(MH * 1.25)), 0, 0, SPINE_W, MH);
};

/** L'étiquette de la Bibliothèque, collée au pied du dos : la cote, une ligne par nombre. */
const spineLabel = (context: Context, design: CoverDesign): void => {
  const [w, h] = [SPINE_W - 34, 74];
  const [x, y] = [(SPINE_W - w) / 2, MH - 50 - h];
  context.save();
  context.shadowColor = 'rgba(0,0,0,0.35)';
  context.shadowBlur = 3;
  context.shadowOffsetY = 1.5;
  context.fillStyle = '#ece3cb';
  context.beginPath();
  context.roundRect(x, y, w, h, 5);
  context.fill();
  context.shadowColor = 'transparent';
  context.strokeStyle = '#a89070';
  context.lineWidth = 1;
  context.stroke();
  context.fillStyle = '#3a2a18';
  context.font = `14px ${SERIF}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const { wall, shelf, volume } = design.shelfMark;
  [wall, shelf, volume].forEach((value, index) => context.fillText(toRoman(value), SPINE_W / 2, y + 16 + index * 21));
  context.restore();
};

/**
 * Le dos d'un livre de cuir (maquette : 134 × 800) : arrondi, 4 ou 5 nerfs soulignés d'or, roulettes de tête
 * et de queue, le titre doré sur une pièce de couleur, parfois la tomaison, un fleuron dans les autres caissons ;
 * l'or usé, les coiffes et les nerfs frottés ; l'étiquette de la cote au pied. `flower` : le fleuron doré.
 */
export const ordinarySpine = async (
  design: CoverDesign,
  details: CoverDetails,
  binding: Binding,
  flower: CanvasImageSource,
): Promise<HTMLCanvasElement> => {
  const [node, context] = mockupCanvas(SPINE_W, MH);
  context.fillStyle = binding.leather;
  context.fillRect(0, 0, SPINE_W, MH);
  const round = context.createLinearGradient(0, 0, SPINE_W, 0);
  round.addColorStop(0, 'rgba(0,0,0,0.55)');
  round.addColorStop(0.3, 'rgba(255,230,190,0.05)');
  round.addColorStop(0.5, 'rgba(255,230,190,0.09)');
  round.addColorStop(0.75, 'rgba(0,0,0,0.05)');
  round.addColorStop(1, 'rgba(0,0,0,0.6)');
  context.fillStyle = round;
  context.fillRect(0, 0, SPINE_W, MH);
  leatherGrain(context, SPINE_W, MH, details.seed + 2);

  const [top, bottom, count] = [46, MH - 46, details.nerfs];
  const step = (bottom - top) / (count + 1);
  const nerfs = Array.from({ length: count }, (_, i) => top + step * (i + 1));
  // L'or sur un calque, pour l'user ensuite sans toucher au cuir.
  const [gold, layer] = mockupCanvas(SPINE_W, MH);
  const ink = goldGradient(layer, 0, MH);
  layer.fillStyle = GOLD;
  for (const y of [22, MH - 22]) {
    layer.fillRect(10, y - 1, SPINE_W - 20, 1.6);
    for (let x = 14; x < SPINE_W - 12; x += 7) {
      layer.beginPath();
      layer.arc(x, y + (y < MH / 2 ? 6 : -6), 1.6, 0, 2 * Math.PI);
      layer.fill();
    }
  }
  for (const y of nerfs) {
    const relief = context.createLinearGradient(0, y - 9, 0, y + 9);
    relief.addColorStop(0, 'rgba(0,0,0,0.6)');
    relief.addColorStop(0.4, 'rgba(255,240,210,0.16)');
    relief.addColorStop(1, 'rgba(0,0,0,0.6)');
    context.fillStyle = relief;
    context.fillRect(0, y - 9, SPINE_W, 18);
    layer.fillStyle = GOLD;
    layer.fillRect(8, y - 12, SPINE_W - 16, 1.5);
    layer.fillRect(8, y + 11, SPINE_W - 16, 1.5);
  }
  // Les caissons, entre les nerfs : pièce de titre (le 2e), tomaison (le 3e), un fleuron ailleurs ; le dernier
  // laisse la place à l'étiquette.
  const box = (i: number): [number, number] => [i === 0 ? top : nerfs[i - 1], i === count ? bottom : nerfs[i]];
  for (let i = 0; i <= count; i++) {
    const [y0, y1] = box(i);
    const middle = (y0 + y1) / 2;
    if (i === 1) {
      context.fillStyle = PIECES[details.piece];
      context.fillRect(9, y0 + 16, SPINE_W - 18, y1 - y0 - 32);
      context.strokeStyle = 'rgba(0,0,0,0.5)';
      context.lineWidth = 1;
      context.strokeRect(9, y0 + 16, SPINE_W - 18, y1 - y0 - 32);
      layer.save();
      layer.fillStyle = ink;
      layer.font = `bold 15px ${SERIF}`;
      layer.letterSpacing = '1.5px';
      layer.textAlign = 'center';
      layer.textBaseline = 'middle';
      const lines = coverTitle(design).slice(0, 3);
      lines.forEach((word, k) => {
        const [text, room] = [word.toUpperCase(), SPINE_W - 30];
        const width = layer.measureText(text).width;
        layer.save();
        layer.translate(SPINE_W / 2, middle + (k - (lines.length - 1) / 2) * 19);
        if (width > room) layer.scale(room / width, 1);
        layer.fillText(text, 0, 0);
        layer.restore();
      });
      layer.restore();
      layer.fillRect(14, y0 + 20, SPINE_W - 28, 1);
      layer.fillRect(14, y1 - 21, SPINE_W - 28, 1);
    } else if (i === 2 && details.tome) {
      layer.save();
      layer.fillStyle = ink;
      layer.textAlign = 'center';
      layer.textBaseline = 'middle';
      layer.font = `italic 12px ${SERIF}`;
      layer.fillText(messages().covers.binding.tome, SPINE_W / 2, middle - 11);
      layer.font = `bold 20px ${SERIF}`;
      layer.fillText(toRoman(Math.min(design.shelfMark.volume, 12)), SPINE_W / 2, middle + 9);
      layer.restore();
    } else if (i < count) {
      const size = Math.min(34, (y1 - y0) * 0.5);
      layer.drawImage(flower, SPINE_W / 2 - size / 2, middle - size / 2, size, size);
      for (const [x, y] of [
        [18, y0 + 18],
        [SPINE_W - 18, y0 + 18],
        [18, y1 - 18],
        [SPINE_W - 18, y1 - 18],
      ]) {
        layer.beginPath();
        layer.arc(x, y, 2, 0, 2 * Math.PI);
        layer.fill();
      }
    }
  }
  // L'or usé, surtout sur les nerfs.
  const random = rng(details.seed + 5);
  layer.save();
  layer.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 80 + design.wear * 500; i++) {
    layer.fillStyle = `rgba(0,0,0,${0.3 + random() * 0.6})`;
    layer.beginPath();
    const y = random() < 0.5 ? nerfs[Math.floor(random() * count)] + (random() - 0.5) * 30 : random() * MH;
    layer.arc(random() * SPINE_W, y, 0.8 + random() * 3, 0, 2 * Math.PI);
    layer.fill();
  }
  layer.restore();
  context.save();
  context.shadowColor = 'rgba(0,0,0,0.55)';
  context.shadowOffsetY = 1.5;
  context.drawImage(gold, 0, 0, SPINE_W, MH);
  context.restore();
  // Coiffes et nerfs frottés.
  const rub = rng(details.seed + 9);
  context.save();
  context.globalAlpha = 0.25 + design.wear * 0.6;
  for (const y of [0, MH]) {
    const fade = context.createLinearGradient(0, y, 0, y ? y - 40 : 40);
    fade.addColorStop(0, 'rgba(150,115,80,0.85)');
    fade.addColorStop(1, 'rgba(150,115,80,0)');
    context.fillStyle = fade;
    context.fillRect(0, y ? y - 40 : 0, SPINE_W, 40);
  }
  for (const y of nerfs) {
    context.fillStyle = `rgba(160,125,90,${0.2 + rub() * 0.3})`;
    context.beginPath();
    context.ellipse(SPINE_W * (0.3 + rub() * 0.4), y, 10 + rub() * 20, 3, 0, 0, 2 * Math.PI);
    context.fill();
  }
  context.restore();
  await spineWear(context, design, 0.6, false);
  spineLabel(context, design);
  return node;
};
