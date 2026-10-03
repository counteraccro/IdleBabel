import * as THREE from 'three';
import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board } from '../draw';
import { rng } from '../arabianNights/arabianNightsOrnaments';
import { CANON } from './encyclopediaFonts';
import { cornerTool, spineFlower } from './encyclopediaOrnaments';
import type { Drawing } from '../slowDrawing';

/**
 * La reliure des souscripteurs de 1751, piste A de .ai/maquette-encyclopedie.html (validée) : un veau marbré
 * brun (moucheté à l'acide), un triple filet doré et des fers d'angle sur le plat, une étiquette de titre en
 * maroquin rouge et une pièce verte pour le tome ; au dos, cinq nerfs, un fleuron et quatre fers par caisson,
 * la pièce de titre rouge et la tomaison verte. Dessinée dans les unités de la maquette (plat 640 × 800, dos
 * 110 × 800) mises à l'échelle, avec le même hasard : mêmes mouchetures, même grain.
 */
export const CALF = ['#8a5a32', '#45260f'] as const;
const RED = ['#9a2a1e', '#5c140c'] as const;
const GREEN = ['#3c5a32', '#1c2e17'] as const;
const SHINE = '255,200,170';
const [W, H] = [640, 800];
/** Les plats sont dessinés à l'échelle de la maquette (640 de large). */
const K = WIDTH / W;

/** Du texte posé par sa ligne de base, centré, comme sur la maquette. */
const print = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string | CanvasGradient,
  spacing = 0,
): void => {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${spacing}px`;
  context.fillText(text, x, y);
  context.letterSpacing = '0px';
};

/** La taille `size` de Canon, plus petite si `text` dépasse `room` de large (un mot plus long dans une langue). */
const fitted = (context: CanvasRenderingContext2D, text: string, size: number, spacing: number, room: number): string => {
  context.font = `${size}px ${CANON}`;
  const width = context.measureText(text).width + spacing * text.length;
  return `${width > room ? (size * room) / width : size}px ${CANON}`;
};

/** Du texte poussé à l'or : un creux sombre décalé, puis l'or. */
const gilt = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  gold: CanvasGradient,
  spacing = 0,
): void => {
  print(context, text, x + 1, y + 1.5, font, 'rgba(0,0,0,0.45)', spacing);
  print(context, text, x, y, font, gold, spacing);
};

/** L'or, en biais sur toute la pièce (comme sur la maquette). */
const goldOver = (context: CanvasRenderingContext2D, width: number, height: number): CanvasGradient => {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#8a6a2c');
  gradient.addColorStop(0.35, '#f2d68e');
  gradient.addColorStop(0.55, '#c9a24f');
  gradient.addColorStop(0.8, '#f2d68e');
  gradient.addColorStop(1, '#8a6a2c');
  return gradient;
};

/** Un dessin poussé à l'or : l'empreinte (ombre), l'or, un reflet sur les traits. */
const tooled = (context: CanvasRenderingContext2D, draw: (context: CanvasRenderingContext2D) => void, gold: CanvasGradient): void => {
  context.save();
  context.translate(0.9, 1.2);
  context.strokeStyle = context.fillStyle = 'rgba(0,0,0,0.5)';
  draw(context);
  context.restore();
  context.save();
  context.strokeStyle = context.fillStyle = gold;
  draw(context);
  context.restore();
  context.save();
  context.translate(-0.5, -0.6);
  context.globalAlpha = 0.22;
  context.strokeStyle = '#fff3cf';
  context.fillStyle = 'rgba(0,0,0,0)';
  draw(context);
  context.restore();
};

/** Mouchetures dessinées d'un morceau (moins d'une milliseconde). */
const SPECKS_PER_STEP = 1500;

/**
 * Le veau marbré : un veau brun, des nuages doux (l'acide qui a coulé), une pluie de fines mouchetures plus
 * serrées dans les nuages, le grain, un vernis, des bords frottés. `resolution` : pixels de la pièce par unité
 * de la maquette (les nuages sont peints à part, à cette finesse, puis floutés).
 */
function* mottledCalf(context: CanvasRenderingContext2D, width: number, height: number, seed: number, resolution: number): Generator<void> {
  const shade = context.createRadialGradient(
    width / 2,
    height * 0.45,
    Math.min(width, height) * 0.1,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75,
  );
  shade.addColorStop(0, CALF[0]);
  shade.addColorStop(1, CALF[1]);
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);
  const off = document.createElement('canvas');
  off.width = Math.ceil(width * resolution);
  off.height = Math.ceil(height * resolution);
  const acid = off.getContext('2d')!;
  acid.scale(resolution, resolution);
  const random = rng(seed);
  const clouds: [number, number, number][] = [];
  for (let cloud = 0; cloud < (width * height) / 6000; cloud++) {
    const [cx, cy, radius] = [random() * width, random() * height, 20 + random() * 50];
    clouds.push([cx, cy, radius]);
    const stain = acid.createRadialGradient(cx, cy, 0, cx, cy, radius);
    stain.addColorStop(0, `rgba(30,13,4,${0.25 + random() * 0.25})`);
    stain.addColorStop(1, 'rgba(30,13,4,0)');
    acid.fillStyle = stain;
    acid.fillRect(cx - radius, cy - radius, 2 * radius, 2 * radius);
  }
  context.save();
  context.filter = `blur(${6 * resolution}px)`;
  context.drawImage(off, 0, 0, width, height);
  context.restore();
  yield;
  for (let speck = 0; speck < (width * height) / 14; speck++) {
    const [x, y] = [random() * width, random() * height];
    const dense = clouds.some(([cx, cy, radius]) => (x - cx) ** 2 + (y - cy) ** 2 < radius * radius);
    if (speck % SPECKS_PER_STEP === SPECKS_PER_STEP - 1) yield;
    if (!dense && random() < 0.6) continue;
    context.fillStyle = `rgba(25,10,3,${0.2 + random() * 0.4})`;
    context.beginPath();
    context.arc(x, y, 0.4 + random() * (dense ? 1.3 : 0.8), 0, Math.PI * 2);
    context.fill();
  }
  for (let grain = 0; grain < (width * height) / 30; grain++) {
    context.fillStyle = `rgba(30,12,4,${random() * 0.12})`;
    context.fillRect(random() * width, random() * height, 1.4, 1.4);
    if (grain % SPECKS_PER_STEP === SPECKS_PER_STEP - 1) yield;
  }
  const varnish = context.createLinearGradient(0, 0, width, height);
  varnish.addColorStop(0, 'rgba(255,230,190,0.10)');
  varnish.addColorStop(0.5, 'rgba(255,230,190,0)');
  varnish.addColorStop(1, 'rgba(0,0,0,0.14)');
  context.fillStyle = varnish;
  context.fillRect(0, 0, width, height);
  // Les bords frottés, plus clairs.
  for (const [x0, y0, x1, y1] of [
    [0, 0, 0, 14],
    [0, height, 0, height - 14],
    [width, 0, width - 12, 0],
  ]) {
    const rubbed = context.createLinearGradient(x0, y0, x1, y1);
    rubbed.addColorStop(0, 'rgba(220,170,120,0.22)');
    rubbed.addColorStop(1, 'rgba(220,170,120,0)');
    context.fillStyle = rubbed;
    if (x0 === x1) context.fillRect(0, Math.min(y0, y1), width, 14);
    else context.fillRect(width - 12, 0, 12, height);
  }
}

/** Le maroquin d'une pièce de titre : dégradé, grain fin en petits cailloux (ombre et reflet), bords frottés. */
const morocco = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  [light, dark]: readonly string[],
  seed: number,
): void => {
  const shade = context.createRadialGradient(
    width / 2,
    height * 0.45,
    Math.min(width, height) * 0.1,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75,
  );
  shade.addColorStop(0, light);
  shade.addColorStop(1, dark);
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);
  const random = rng(seed * 4241);
  for (let grain = 0; grain < (width * height) / 16; grain++) {
    const [x, y] = [random() * width, random() * height];
    const [rx, ry, angle] = [0.8 + random() * 1.6, 0.6 + random() * 1.1, random() * Math.PI];
    context.fillStyle = `rgba(0,0,0,${0.08 + random() * 0.12})`;
    context.beginPath();
    context.ellipse(x + 0.6, y + 0.6, rx, ry, angle, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = `rgba(${SHINE},${random() * 0.05})`;
    context.beginPath();
    context.ellipse(x - 0.4, y - 0.4, rx * 0.7, ry * 0.7, angle, 0, Math.PI * 2);
    context.fill();
  }
  const rubbed = (x0: number, y0: number, x1: number, y1: number): CanvasGradient => {
    const gradient = context.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, `rgba(${SHINE},0.18)`);
    gradient.addColorStop(1, `rgba(${SHINE},0)`);
    return gradient;
  };
  context.fillStyle = rubbed(0, 0, 0, 16);
  context.fillRect(0, 0, width, 16);
  context.fillStyle = rubbed(0, height, 0, height - 16);
  context.fillRect(0, height - 16, width, 16);
  context.fillStyle = rubbed(width, 0, width - 12, 0);
  context.fillRect(width - 12, 0, 12, height);
};

/** Une pièce de titre en maroquin, collée (une ombre dessous), un filet doré sur le bord. */
const label = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  colors: readonly string[],
  gold: CanvasGradient,
  seed: number,
): void => {
  context.save();
  context.fillStyle = 'rgba(0,0,0,0.45)';
  context.fillRect(x + 1.5, y + 2, width, height);
  context.beginPath();
  context.rect(x, y, width, height);
  context.clip();
  context.translate(x, y);
  morocco(context, width, height, colors, seed);
  context.restore();
  tooled(
    context,
    (tool) => {
      tool.lineWidth = 1;
      tool.strokeRect(x + 4, y + 4, width - 8, height - 8);
    },
    gold,
  );
};

/** L'encadrement des plats : le triple filet, un fer dans chaque angle. */
const frames = (tool: CanvasRenderingContext2D): void => {
  tool.lineWidth = 1.3;
  tool.strokeRect(24, 24, W - 48, H - 48);
  tool.lineWidth = 0.8;
  tool.strokeRect(30, 30, W - 60, H - 60);
  tool.strokeRect(35, 35, W - 70, H - 70);
  for (const [x, y, sx, sy] of [
    [35, 35, 1, 1],
    [W - 35, 35, -1, 1],
    [35, H - 35, 1, -1],
    [W - 35, H - 35, -1, -1],
  ])
    cornerTool(tool, x + sx * 5, y + sy * 5, sx, sy, 1.2);
};

/** Une pièce de la reliure : `draw` y dessine par morceaux (yield : une pause possible). */
function* piece(draw: (context: CanvasRenderingContext2D) => Generator<void>): Drawing {
  const canvas = board(CALF[0], CALF[1]).image as HTMLCanvasElement;
  yield* draw(canvas.getContext('2d')!);
  return canvas;
}

/** Le plat : le veau marbré, le triple filet, l'étiquette rouge du titre et la pièce verte du tome, deux fleurons. */
export const encyclopediaFront = (): Drawing =>
  piece(function* (context) {
    context.save();
    context.scale(K, K);
    yield* mottledCalf(context, W, H, 31, K);
    const gold = goldOver(context, W, H);
    tooled(context, frames, gold);
    const { title, volume } = messages().rareBooks.encyclopedia.front;
    label(context, W / 2 - 170, 318, 340, 108, RED, gold, 5);
    gilt(context, title, W / 2, 384, fitted(context, title, 30, 4, 300), gold, 4);
    label(context, W / 2 - 70, 440, 140, 40, GREEN, gold, 7);
    gilt(context, volume, W / 2, 467, `15px ${CANON}`, gold, 3);
    tooled(
      context,
      (tool) => {
        spineFlower(tool, W / 2, 268, 1.3);
        spineFlower(tool, W / 2, 540, 1.3);
      },
      gold,
    );
    context.restore();
  });

/**
 * Le plat arrière (pas sur la maquette) : le même veau, d'autres mouchetures, le même triple filet et un
 * fleuron au centre. Vu retourné : sa tranche est à gauche.
 */
export const encyclopediaBack = (): Drawing =>
  piece(function* (context) {
    context.save();
    context.translate(WIDTH, 0);
    context.scale(-K, K);
    yield* mottledCalf(context, W, H, 32, K);
    context.restore();
    context.save();
    context.scale(K, K);
    const gold = goldOver(context, W, H);
    tooled(
      context,
      (tool) => {
        frames(tool);
        spineFlower(tool, W / 2, H / 2, 1.3);
      },
      gold,
    );
    context.restore();
  });

/** Le dos à cinq nerfs : les filets, un fleuron et quatre fers par caisson, la pièce de titre rouge, la tomaison verte. */
export const encyclopediaSpine = (thickness: number): Drawing =>
  piece(function* (context) {
    // Dessiné sans déformation, à l'échelle de la maquette : `width` est la largeur visible du dos.
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const scale = HEIGHT / H;
    const width = WIDTH / stretch / scale;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch * scale, scale);
    context.translate(-width / 2, 0);
    yield* mottledCalf(context, width, H, 43, scale);
    // L'arrondi du dos : plus sombre sur les bords.
    const round = context.createLinearGradient(0, 0, width, 0);
    round.addColorStop(0, 'rgba(0,0,0,0.45)');
    round.addColorStop(0.3, 'rgba(0,0,0,0)');
    round.addColorStop(0.7, 'rgba(0,0,0,0)');
    round.addColorStop(1, 'rgba(0,0,0,0.45)');
    context.fillStyle = round;
    context.fillRect(0, 0, width, H);
    const gold = goldOver(context, width, 0);
    const bands = [120, 245, 370, 495, 620];
    // Les nerfs : un bourrelet (ombre dessous, reflet dessus).
    for (const y of bands) {
      const ridge = context.createLinearGradient(0, y - 7, 0, y + 7);
      ridge.addColorStop(0, 'rgba(0,0,0,0.35)');
      ridge.addColorStop(0.35, 'rgba(255,220,190,0.14)');
      ridge.addColorStop(0.65, 'rgba(0,0,0,0.05)');
      ridge.addColorStop(1, 'rgba(0,0,0,0.45)');
      context.fillStyle = ridge;
      context.fillRect(0, y - 7, width, 14);
    }
    tooled(
      context,
      (tool) => {
        tool.lineWidth = 0.8;
        for (const y of [36, ...bands, 720]) {
          tool.beginPath();
          tool.moveTo(6, y - 10);
          tool.lineTo(width - 6, y - 10);
          tool.moveTo(6, y + 10);
          tool.lineTo(width - 6, y + 10);
          tool.stroke();
        }
        // Les caissons sans pièce : un fleuron au centre, un fer dans chaque coin.
        for (const [y0, y1] of [
          [36, 120],
          [370, 495],
          [495, 620],
          [620, 720],
        ]) {
          spineFlower(tool, width / 2, (y0 + y1) / 2, 1.1);
          for (const [x, y, sx, sy] of [
            [14, y0 + 16, 1, 1],
            [width - 14, y0 + 16, -1, 1],
            [14, y1 - 16, 1, -1],
            [width - 14, y1 - 16, -1, -1],
          ])
            cornerTool(tool, x, y, sx, sy, 0.7);
        }
      },
      gold,
    );
    const { title, volume } = messages().rareBooks.encyclopedia.spine as { title: string[]; volume: string[] };
    label(context, 6, 134, width - 12, 98, RED, gold, 9);
    gilt(context, title[0], width / 2, 178, fitted(context, title[0], 17, 1, width - 22), gold, 1);
    gilt(context, title[1], width / 2, 202, fitted(context, title[1], 14, 0.5, width - 22), gold, 0.5);
    label(context, 10, 262, width - 20, 92, GREEN, gold, 11);
    gilt(context, volume[0], width / 2, 300, `14px ${CANON}`, gold, 1);
    gilt(context, volume[1], width / 2, 326, `18px ${CANON}`, gold, 1);
    context.restore();
  });

/** Les tranches mouchetées de rouge, comme celles des exemplaires du temps. */
export const sprinkledEdge = (paper: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  context.fillStyle = paper;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = 'rgba(120, 90, 50, 0.35)';
  for (let y = 0; y < canvas.height; y += 3) context.fillRect(0, y, canvas.width, 0.8);
  const random = rng(17);
  for (let speck = 0; speck < 1400; speck++) {
    context.fillStyle = `rgba(165, 40, 28, ${0.45 + random() * 0.45})`;
    context.beginPath();
    context.arc(random() * canvas.width, random() * canvas.height, 0.5 + random() * 1.2, 0, Math.PI * 2);
    context.fill();
  }
  // Contre les plats, le papier fonce (lumière, doigts).
  const shade = context.createLinearGradient(0, 0, 0, canvas.height);
  shade.addColorStop(0, 'rgba(60, 40, 10, 0.35)');
  shade.addColorStop(0.15, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(0.85, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(40, 25, 5, 0.45)');
  context.fillStyle = shade;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};
