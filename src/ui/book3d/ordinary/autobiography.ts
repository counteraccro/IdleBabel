import '@fontsource/playfair-display/400.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/playfair-display/700.css';
import { coverTitle, hasMeaningfulTitle } from '../../../systems/coverTitle';
import { MCQW, MH, MW, SANS, SPINE_W, fitText, mockupCanvas, rng, wrapLines, type Context } from './mockup';
import { babelWord, barcode, capitalize, gloss, publisherMark } from './modernDraw';
import type { CoverDesign } from '../../../systems/coverDesign';
import type { CoverDetails } from '../../../systems/coverDetails';

/**
 * L'autobiographie (maquette .ai/maquette-livres-ordinaires.html) : un portrait en noir et blanc d'une
 * personne sans visage, le nom en très grand, une signature, le titre en italique ; au dos, une citation.
 */
const PLAYFAIR = "'Playfair Display', Georgia, serif";
const PAPER = '#f2ece0';
export const AUTOBIOGRAPHY_RED = '#7a1f1a';

export const loadAutobiographyFonts = (): Promise<unknown> =>
  Promise.all([`700 40px ${PLAYFAIR}`, `italic 40px ${PLAYFAIR}`].map((font) => document.fonts.load(font)));

const titleLine = (design: CoverDesign): string => {
  const line = coverTitle(design).join(' ');
  return hasMeaningfulTitle(design) ? line : capitalize(line);
};

/** Un carreau de grain de photo argentique, tiré une fois pour toutes (le grain se répète sans se voir). */
let grainTile: HTMLCanvasElement | null = null;
const tile = (): HTMLCanvasElement => {
  if (grainTile) return grainTile;
  grainTile = document.createElement('canvas');
  grainTile.width = grainTile.height = 256;
  const context = grainTile.getContext('2d')!;
  const random = rng(43);
  for (let i = 0; i < (256 * 256) / 6; i++) {
    const value = random() < 0.5 ? 0 : 255;
    context.fillStyle = `rgba(${value},${value},${value},${0.03 + random() * 0.05})`;
    context.fillRect(random() * 256, random() * 256, 1.2, 1.2);
  }
  return grainTile;
};

/** Grain de photo argentique sur (x, y, w, h), décalé selon `seed` ; `strength` l'atténue. */
const filmGrain = (context: Context, x: number, y: number, w: number, h: number, seed: number, strength = 1): void => {
  context.save();
  context.globalAlpha = strength;
  const pattern = context.createPattern(tile(), 'repeat')!;
  pattern.setTransform(new DOMMatrix().translate(seed % 256, (seed >> 8) % 256));
  context.fillStyle = pattern;
  context.fillRect(x, y, w, h);
  context.restore();
};

/**
 * Le portrait : une personne de trois quarts, sans visage (la Bibliothèque garde les vies, pas les traits),
 * éclairée d'un côté ; noir et blanc ou sépia, trois coiffures.
 */
const portrait = (context: Context, seed: number, x: number, y: number, w: number, h: number): void => {
  const random = rng(seed + 41);
  const [sepia, hair, light] = [random() < 0.4, Math.floor(random() * 3), random() < 0.5 ? -1 : 1];
  const tone = (v: number): string =>
    sepia ? `rgb(${Math.round(v * 1.08)},${Math.round(v * 0.95)},${Math.round(v * 0.78)})` : `rgb(${v},${v},${v})`;
  context.save();
  context.beginPath();
  context.rect(x, y, w, h);
  context.clip();
  const back = context.createRadialGradient(x + w * (0.5 - light * 0.2), y + h * 0.3, w * 0.05, x + w / 2, y + h / 2, w * 0.9);
  back.addColorStop(0, tone(200));
  back.addColorStop(1, tone(70));
  context.fillStyle = back;
  context.fillRect(x, y, w, h);
  const [cx, hy, hr, tilt] = [x + w * (0.45 + random() * 0.1), y + h * (0.5 + random() * 0.04), w * 0.13, (random() - 0.5) * 0.18];
  // Épaules et veste.
  const coat = context.createLinearGradient(x, 0, x + w, 0);
  coat.addColorStop(0, tone(light < 0 ? 95 : 25));
  coat.addColorStop(1, tone(light < 0 ? 25 : 95));
  context.fillStyle = coat;
  context.beginPath();
  context.ellipse(cx, y + h * 1.1, w * 0.4, h * 0.3, 0, 0, 2 * Math.PI);
  context.fill();
  // Col de chemise.
  context.fillStyle = tone(225);
  context.beginPath();
  context.moveTo(cx - hr * 0.55, hy + hr * 1.45);
  context.lineTo(cx, hy + hr * 2.2);
  context.lineTo(cx + hr * 0.55, hy + hr * 1.45);
  context.lineTo(cx, hy + hr * 1.75);
  context.closePath();
  context.fill();
  const skin = context.createLinearGradient(cx - hr, 0, cx + hr, 0);
  skin.addColorStop(0, tone(light < 0 ? 210 : 90));
  skin.addColorStop(1, tone(light < 0 ? 90 : 210));
  context.fillStyle = skin;
  context.fillRect(cx - hr * 0.42, hy + hr * 0.6, hr * 0.84, hr * 1.1);
  context.save();
  context.translate(cx, hy);
  context.rotate(tilt);
  if (hair === 1) {
    context.fillStyle = tone(30);
    context.beginPath();
    context.ellipse(0, hr * 0.7, hr * 1.12, hr * 1.75, 0, 0, 2 * Math.PI);
    context.fill();
  }
  context.fillStyle = skin;
  context.beginPath();
  context.ellipse(0, 0, hr * 0.8, hr, 0, 0, 2 * Math.PI);
  context.fill();
  context.fillStyle = tone(hair === 0 ? 45 : 30);
  context.beginPath();
  context.ellipse(0, -hr * 0.3, hr * 0.86, hr * 0.78, 0, Math.PI * 1.02, Math.PI * 1.98);
  context.fill();
  context.beginPath();
  context.ellipse(-light * hr * 0.2, -hr * 0.62, hr * 0.8, hr * 0.42, -light * 0.25, 0, 2 * Math.PI);
  context.fill();
  if (hair === 2) {
    context.beginPath();
    context.arc(light * hr * 0.35, -hr * 1.15, hr * 0.38, 0, 2 * Math.PI);
    context.fill();
  }
  context.restore();
  // L'ombre du côté loin de la lumière, le vignettage, le grain.
  const shade = context.createLinearGradient(x, 0, x + w, 0);
  shade.addColorStop(light < 0 ? 0.55 : 0.45, 'rgba(0,0,0,0)');
  shade.addColorStop(light < 0 ? 1 : 0, 'rgba(0,0,0,0.45)');
  context.fillStyle = shade;
  context.fillRect(x, y, w, h);
  const vignette = context.createRadialGradient(x + w / 2, y + h / 2, w * 0.35, x + w / 2, y + h / 2, w * 0.85);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
  context.fillStyle = vignette;
  context.fillRect(x, y, w, h);
  filmGrain(context, x, y, w, h, seed + 43);
  context.restore();
};

/** Une signature à l'encre, tracée d'un seul geste. */
const signature = (context: Context, seed: number, x: number, y: number, w: number, color: string): void => {
  const random = rng(seed + 47);
  context.save();
  context.strokeStyle = color;
  context.lineWidth = 0.45 * MCQW;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.beginPath();
  context.moveTo(x, y);
  let previous = x;
  const count = 7 + Math.floor(random() * 5);
  for (let i = 0; i < count; i++) {
    const [next, up] = [x + (w * (i + 1)) / count, (random() < 0.3 ? 5 : 2.4) * MCQW];
    context.bezierCurveTo(previous + MCQW, y - up, next - 1.6 * MCQW, y + up * 0.6, next, y + (random() - 0.5) * 1.5 * MCQW);
    previous = next;
  }
  context.quadraticCurveTo(x + w * 1.05, y + 3 * MCQW, x + w * 0.2, y + 2.2 * MCQW);
  context.stroke();
  context.restore();
};

export const autobiographyFront = (design: CoverDesign, details: CoverDetails): HTMLCanvasElement => {
  const [node, context] = mockupCanvas(MW, MH);
  context.fillStyle = PAPER;
  context.fillRect(0, 0, MW, MH);
  portrait(context, details.seed, 0, 0, MW, MH * 0.74);
  // Le nom, très grand, posé sur la photo.
  const [first, last] = [design.author[0], design.author[1] ?? design.author[0]];
  context.save();
  context.fillStyle = '#fff';
  context.textBaseline = 'top';
  context.shadowColor = 'rgba(0,0,0,0.35)';
  context.shadowBlur = 1.2 * MCQW;
  context.font = `500 ${4 * MCQW}px ${SANS}`;
  context.letterSpacing = `${0.6 * MCQW}px`;
  fitText(context, first.toUpperCase(), 8 * MCQW, 7 * MCQW, 84 * MCQW);
  context.font = `700 ${13 * MCQW}px ${PLAYFAIR}`;
  context.letterSpacing = `${0.2 * MCQW}px`;
  fitText(context, last.toUpperCase(), 7.5 * MCQW, 11.5 * MCQW, 85 * MCQW);
  context.restore();
  signature(context, details.seed, MW * 0.55, MH * 0.66, MW * 0.32, 'rgba(255,255,255,0.88)');
  // Sous la photo : un filet rouge, le titre en italique, un mot de Babel en capitales.
  context.fillStyle = AUTOBIOGRAPHY_RED;
  context.fillRect(8 * MCQW, MH * 0.775, 10 * MCQW, 0.5 * MCQW);
  context.save();
  context.fillStyle = '#1d1d1b';
  context.textBaseline = 'top';
  context.font = `italic 400 ${8 * MCQW}px ${PLAYFAIR}`;
  fitText(context, titleLine(design), 8 * MCQW, MH * 0.8, 84 * MCQW);
  context.font = `400 ${3.2 * MCQW}px ${SANS}`;
  context.letterSpacing = `${0.5 * MCQW}px`;
  context.fillStyle = '#6b6258';
  fitText(context, babelWord(rng(details.seed + 53)).toUpperCase(), 8 * MCQW, MH * 0.905, 60 * MCQW);
  context.restore();
  publisherMark(context, 86, 113, '#1d1d1b');
  gloss(context, MW, MH);
  return node;
};

export const autobiographyBack = (design: CoverDesign, details: CoverDetails): HTMLCanvasElement => {
  const [node, context] = mockupCanvas(MW, MH);
  const random = rng(details.seed + 59);
  context.fillStyle = PAPER;
  context.fillRect(0, 0, MW, MH);
  // Une citation en grand, entre guillemets, et qui l'a dite.
  context.save();
  context.fillStyle = AUTOBIOGRAPHY_RED;
  context.font = `700 ${16 * MCQW}px ${PLAYFAIR}`;
  context.textBaseline = 'top';
  context.fillText('«', 8 * MCQW, 6 * MCQW);
  context.restore();
  context.save();
  context.fillStyle = '#1d1d1b';
  context.font = `italic ${5.2 * MCQW}px ${PLAYFAIR}`;
  context.textBaseline = 'top';
  const quote = Array.from({ length: 9 }, () => babelWord(random)).join(' ');
  wrapLines(context, quote, 76 * MCQW)
    .slice(0, 4)
    .forEach((line, index) => context.fillText(line, 12 * MCQW, (22 + index * 7.2) * MCQW));
  context.font = `500 ${3 * MCQW}px ${SANS}`;
  context.letterSpacing = `${0.4 * MCQW}px`;
  context.fillStyle = '#6b6258';
  context.fillText(`— ${babelWord(random).toUpperCase()} ${babelWord(random).toUpperCase()}`, 12 * MCQW, 54 * MCQW);
  context.restore();
  context.fillStyle = '#c9bfae';
  context.fillRect(8 * MCQW, 61 * MCQW, 84 * MCQW, 0.25 * MCQW);
  context.save();
  context.fillStyle = '#3a3530';
  context.font = `${3.2 * MCQW}px ${SANS}`;
  context.textBaseline = 'top';
  wrapLines(context, design.blurb, 80 * MCQW)
    .slice(0, 6)
    .forEach((line, index) => context.fillText(line, 10 * MCQW, (65 + index * 4.6) * MCQW));
  context.restore();
  // Une petite photo de l'auteur, plus jeune, et le code-barres.
  portrait(context, details.seed + 3, 10 * MCQW, 96 * MCQW, 17 * MCQW, 20 * MCQW);
  context.strokeStyle = '#fff';
  context.lineWidth = 0.8 * MCQW;
  context.strokeRect(10 * MCQW, 96 * MCQW, 17 * MCQW, 20 * MCQW);
  barcode(context, design.barcode, 58, 99);
  gloss(context, MW, MH);
  return node;
};

export const autobiographySpine = (design: CoverDesign): HTMLCanvasElement => {
  const [node, context] = mockupCanvas(SPINE_W, MH);
  context.fillStyle = PAPER;
  context.fillRect(0, 0, SPINE_W, MH);
  context.save();
  context.translate(SPINE_W / 2, 36);
  context.rotate(Math.PI / 2);
  context.textBaseline = 'middle';
  context.fillStyle = '#1d1d1b';
  context.font = `700 46px ${PLAYFAIR}`;
  fitText(context, (design.author[1] ?? design.author[0]).toUpperCase(), 0, 0, 380);
  context.font = `italic 30px ${PLAYFAIR}`;
  context.fillStyle = AUTOBIOGRAPHY_RED;
  fitText(context, titleLine(design), 410, 2, 250);
  context.restore();
  publisherMark(context, SPINE_W / 2 / MCQW - 3, (MH - 70) / MCQW, '#1d1d1b');
  gloss(context, SPINE_W, MH);
  return node;
};

/** Les gardes : un papier rouge, un peu grenu. */
export const autobiographyInside = (details: CoverDetails): HTMLCanvasElement => {
  const [node, context] = mockupCanvas(MW, MH);
  context.fillStyle = AUTOBIOGRAPHY_RED;
  context.fillRect(0, 0, MW, MH);
  filmGrain(context, 0, 0, MW, MH, details.seed + 71, 0.6);
  return node;
};
