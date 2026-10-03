import '@fontsource/eb-garamond/400-italic.css';
import { messages } from '../../../i18n';
import { HEIGHT, TITLE, WIDTH, board } from '../draw';
import { hexagon, write } from '../credits/creditsCover';
import type * as THREE from 'three';

/**
 * La couverture de « Idle Babel », l'autobiographie du jeu (maquette .ai/maquette-idle-babel.html, piste D,
 * « le plan doré ») : le maroquin brun-noir et les filets dorés des mémoires, et dessus, poussé au fer, le
 * plan coté d'une galerie de la Bibliothèque, comme un plan d'architecte ; le titre du jeu en or gravé. Mesures
 * de la maquette (plat 800 × 1000 : celles de la texture ; dos 140 × 1000, élargi à la texture).
 */

export const MOROCCO = '#2a1d16';
const MOROCCO_SPINE = '#251912';
const GARAMOND = "'EB Garamond', Georgia, serif";
/** Le dos de la maquette : 140 de large pour 1000 de haut (un livre de 0.1 d'épaisseur). */
const SPINE_WIDTH = 140;

export const loadIdleBabelFonts = (): Promise<unknown> =>
  Promise.all(
    [`400 40px ${TITLE}`, `500 40px ${TITLE}`, `600 40px ${TITLE}`, `italic 40px ${GARAMOND}`].map((font) => document.fonts.load(font)),
  );

/** Le hasard de la maquette (Park-Miller) : le même grain de cuir. */
const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** Le grain du maroquin : des points clairs et sombres. */
const grain = (context: CanvasRenderingContext2D, width: number, seed: number, amount: number, strength: number): void => {
  const random = rng(seed);
  for (let i = 0; i < amount; i++) {
    context.fillStyle = random() < 0.5 ? `rgba(0,0,0,${strength * random()})` : `rgba(255,255,255,${strength * random()})`;
    context.fillRect(random() * width, random() * HEIGHT, 1 + random() * 2, 1 + random() * 2);
  }
};

/** Les bords plus sombres. */
const edges = (context: CanvasRenderingContext2D, width: number, alpha: number): void => {
  const shade = context.createRadialGradient(
    width / 2,
    HEIGHT / 2,
    Math.min(width, HEIGHT) * 0.3,
    width / 2,
    HEIGHT / 2,
    Math.max(width, HEIGHT) * 0.75,
  );
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, `rgba(0,0,0,${alpha})`);
  context.fillStyle = shade;
  context.fillRect(0, 0, width, HEIGHT);
};

/** L'or du titre du jeu (gameTitle.css), entre deux hauteurs. */
const gold = (context: CanvasRenderingContext2D, top: number, bottom: number): CanvasGradient => {
  const gradient = context.createLinearGradient(0, top, 0, bottom);
  gradient.addColorStop(0, '#f7e2a6');
  gradient.addColorStop(0.45, '#d9a94e');
  gradient.addColorStop(0.55, '#9a6c26');
  gradient.addColorStop(1, '#e8c776');
  return gradient;
};

/** Un or de fer à dorer, sans la bande sombre du titre : le plan resterait à moitié dans l'ombre. */
const giltLine = (context: CanvasRenderingContext2D): CanvasGradient => {
  const gradient = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, '#ecd08c');
  gradient.addColorStop(0.5, '#cf9f4c');
  gradient.addColorStop(1, '#e6c47a');
  return gradient;
};

/** Le sceau du jeu (public/favicon.svg) centré en (x, y) ; `radius` : l'hexagone extérieur. */
const seal = (context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string | CanvasGradient): void => {
  const k = radius / 44;
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineJoin = 'miter';
  context.lineWidth = 7.5 * k;
  hexagon(context, x, y, 44 * k);
  context.stroke();
  context.lineWidth = 5.5 * k;
  hexagon(context, x, y, 28 * k);
  context.stroke();
  context.beginPath();
  context.arc(x, y, 7 * k, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

/** « IDLE » petit, calé après le grand B de « BABEL » en or (le titre du jeu) ; `y` : ligne de base de BABEL. */
const gameTitle = (context: CanvasRenderingContext2D, x: number, y: number, size: number, idleColor: string | CanvasGradient): void => {
  const { idle, babel } = messages().rareBooks.idleBabel;
  context.save();
  context.letterSpacing = `${size * 0.16}px`;
  context.font = `600 ${size}px ${TITLE}`;
  const rest = context.measureText(babel.slice(1)).width;
  context.font = `600 ${size * 1.55}px ${TITLE}`;
  const big = context.measureText(babel[0]).width;
  const left = x - (big + rest) / 2;
  context.shadowColor = 'rgba(0,0,0,0.7)';
  context.shadowOffsetY = 2;
  context.shadowBlur = 3;
  context.fillStyle = gold(context, y - size * 1.2, y);
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  context.fillText(babel[0], left, y);
  context.font = `600 ${size}px ${TITLE}`;
  context.fillText(babel.slice(1), left + big, y);
  context.restore();
  write(context, idle, left + big + size * 0.05, y - size, {
    font: `500 ${size * 0.38}px ${TITLE}`,
    color: idleColor,
    spacing: size * 0.27,
    align: 'left',
  });
};

/** Le plan d'une galerie : l'hexagone, ses quatre murs de rayonnages, le puits, les couloirs, l'escalier, une cote. */
const plan = (context: CanvasRenderingContext2D, line: CanvasGradient): void => {
  const text = messages().rareBooks.idleBabel;
  const label = (value: string, x: number, y: number, size: number, spacing = 0): void =>
    write(context, value, x, y, { font: `${size}px ${TITLE}`, color: line, spacing });
  label(text.plan, WIDTH / 2, 104, 24, 3);
  const [cx, cy, radius] = [WIDTH / 2, 410, 215];
  const corners = [...Array(6)].map((_, i): [number, number] => {
    const angle = (Math.PI / 3) * i;
    return [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
  });
  const segment = (x1: number, y1: number, x2: number, y2: number): void => {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  };
  context.strokeStyle = line;
  context.lineWidth = 3;
  context.beginPath();
  for (const [x, y] of corners) context.lineTo(x, y);
  context.closePath();
  context.stroke();
  // Les rayonnages : quatre côtés hachurés vers l'intérieur, fermés par un trait (les deux autres sont libres).
  for (const i of [1, 2, 4, 5]) {
    const [x1, y1] = corners[i];
    const [x2, y2] = corners[(i + 1) % 6];
    const nx = (cx - (x1 + x2) / 2) / radius;
    const ny = (cy - (y1 + y2) / 2) / radius;
    context.lineWidth = 1.4;
    for (let t = 0.12; t <= 0.88; t += 0.04) {
      const [x, y] = [x1 + (x2 - x1) * t, y1 + (y2 - y1) * t];
      segment(x, y, x + nx * 26, y + ny * 26);
    }
    segment(
      x1 + (x2 - x1) * 0.12 + nx * 26,
      y1 + (y2 - y1) * 0.12 + ny * 26,
      x1 + (x2 - x1) * 0.88 + nx * 26,
      y1 + (y2 - y1) * 0.88 + ny * 26,
    );
  }
  // Le puits central et sa balustrade.
  context.setLineDash([10, 7]);
  context.lineWidth = 1.6;
  hexagon(context, cx, cy, 70);
  context.stroke();
  context.setLineDash([]);
  context.lineWidth = 1;
  hexagon(context, cx, cy, 64);
  context.stroke();
  // Le couloir de droite et l'escalier en spirale.
  const east = corners[0][0];
  context.lineWidth = 2;
  segment(east, cy - 40, east + 70, cy - 40);
  segment(east, cy + 40, east + 70, cy + 40);
  const [sx, sy] = [east + 40, cy];
  context.lineWidth = 1.2;
  for (const r of [30, 5]) {
    context.beginPath();
    context.arc(sx, sy, r, 0, Math.PI * 2);
    context.stroke();
  }
  for (let k = 0; k < 10; k++) {
    const angle = (k / 10) * Math.PI * 2;
    segment(sx + 5 * Math.cos(angle), sy + 5 * Math.sin(angle), sx + 30 * Math.cos(angle), sy + 30 * Math.sin(angle));
  }
  // Le couloir de gauche.
  const west = corners[3][0];
  context.lineWidth = 2;
  segment(west, cy - 40, west - 50, cy - 40);
  segment(west, cy + 40, west - 50, cy + 40);
  // La cote du mur du haut : cinq étagères de trente-deux livres.
  const [[x1, y1], [x2]] = [corners[4], corners[5]];
  const dimension = y1 - 34;
  context.lineWidth = 1;
  segment(x1, dimension, x2, dimension);
  for (const x of [x1, x2]) {
    segment(x - 6, dimension + 6, x + 6, dimension - 6);
    segment(x, dimension - 14, x, dimension + 4);
  }
  label('5 × 32', (x1 + x2) / 2, dimension - 8, 17);
  label(text.shelves, cx, cy - 120, 15, 2);
  label(text.stair, sx, sy + 58, 14, 1);
  label(text.corridor, west - 26, cy + 70, 14, 1);
};

/** Le cartouche du plan, en bas à droite : projet, feuille, échelle, dessinateur, et le sceau du jeu. */
const titleBlock = (context: CanvasRenderingContext2D, line: CanvasGradient): void => {
  const text = messages().rareBooks.idleBabel;
  const [x, y, width, height] = [430, 846, 300, 90];
  context.strokeStyle = line;
  context.lineWidth = 2;
  context.strokeRect(x, y, width, height);
  context.lineWidth = 1;
  // Trois rangées ; la colonne coupe les deux dernières.
  const row = height / 3;
  const column = width * 0.52;
  for (const at of [y + row, y + 2 * row]) {
    context.beginPath();
    context.moveTo(x, at);
    context.lineTo(x + width, at);
    context.stroke();
  }
  context.beginPath();
  context.moveTo(x + column, y + row);
  context.lineTo(x + column, y + height);
  context.stroke();
  const baseline = (i: number): number => y + row * i + row * 0.68;
  const cell = (value: string, left: number, i: number, size: number): void =>
    write(context, value, left, baseline(i), { font: `${size}px ${TITLE}`, color: line, align: 'left' });
  cell(text.project, x + 12, 0, 15);
  cell(text.sheet, x + 12, 1, 13);
  cell(text.scale, x + column + 12, 1, 13);
  cell(text.drawn, x + 12, 2, 13);
  seal(context, x + column + (width - column) / 2, y + 2.5 * row, row * 0.36, line);
};

/** Le nord, en bas à gauche. */
const north = (context: CanvasRenderingContext2D, line: CanvasGradient): void => {
  context.strokeStyle = line;
  context.fillStyle = line;
  context.lineWidth = 1.4;
  context.beginPath();
  context.arc(110, 900, 26, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(110, 868);
  context.lineTo(102, 904);
  context.lineTo(118, 904);
  context.closePath();
  context.fill();
  write(context, 'N', 110, 860, { font: `16px ${TITLE}`, color: line });
};

/** Le maroquin, le double filet doré et un petit hexagone doré à chaque coin du filet intérieur. */
const morocco = (context: CanvasRenderingContext2D, seed: number): void => {
  context.fillStyle = MOROCCO;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  grain(context, WIDTH, seed, 30000, 0.1);
  edges(context, WIDTH, 0.55);
  const frame = gold(context, 0, HEIGHT);
  context.strokeStyle = frame;
  context.lineWidth = 3;
  context.strokeRect(40, 40, WIDTH - 80, HEIGHT - 80);
  context.lineWidth = 1;
  context.strokeRect(52, 52, WIDTH - 104, HEIGHT - 104);
  context.fillStyle = frame;
  for (const [x, y] of [
    [52, 52],
    [WIDTH - 52, 52],
    [52, HEIGHT - 52],
    [WIDTH - 52, HEIGHT - 52],
  ]) {
    hexagon(context, x, y, 9);
    context.fill();
  }
};

/**
 * Le plat : le plan doré de la galerie, le titre du jeu, le sous-titre sur deux lignes, le cartouche et le
 * nord, poussés au fer (une ombre légère sous l'or, comme une dorure enfoncée dans le cuir).
 */
export const idleBabelFront = (): THREE.CanvasTexture =>
  board(MOROCCO, MOROCCO, (context) => {
    const text = messages().rareBooks.idleBabel;
    morocco(context, 41);
    context.save();
    context.shadowColor = 'rgba(0,0,0,0.6)';
    context.shadowOffsetY = 1.5;
    context.shadowBlur = 2;
    const line = giltLine(context);
    plan(context, line);
    gameTitle(context, WIDTH / 2, 742, 72, line);
    for (const [subtitle, y] of [
      [text.subtitle, 786],
      [text.subtitle2, 816],
    ] as const)
      write(context, subtitle, WIDTH / 2, y, { font: `italic 26px ${GARAMOND}`, color: line });
    titleBlock(context, line);
    north(context, line);
    context.restore();
  });

/**
 * Le dos : maroquin bombé, deux filets dorés en haut et en bas, le sceau du jeu, le titre en long, et en bas
 * une petite galerie dorée (un hexagone, son puits en pointillé).
 */
export const idleBabelSpine = (): THREE.CanvasTexture =>
  board(MOROCCO_SPINE, MOROCCO_SPINE, (context) => {
    const { idle, babel } = messages().rareBooks.idleBabel;
    context.scale(WIDTH / SPINE_WIDTH, 1);
    context.fillStyle = MOROCCO_SPINE;
    context.fillRect(0, 0, SPINE_WIDTH, HEIGHT);
    grain(context, SPINE_WIDTH, 42, 5000, 0.1);
    const round = context.createLinearGradient(0, 0, SPINE_WIDTH, 0);
    round.addColorStop(0, 'rgba(0,0,0,0.5)');
    round.addColorStop(0.5, 'rgba(255,220,180,0.06)');
    round.addColorStop(1, 'rgba(0,0,0,0.55)');
    context.fillStyle = round;
    context.fillRect(0, 0, SPINE_WIDTH, HEIGHT);
    context.fillStyle = gold(context, 0, HEIGHT);
    for (const y of [60, 72, HEIGHT - 74, HEIGHT - 62]) context.fillRect(14, y, SPINE_WIDTH - 28, y % 4 ? 2 : 4);
    seal(context, SPINE_WIDTH / 2, 170, 34, gold(context, 136, 204));
    // Le titre en long, centré sur la hauteur des capitales.
    const title = `${idle} ${babel}`;
    const font = `600 40px ${TITLE}`;
    context.save();
    context.translate(SPINE_WIDTH / 2, 560);
    context.rotate(Math.PI / 2);
    context.font = font;
    // Le dégradé de la maquette (400 → 720) pris dans le repère tourné : un or clair, presque uni.
    write(context, title, 0, context.measureText(title).actualBoundingBoxAscent / 2, { font, color: gold(context, 400, 720), spacing: 8 });
    context.restore();
    context.strokeStyle = gold(context, HEIGHT - 220, HEIGHT - 120);
    context.lineWidth = 2;
    hexagon(context, SPINE_WIDTH / 2, HEIGHT - 170, 30);
    context.stroke();
    context.setLineDash([4, 3]);
    context.lineWidth = 1;
    hexagon(context, SPINE_WIDTH / 2, HEIGHT - 170, 11);
    context.stroke();
  });

/** Le plat arrière : le maroquin et ses filets, et au milieu le sceau du jeu, petit. */
export const idleBabelBack = (): THREE.CanvasTexture =>
  board(MOROCCO, MOROCCO, (context) => {
    morocco(context, 43);
    seal(context, WIDTH / 2, HEIGHT / 2, 34, gold(context, HEIGHT / 2 - 34, HEIGHT / 2 + 34));
  });

/** Les contre-plats : le maroquin nu, plus sombre. */
export const idleBabelInside = (): THREE.CanvasTexture => board('#1c130e', '#120c08');
