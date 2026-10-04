import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board, plainBoard } from '../draw';
import { GARA, gold, leather, rng, text, vignette, type Context } from './sandDraw';
import type * as THREE from 'three';

/**
 * La couverture du Livre de sable (maquette .ai/maquette-sable.html, piste B « La dune ») : un désert peint
 * au soir, des dunes sans fin, le titre doré dans le ciel, et le mot « sable » qui s'en va en grains, emporté
 * par le vent. Au dos, un sablier. On dessine dans les mesures de la maquette (plats 640 × 800, dos
 * 130 × 800), mises à l'échelle des textures.
 */

const [W, H, SPINE_W] = [640, 800, 130];
/** Mise à l'échelle de la maquette vers les textures. */
const K = WIDTH / W;
/** Le dos de la maquette à ses vraies proportions (le dos d'un livre fait 1,4 fois son épaisseur). */
export const THICKNESS = SPINE_W / H / 1.4;
/** Le cuir du dos, pour les bords des plats et l'intérieur. */
export const LEATHER = '#7a4a2a';
const SPINE_TONE: [string, string] = [LEATHER, '#4a2a16'];
/**
 * Où le second mot commence à s'en aller, en part de sa largeur depuis sa gauche, et où il a fini (au-delà
 * de sa droite, en px de maquette) : « de sable » s'efface depuis le « s » jusqu'après le « e ».
 */
const EROSION = { from: 0.2025, past: 22.5 };

const titleLines = (): string[] => messages().rareBooks.sand.coverTitle;
/** Le milieu du titre du dos : entre le filet du haut (48) et le haut du sablier (H - 150 - 42). */
const SPINE_TITLE_CENTER = (48 + H - 192) / 2;

/** Une dune : sa crête, les rides du vent, le grain. */
const dune = (context: Context, base: number, amp: number, phase: number, freq: number, colors: [string, string], seed: number): void => {
  const random = rng(seed);
  const path = new Path2D();
  path.moveTo(0, H);
  const ys: number[] = [];
  for (let x = 0; x <= W; x += 4) {
    const y = base - amp * Math.sin(x * freq + phase) - amp * 0.35 * Math.sin(x * freq * 2.3 + phase * 1.7);
    ys.push(y);
    path.lineTo(x, y);
  }
  path.lineTo(W, H);
  path.closePath();
  const top = Math.min(...ys);
  const g = context.createLinearGradient(0, top, 0, H);
  g.addColorStop(0, colors[0]);
  g.addColorStop(1, colors[1]);
  context.fillStyle = g;
  context.fill(path);
  context.save();
  context.clip(path);
  // La crête, éclairée par le soleil couchant.
  context.strokeStyle = 'rgba(255,225,170,0.35)';
  context.lineWidth = 2;
  context.beginPath();
  ys.forEach((y, i) => (i ? context.lineTo(i * 4, y + 1) : context.moveTo(0, y + 1)));
  context.stroke();
  // Les rides du vent.
  context.strokeStyle = 'rgba(80,45,25,0.12)';
  context.lineWidth = 1;
  for (let k = 1; k < 9; k++) {
    context.beginPath();
    ys.forEach((y, i) => {
      const yy = y + k * 11 + 3 * Math.sin(i * 0.4 + k);
      if (i) context.lineTo(i * 4, yy);
      else context.moveTo(0, yy);
    });
    context.stroke();
  }
  for (let i = 0; i < 2500; i++) {
    context.fillStyle = random() < 0.5 ? 'rgba(255,230,190,0.06)' : 'rgba(60,30,15,0.08)';
    context.fillRect(random() * W, top + random() * (H - top), 1.5, 1.5);
  }
  context.restore();
};

/** Le ciel du soir, le soleil bas, les premières étoiles, les dunes, le cadre doré. */
const desert = (context: Context): void => {
  const sky = context.createLinearGradient(0, 0, 0, H * 0.7);
  sky.addColorStop(0, '#2a1d33');
  sky.addColorStop(0.45, '#6b3a40');
  sky.addColorStop(0.8, '#d0814a');
  sky.addColorStop(1, '#eab06a');
  context.fillStyle = sky;
  context.fillRect(0, 0, W, H);
  const sun = context.createRadialGradient(470, 480, 4, 470, 480, 120);
  sun.addColorStop(0, 'rgba(255,236,190,0.95)');
  sun.addColorStop(0.25, 'rgba(255,200,130,0.6)');
  sun.addColorStop(1, 'rgba(255,170,90,0)');
  context.fillStyle = sun;
  context.fillRect(0, 300, W, 300);
  const stars = rng(5);
  for (let i = 0; i < 60; i++) {
    context.fillStyle = `rgba(255,240,210,${0.2 + stars() * 0.5})`;
    context.fillRect(stars() * W, stars() * 170, 1.5, 1.5);
  }
  dune(context, 520, 22, 0.8, 0.012, ['#b9774a', '#8a4f30'], 51);
  dune(context, 580, 30, 2.4, 0.009, ['#c98a52', '#7d4628'], 52);
  dune(context, 650, 38, 4.1, 0.007, ['#d99c5e', '#8c522c'], 53);
  dune(context, 740, 44, 1.2, 0.0055, ['#e3a866', '#9a5c30'], 54);
  context.strokeStyle = gold(context, 0, H);
  context.lineWidth = 3;
  context.strokeRect(26, 26, W - 52, H - 52);
  context.lineWidth = 1;
  context.strokeRect(36, 36, W - 72, H - 72);
};

/**
 * Le second mot du titre, qui s'en va en grains vers la droite : on l'écrit à part, on lui retire des points
 * d'or (de plus en plus vers la droite), et on les repose plus loin, emportés, de plus en plus épars. Sur la
 * texture même (plus fine que la maquette), au même dessin.
 */
const blownWord = (context: Context, word: string): void => {
  const font = `italic 500 64px ${GARA}`;
  const off = document.createElement('canvas');
  off.width = WIDTH;
  off.height = HEIGHT;
  const o = off.getContext('2d')!;
  o.scale(K, K);
  text(o, word, W / 2, 250, font, gold(o, 196, 256), 'center', 2);
  o.font = font;
  o.letterSpacing = '2px';
  const wordWidth = o.measureText(word).width;
  const left = W / 2 - wordWidth / 2;
  const [x0, x1] = [left + wordWidth * EROSION.from, left + wordWidth + EROSION.past];
  const image = o.getImageData(0, 0, WIDTH, HEIGHT);
  const random = rng(55);
  const moved: [number, number, number, number, number][] = [];
  for (let y = Math.floor(180 * K); y < 270 * K; y++) {
    for (let x = Math.floor((x0 - 40) * K); x < WIDTH; x++) {
      const k = (y * WIDTH + x) * 4;
      if (image.data[k + 3] < 40) continue;
      const p = Math.min(1, Math.max(0, (x / K - x0) / (x1 - x0))) ** 1.6;
      if (random() < p) {
        moved.push([x / K, y / K, image.data[k], image.data[k + 1], image.data[k + 2]]);
        image.data[k + 3] = 0;
      }
    }
  }
  o.putImageData(image, 0, 0);
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.drawImage(off, 0, 0);
  context.restore();
  // Autant de grains que dans la maquette : la texture a K² fois plus de points d'or.
  const kept = 0.7 / (K * K);
  for (const [x, y, r, g, b] of moved) {
    if (random() > kept) continue;
    const t = random() ** 1.2;
    const [nx, ny] = [x + 10 + t * 250, y + t * t * 140 + (random() - 0.5) * 40 * t];
    if (nx > W - 40) continue;
    const size = 1.4 + random() * 1.4;
    context.globalAlpha = 1 - t * 0.7;
    context.fillStyle = `rgb(${r},${g},${b})`;
    context.fillRect(nx, ny, size, size);
  }
  context.globalAlpha = 1;
};

const front = (context: Context): void => {
  const [top, bottom] = titleLines();
  desert(context);
  text(context, top, W / 2, 168, `600 50px ${GARA}`, gold(context, 128, 172), 'center', 9);
  blownWord(context, bottom);
  vignette(context, W, H, 0.35);
};

const plate = (draw: (context: Context) => void): THREE.CanvasTexture =>
  board(LEATHER, SPINE_TONE[1], (context) => {
    context.scale(K, K);
    draw(context);
  });

export const sandFront = (): THREE.CanvasTexture => plate(front);

/** Le plat arrière (absent de la maquette) : le même désert, sans titre ; le vent a emporté le reste. */
export const sandBack = (): THREE.CanvasTexture =>
  plate((context) => {
    desert(context);
    vignette(context, W, H, 0.35);
  });

/** Le sablier du dos, en or. */
const hourglass = (context: Context, cx: number, cy: number): void => {
  const [hw, hh] = [22, 42];
  context.strokeStyle = gold(context, cy - hh, cy + hh);
  context.lineWidth = 2.5;
  context.beginPath();
  context.moveTo(cx - hw - 6, cy - hh);
  context.lineTo(cx + hw + 6, cy - hh);
  context.moveTo(cx - hw - 6, cy + hh);
  context.lineTo(cx + hw + 6, cy + hh);
  context.stroke();
  context.lineWidth = 1.6;
  context.beginPath();
  context.moveTo(cx - hw, cy - hh);
  context.quadraticCurveTo(cx - hw, cy - 8, cx - 2, cy);
  context.quadraticCurveTo(cx - hw, cy + 8, cx - hw, cy + hh);
  context.moveTo(cx + hw, cy - hh);
  context.quadraticCurveTo(cx + hw, cy - 8, cx + 2, cy);
  context.quadraticCurveTo(cx + hw, cy + 8, cx + hw, cy + hh);
  context.stroke();
  context.fillStyle = gold(context, cy, cy + hh);
  context.beginPath();
  context.moveTo(cx - hw + 2, cy + hh - 1);
  context.quadraticCurveTo(cx, cy + 14, cx + hw - 2, cy + hh - 1);
  context.closePath();
  context.fill();
  context.fillRect(cx - 0.6, cy, 1.2, hh - 14);
};

/**
 * Le titre du dos, de haut en bas : les deux mots à la suite, centrés entre le filet du haut et le sablier, et
 * au milieu de la largeur du dos (la maquette posait la ligne de base au milieu : les lettres débordaient à droite).
 */
const spineTitle = (context: Context, top: string, bottom: string): void => {
  const [topFont, bottomFont, gap] = [`600 30px ${GARA}`, `italic 500 32px ${GARA}`, 26];
  const measure = (value: string, font: string, spacing: number): number => {
    context.font = font;
    context.letterSpacing = `${spacing}px`;
    return context.measureText(value).width;
  };
  const [w1, w2] = [measure(top, topFont, 4), measure(bottom, bottomFont, 1)];
  context.letterSpacing = '0px';
  const start = SPINE_TITLE_CENTER - (w1 + gap + w2) / 2;
  context.save();
  // Lettres couchées : leur hauteur s'étend vers la droite de la ligne de base ; ~20 px de capitales.
  context.translate(SPINE_W / 2 - 10, 0);
  context.rotate(Math.PI / 2);
  text(context, top, start + w1 / 2, 0, topFont, gold(context, -24, 4), 'center', 4);
  text(context, bottom, start + w1 + gap + w2 / 2, 0, bottomFont, gold(context, -24, 4), 'center', 1);
  context.restore();
};

/** Le dos : cuir fauve, filets dorés, le titre de haut en bas, le sablier. */
export const sandSpine = (): THREE.CanvasTexture =>
  board(LEATHER, SPINE_TONE[1], (context) => {
    context.scale(WIDTH / SPINE_W, HEIGHT / H);
    const [top, bottom] = titleLines();
    leather(context, 0, 0, SPINE_W, H, 61, SPINE_TONE);
    for (const y of [40, 48, H - 48, H - 40]) {
      context.fillStyle = gold(context, y, y + 2);
      context.fillRect(12, y, SPINE_W - 24, 2);
    }
    spineTitle(context, top, bottom);
    hourglass(context, SPINE_W / 2, H - 150);
    const rub = context.createLinearGradient(0, 0, SPINE_W, 0);
    rub.addColorStop(0, 'rgba(0,0,0,0.4)');
    rub.addColorStop(0.5, 'rgba(230,190,140,0.08)');
    rub.addColorStop(1, 'rgba(0,0,0,0.4)');
    context.fillStyle = rub;
    context.fillRect(0, 0, SPINE_W, H);
  });

/** Les contre-plats : le cuir nu. */
export const sandInside = (): THREE.CanvasTexture => plainBoard(LEATHER, SPINE_TONE[1]);
