import '@fontsource-variable/bodoni-moda/opsz.css';
import '@fontsource-variable/bodoni-moda/opsz-italic.css';
import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board } from '../draw';
import { rng } from '../arabianNights/arabianNightsOrnaments';
import { meander, palmette, rosette } from './saragossaOrnaments';
import type { Drawing } from '../slowDrawing';

/**
 * La reliure de l'originale de 1814, piste A de .ai/maquette-saragosse.html (validée) : un veau raciné du
 * temps (le cuir marbré à l'acide en branches d'arbre), une roulette à la grecque dorée, des rosaces aux
 * angles, une étiquette de titre en maroquin rouge au centre du plat ; au dos lisse, des roulettes de
 * palmettes et la pièce de titre rouge. Dessinée dans les unités de la maquette (plat 640 × 800, dos
 * 110 × 800) mises à l'échelle, avec le même hasard : mêmes branches, même grain.
 */
export const CALF = ['#a8743f', '#5a3417'] as const;
const RED = ['#9a2a1e', '#5c140c'] as const;
export const DIDOT = "'Bodoni Moda Variable', 'Didot', Georgia, serif";
/** Le reflet du maroquin rouge de l'étiquette. */
const SHINE = '255,200,170';
const [W, H] = [640, 800];
/** Les plats sont dessinés à l'échelle de la maquette (640 de large). */
const K = WIDTH / W;

export const loadSaragossaFonts = (): Promise<unknown> =>
  Promise.all([`17px ${DIDOT}`, `italic 17px ${DIDOT}`, `500 20px ${DIDOT}`, `700 20px ${DIDOT}`].map((font) => document.fonts.load(font)));

/** Du texte posé par sa ligne de base, centré (rapetissé s'il dépasse `fit`). */
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

/** La police `weight size family`, plus petite si `text` dépasse `room` de large (un titre plus long en anglais). */
const fitted = (context: CanvasRenderingContext2D, text: string, weight: number, size: number, spacing: number, room: number): string => {
  context.font = `${weight} ${size}px ${DIDOT}`;
  const width = context.measureText(text).width + spacing * text.length;
  return `${weight} ${width > room ? (size * room) / width : size}px ${DIDOT}`;
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

/** Taches et grains dessinés d'un morceau (moins d'une milliseconde). */
const SPECKS_PER_STEP = 1500;

/**
 * Le veau raciné : un veau fauve, et à l'acide un arbre dont le tronc suit le milieu (`axis`), ses branches
 * floues et plus sombres ; puis le grain, des taches d'acide, un vernis. `resolution` : pixels de la pièce par
 * unité de la maquette (les branches sont tracées à part, à cette finesse, puis floutées).
 */
function* treeCalf(context: CanvasRenderingContext2D, width: number, height: number, seed: number, resolution: number): Generator<void> {
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
  const axis = width / 2;
  acid.lineCap = 'round';
  acid.strokeStyle = 'rgba(40,16,4,0.55)';
  const branch = (x: number, y: number, angle: number, length: number, thickness: number, depth: number): void => {
    if (depth === 0 || length < 6) return;
    const [x1, y1] = [x + Math.cos(angle) * length, y + Math.sin(angle) * length];
    acid.lineWidth = thickness;
    acid.beginPath();
    acid.moveTo(x, y);
    const cx = (x + x1) / 2 + (random() - 0.5) * length * 0.3;
    const cy = (y + y1) / 2 + (random() - 0.5) * length * 0.3;
    acid.quadraticCurveTo(cx, cy, x1, y1);
    acid.stroke();
    const twigs = 2 + (random() < 0.3 ? 1 : 0);
    for (let twig = 0; twig < twigs; twig++) {
      const turn = angle + (random() - 0.5) * 1.1;
      branch(x1, y1, turn, length * (0.6 + random() * 0.25), thickness * 0.7, depth - 1);
    }
  };
  // Le tronc, du bas vers le haut, et des branches de chaque côté tout du long.
  for (let y = height; y > -20; y -= 44 + random() * 30) {
    const x = axis + (random() - 0.5) * 10;
    for (const side of [-1, 1]) {
      const angle = -Math.PI / 2 + side * (0.9 + random() * 0.5);
      branch(x, y, angle, ((70 + random() * 60) * width) / 640 + 20, 7, 5);
    }
    yield;
  }
  acid.lineWidth = 7;
  acid.beginPath();
  acid.moveTo(axis, height);
  for (let y = height; y > 0; y -= 40) acid.lineTo(axis + (random() - 0.5) * 12, y);
  acid.stroke();
  context.save();
  context.filter = `blur(${4 * resolution}px)`;
  context.drawImage(off, 0, 0, width, height);
  context.filter = `blur(${1.2 * resolution}px)`;
  context.globalAlpha = 0.35;
  context.drawImage(off, 0, 0, width, height);
  context.restore();
  yield;
  // Le grain du veau et des taches d'acide plus foncées.
  for (let speck = 0; speck < (width * height) / 30; speck++) {
    context.fillStyle = `rgba(30,12,4,${random() * 0.12})`;
    context.fillRect(random() * width, random() * height, 1.4, 1.4);
    if (speck % SPECKS_PER_STEP === SPECKS_PER_STEP - 1) yield;
  }
  for (let stain = 0; stain < (width * height) / 2600; stain++) {
    context.fillStyle = `rgba(30,12,4,${0.1 + random() * 0.2})`;
    context.beginPath();
    context.arc(random() * width, random() * height, 1 + random() * 2.5, 0, Math.PI * 2);
    context.fill();
  }
  // Un vernis : un reflet large.
  const varnish = context.createLinearGradient(0, 0, width, height);
  varnish.addColorStop(0, 'rgba(255,230,190,0.10)');
  varnish.addColorStop(0.5, 'rgba(255,230,190,0)');
  varnish.addColorStop(1, 'rgba(0,0,0,0.12)');
  context.fillStyle = varnish;
  context.fillRect(0, 0, width, height);
}

/** Le maroquin rouge de l'étiquette : dégradé, grain fin en petits cailloux (ombre et reflet), bords frottés. */
const morocco = (context: CanvasRenderingContext2D, width: number, height: number, seed: number): void => {
  const shade = context.createRadialGradient(
    width / 2,
    height * 0.45,
    Math.min(width, height) * 0.1,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75,
  );
  shade.addColorStop(0, RED[0]);
  shade.addColorStop(1, RED[1]);
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

/** Une pièce de titre en maroquin rouge, collée (une ombre dessous), un filet doré sur le bord. */
const label = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
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
  morocco(context, width, height, seed);
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

/** L'encadrement des plats : un filet, la grecque sur les quatre côtés, un filet dedans, une rosace à chaque angle. */
const frames = (tool: CanvasRenderingContext2D): void => {
  tool.lineWidth = 1.2;
  tool.strokeRect(22, 22, W - 44, H - 44);
  tool.lineWidth = 1.4;
  meander(tool, 58, W - 58, 30, 16);
  meander(tool, 58, W - 58, H - 46, 16);
  tool.save();
  tool.translate(W / 2, H / 2);
  tool.rotate(Math.PI / 2);
  meander(tool, -H / 2 + 58, H / 2 - 58, -W / 2 + 30, 16);
  meander(tool, -H / 2 + 58, H / 2 - 58, W / 2 - 46, 16);
  tool.restore();
  tool.lineWidth = 1;
  tool.strokeRect(52, 52, W - 104, H - 104);
  for (const [x, y] of [
    [38, 38],
    [W - 38, 38],
    [38, H - 38],
    [W - 38, H - 38],
  ])
    rosette(tool, x, y, 11);
};

/** Une pièce de la reliure : `draw` y dessine par morceaux (yield : une pause possible). */
function* piece(draw: (context: CanvasRenderingContext2D) => Generator<void>): Drawing {
  const canvas = board(CALF[0], CALF[1]).image as HTMLCanvasElement;
  yield* draw(canvas.getContext('2d')!);
  return canvas;
}

/** Le plat : le veau raciné, la grecque, l'étiquette de titre entre deux palmettes. */
export const saragossaFront = (): Drawing =>
  piece(function* (context) {
    context.save();
    context.scale(K, K);
    yield* treeCalf(context, W, H, 31, K);
    const gold = goldOver(context, W, H);
    tooled(context, frames, gold);
    label(context, W / 2 - 175, 300, 350, 150, gold, 5);
    const { title, author } = messages().rareBooks.saragossa.front;
    for (const [row, text] of (title as string[]).entries())
      gilt(context, text, W / 2, 352 + row * 38, fitted(context, text, 500, 25, 2, 320), gold, 2);
    context.fillStyle = gold;
    context.fillRect(W / 2 - 30, 408, 60, 1);
    gilt(context, author, W / 2, 428, `400 13px ${DIDOT}`, gold, 4);
    tooled(
      context,
      (tool) => {
        palmette(tool, W / 2, 270, 1.4);
        tool.save();
        tool.translate(W / 2, 480);
        tool.rotate(Math.PI);
        palmette(tool, 0, 0, 1.4);
        tool.restore();
      },
      gold,
    );
    context.restore();
  });

/**
 * Le plat arrière (pas sur la maquette) : le même veau, son arbre retourné, le même encadrement, et au centre
 * une rosace entre quatre palmettes. Vu retourné : sa tranche est à gauche.
 */
export const saragossaBack = (): Drawing =>
  piece(function* (context) {
    context.save();
    context.translate(WIDTH, 0);
    context.scale(-K, K);
    yield* treeCalf(context, W, H, 32, K);
    context.restore();
    context.save();
    context.scale(K, K);
    const gold = goldOver(context, W, H);
    tooled(
      context,
      (tool) => {
        frames(tool);
        rosette(tool, W / 2, H / 2, 16);
        for (let side = 0; side < 4; side++) {
          tool.save();
          tool.translate(W / 2, H / 2);
          tool.rotate((side * Math.PI) / 2);
          palmette(tool, 0, -26, 1.1);
          tool.restore();
        }
      },
      gold,
    );
    context.restore();
  });

/** Le dos lisse : les roulettes de palmettes, les rosaces, les caissons, la pièce de titre rouge, l'auteur. */
export const saragossaSpine = (thickness: number): Drawing =>
  piece(function* (context) {
    // Dessiné sans déformation, à l'échelle de la maquette : `width` est la largeur visible du dos.
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const scale = HEIGHT / H;
    const width = WIDTH / stretch / scale;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch * scale, scale);
    context.translate(-width / 2, 0);
    yield* treeCalf(context, width, H, 43, scale);
    // L'arrondi du dos : plus sombre sur les bords.
    const round = context.createLinearGradient(0, 0, width, 0);
    round.addColorStop(0, 'rgba(0,0,0,0.45)');
    round.addColorStop(0.3, 'rgba(0,0,0,0)');
    round.addColorStop(0.7, 'rgba(0,0,0,0)');
    round.addColorStop(1, 'rgba(0,0,0,0.45)');
    context.fillStyle = round;
    context.fillRect(0, 0, width, H);
    const gold = goldOver(context, width, 0);
    const rolls = [40, 130, 330, 430, 640, 740];
    tooled(
      context,
      (tool) => {
        for (const y of rolls) {
          tool.lineWidth = 1;
          tool.beginPath();
          tool.moveTo(6, y - 8);
          tool.lineTo(width - 6, y - 8);
          tool.moveTo(6, y + 8);
          tool.lineTo(width - 6, y + 8);
          tool.stroke();
          for (let x = 14; x < width - 8; x += 14) palmette(tool, x, y + 5, 0.6);
        }
        rosette(tool, width / 2, 85, 12);
        rosette(tool, width / 2, 535, 14);
        rosette(tool, width / 2, 690, 10);
        tool.lineWidth = 1;
        for (const [y0, y1] of [
          [48, 122],
          [438, 632],
          [648, 732],
        ])
          tool.strokeRect(12, y0 + 6, width - 24, y1 - y0 - 12);
      },
      gold,
    );
    label(context, 8, 150, width - 16, 162, gold, 9);
    const words = messages().rareBooks.saragossa.spine as string[];
    for (const [row, word] of words.entries())
      gilt(context, word, width / 2, 192 + row * 30, fitted(context, word, 500, word.length > 6 ? 12 : 14, 1, width - 24), gold, 1);
    gilt(context, messages().rareBooks.saragossa.front.author, width / 2, 576, `400 10px ${DIDOT}`, gold, 2);
    context.restore();
  });
