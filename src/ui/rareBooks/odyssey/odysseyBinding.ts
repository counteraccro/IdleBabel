import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/eb-garamond/700.css';
import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board } from '../draw';
import { rng } from '../arabianNights/arabianNightsOrnaments';
import type { Drawing } from '../slowDrawing';

/**
 * La reliure de l'originale (Lemerre, 1868), piste B de .ai/maquette-odyssee.html (validée) : demi-maroquin
 * rouge, plats de papier marbré à vagues, dos à cinq nerfs aux caissons dorés, pièce de titre, l'année en
 * pied. Dessinée dans les unités de la maquette (plat 640 × 800, dos 110 × 800) mises à l'échelle, avec le
 * même hasard : mêmes grains, mêmes vagues.
 */
export const MOROCCO = ['#8e2430', '#4e0f17'] as const;
export const GARAMOND = "'EB Garamond', Georgia, serif";
const [W, H] = [640, 800];
/** Les plats sont dessinés à l'échelle de la maquette (640 de large). */
const K = WIDTH / W;
/** La part du plat couverte par le cuir du dos (demi-reliure, sans coins, comme l'exemplaire photographié). */
const STRIP = 150;

export const loadOdysseyFonts = (): Promise<unknown> =>
  Promise.all([`40px ${GARAMOND}`, `italic 40px ${GARAMOND}`, `500 40px ${GARAMOND}`, `700 40px ${GARAMOND}`].map((font) => document.fonts.load(font)));

/** Du texte posé par sa ligne de base, centré, comme sur la maquette. */
const print = (context: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, color: string | CanvasGradient, spacing = 0): void => {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${spacing}px`;
  context.fillText(text, x, y);
  context.letterSpacing = '0px';
};

const gold = (context: CanvasRenderingContext2D, width: number): CanvasGradient => {
  const gradient = context.createLinearGradient(0, 0, width, 0);
  gradient.addColorStop(0, '#8a6a2c');
  gradient.addColorStop(0.35, '#f2d68e');
  gradient.addColorStop(0.55, '#c9a24f');
  gradient.addColorStop(0.8, '#f2d68e');
  gradient.addColorStop(1, '#8a6a2c');
  return gradient;
};

/** Le maroquin : grain écrasé (petits creux), lustre au centre. */
function* morocco(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, seed: number): Generator<void> {
  const gradient = context.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, MOROCCO[1]);
  gradient.addColorStop(0.45, MOROCCO[0]);
  gradient.addColorStop(1, MOROCCO[1]);
  context.fillStyle = gradient;
  context.fillRect(x, y, width, height);
  const random = rng(seed);
  const grains = (width * height) / 14;
  for (let grain = 0; grain < grains; grain++) {
    const [px, py] = [x + random() * width, y + random() * height];
    context.fillStyle = random() < 0.6 ? 'rgba(0,0,0,0.16)' : 'rgba(255,200,190,0.07)';
    context.fillRect(px, py, 1 + random() * 2, 1 + random() * 1.5);
    if (grain % 2000 === 1999) yield;
  }
}

/**
 * Le papier marbré à vagues : des masses de couleur (crème surtout, orangé, bleu, vert) entre des plages de
 * bordeaux courent à l'horizontale ; chaque dent du peigne les soulève en arche ronde, qui penche tantôt à
 * gauche, tantôt à droite ; les crêtes s'empilent en colonnes ondulées ; le peigne effrange leurs bords.
 * Calculé pixel par pixel à la taille du plat (dans les unités de la maquette), quelques rangées à la fois.
 */
function* marbled(context: CanvasRenderingContext2D, seed: number): Generator<void> {
  const random = rng(seed);
  const stripes: [string, number][] = [];
  const veins = ['#e9d8c4', '#e9d8c4', '#e9d8c4', '#dcc3ad', '#d08a58', '#6a86b2', '#527e6c', '#c79a8a'];
  for (let band = 0; band < 40; band++) {
    stripes.push([random() < 0.5 ? '#7a1d31' : '#86283b', 6 + random() * 14]);
    stripes.push([veins[Math.floor(random() * veins.length)], 4 + random() * 9]);
    if (random() < 0.4) stripes.push([veins[Math.floor(random() * veins.length)], 3 + random() * 5]);
    if (random() < 0.5) stripes.push(['#6a1a2b', 1.5 + random() * 2]);
  }
  const total = stripes.reduce((sum, [, size]) => sum + size, 0);
  const rgb = (color: string): number[] => [1, 3, 5].map((at) => Number.parseInt(color.slice(at, at + 2), 16));
  const table: (number[] | undefined)[] = new Array(Math.ceil(total)).fill(undefined);
  let at = 0;
  for (const [color, size] of stripes) {
    const value = rgb(color);
    for (let k = Math.floor(at); k < Math.floor(at + size); k++) table[k % table.length] = value;
    at += size;
  }
  const colors = table.map((value) => value ?? rgb('#7a1d31'));
  const [comb, depth] = [104, 46];
  const image = context.createImageData(WIDTH, HEIGHT);
  for (let row = 0; row < HEIGHT; row++) {
    const py = row / K;
    for (let column = 0; column < WIDTH; column++) {
      const px = column / K;
      // Le décalage des arches suit une vague lisse, qui dépend aussi de la largeur (colonnes pas alignées).
      const shift = 36 * Math.sin(py * 0.008 + px * 0.003) + 10 * Math.sin(py * 0.017 - px * 0.006 + 1.3);
      const cx = ((((px + shift) % comb) + comb) % comb) / comb - 0.5;
      // L'arche ronde, déhanchée à gauche ou à droite.
      const lean = 0.42 * Math.sin(py * 0.021 + px * 0.013) + 0.16 * Math.sin(px * 0.047 - py * 0.009);
      const angle = cx * Math.PI * 2;
      let v = py + depth * (0.5 + 0.5 * Math.cos(angle + lean * Math.sin(angle)));
      v += 12 * Math.sin(px * 0.007 + py * 0.004);
      // Les barbes du peigne, au bord des masses.
      v += 1.8 * Math.sin(px * 0.9 + v * 0.12);
      const [r, g, b] = colors[Math.floor((((v + 4000) % total) + total) % total) % colors.length];
      // La couleur n'est pas plate : un peu plus ou moins chargée d'un endroit à l'autre.
      const tone = 1 + 0.07 * Math.sin(px * 0.031 + py * 0.017) + 0.05 * Math.sin(px * 0.11 - py * 0.07);
      const i = (row * WIDTH + column) * 4;
      image.data[i] = r * tone;
      image.data[i + 1] = g * tone;
      image.data[i + 2] = b * tone;
      image.data[i + 3] = 255;
    }
    if (row % 40 === 39) yield;
  }
  context.putImageData(image, 0, 0);
  // Le papier, un peu passé.
  context.fillStyle = 'rgba(110,50,55,0.16)';
  context.fillRect(0, 0, WIDTH, HEIGHT);
}

/** Une pièce de la reliure : `draw` y dessine par morceaux (yield : une pause possible). */
function* piece(draw: (context: CanvasRenderingContext2D) => Generator<void>): Drawing {
  const canvas = board(MOROCCO[0], MOROCCO[1]).image as HTMLCanvasElement;
  yield* draw(canvas.getContext('2d')!);
  return canvas;
}

/**
 * Un plat : le papier marbré, et le cuir du dos qui déborde dessus, du côté du dos (à gauche sur le plat de
 * devant ; le plat arrière est vu retourné, son dos est à droite).
 */
const plate = (seed: number, spineOnLeft: boolean): Drawing =>
  piece(function* (context) {
    yield* marbled(context, seed);
    context.save();
    context.scale(K, K);
    const x = spineOnLeft ? 0 : W - STRIP;
    const edge = spineOnLeft ? STRIP : W - STRIP;
    yield* morocco(context, x, 0, STRIP, H, spineOnLeft ? 4 : 5);
    context.fillStyle = 'rgba(0,0,0,0.4)';
    context.fillRect(spineOnLeft ? edge : edge - 2, 0, 2, H);
    context.fillStyle = 'rgba(255,210,200,0.08)';
    context.fillRect(spineOnLeft ? edge - 2 : edge, 0, 2, H);
    // Le bord frotté, du côté de la tranche.
    const fore = spineOnLeft ? W : 0;
    const rubbed = context.createLinearGradient(fore, 0, spineOnLeft ? W - 18 : 18, 0);
    rubbed.addColorStop(0, 'rgba(240,220,210,0.18)');
    rubbed.addColorStop(1, 'rgba(240,220,210,0)');
    context.fillStyle = rubbed;
    context.fillRect(spineOnLeft ? W - 18 : 0, 0, 18, H);
    context.restore();
  });

export const odysseyFront = (): Drawing => plate(7, true);
export const odysseyBack = (): Drawing => plate(8, false);

/** Un fleuron doré (le motif des caissons) : tige, volutes, petites feuilles. */
const fleuron = (context: CanvasRenderingContext2D, cx: number, cy: number, scale: number, gilt: CanvasGradient): void => {
  context.save();
  context.translate(cx, cy);
  context.scale(scale, scale);
  context.strokeStyle = gilt;
  context.fillStyle = gilt;
  context.lineWidth = 1.6;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(0, -26);
  context.lineTo(0, 26);
  context.stroke();
  for (const side of [-1, 1]) {
    context.beginPath();
    context.moveTo(0, 0);
    context.bezierCurveTo(side * 16, -6, side * 18, 12, side * 8, 12);
    context.bezierCurveTo(side * 2, 12, side * 3, 4, side * 8, 5);
    context.stroke();
    context.beginPath();
    context.moveTo(0, -12);
    context.bezierCurveTo(side * 10, -16, side * 12, -26, side * 4, -26);
    context.stroke();
    context.beginPath();
    context.ellipse(side * 6, 18, 5, 2.2, side * 0.7, 0, Math.PI * 2);
    context.fill();
  }
  context.beginPath();
  context.ellipse(0, -30, 3, 5, 0, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(0, 30, 2.5, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

/** Un écoinçon : un quart de volute dans l'angle d'un caisson. */
const corner = (context: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, gilt: CanvasGradient): void => {
  context.save();
  context.translate(x, y);
  context.scale(sx, sy);
  context.strokeStyle = gilt;
  context.fillStyle = gilt;
  context.lineWidth = 1.3;
  context.beginPath();
  context.moveTo(0, 14);
  context.bezierCurveTo(0, 4, 4, 0, 14, 0);
  context.stroke();
  context.beginPath();
  context.moveTo(3, 10);
  context.bezierCurveTo(6, 6, 10, 6, 10, 3);
  context.stroke();
  context.beginPath();
  context.arc(9, 9, 1.6, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

/** Les nerfs : la limite des caissons ; sous le dernier, le pied où est poussée l'année. */
const EDGES = [26, 132, 262, 372, 482, 592, 700];

/**
 * Le dos à cinq nerfs : un caisson orné, la pièce de titre, quatre caissons ornés (fleuron, écoinçons,
 * étoiles), puis l'année entre deux paires de filets.
 */
export const odysseySpine = (thickness: number): Drawing =>
  piece(function* (context) {
    // Dessiné sans déformation, à l'échelle de la maquette : `width` est la largeur visible du dos.
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const scale = HEIGHT / H;
    const width = WIDTH / stretch / scale;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch * scale, scale);
    context.translate(-width / 2, 0);
    yield* morocco(context, 0, 0, width, H, 21);
    // L'arrondi du dos : plus sombre sur les bords.
    const round = context.createLinearGradient(0, 0, width, 0);
    round.addColorStop(0, 'rgba(0,0,0,0.45)');
    round.addColorStop(0.3, 'rgba(0,0,0,0)');
    round.addColorStop(0.7, 'rgba(0,0,0,0)');
    round.addColorStop(1, 'rgba(0,0,0,0.45)');
    context.fillStyle = round;
    context.fillRect(0, 0, width, H);
    const gilt = gold(context, width);
    for (const y of EDGES.slice(1, 6)) {
      const band = context.createLinearGradient(0, y - 7, 0, y + 7);
      band.addColorStop(0, 'rgba(0,0,0,0.5)');
      band.addColorStop(0.45, 'rgba(255,190,180,0.22)');
      band.addColorStop(1, 'rgba(0,0,0,0.55)');
      context.fillStyle = band;
      context.fillRect(0, y - 7, width, 14);
      context.fillStyle = gilt;
      for (let x = 10; x < width - 10; x += 5) context.fillRect(x, y - 0.8, 2.5, 1.6);
    }
    const [title, translated, translator, year] = messages().rareBooks.odyssey.spine;
    for (let i = 0; i < EDGES.length - 1; i++) {
      const [y0, y1, x0, x1] = [EDGES[i] + 10, EDGES[i + 1] - 10, 10, width - 10];
      context.strokeStyle = gilt;
      context.lineWidth = 1.4;
      context.strokeRect(x0, y0, x1 - x0, y1 - y0);
      context.lineWidth = 0.7;
      context.strokeRect(x0 + 4, y0 + 4, x1 - x0 - 8, y1 - y0 - 8);
      if (i === 1) {
        // La pièce de titre : un maroquin plus sombre, encadré d'or.
        context.fillStyle = 'rgba(40,5,10,0.35)';
        context.fillRect(x0 + 5, y0 + 5, x1 - x0 - 10, y1 - y0 - 10);
        print(context, title, width / 2, y0 + 30, `500 15px ${GARAMOND}`, gilt, 1);
        context.fillStyle = gilt;
        context.fillRect(width / 2 - 3, y0 + 40, 6, 1);
        print(context, translated, width / 2, y0 + 64, `11px ${GARAMOND}`, gilt, 1);
        print(context, translator, width / 2, y0 + 92, `8px ${GARAMOND}`, gilt, 0.2);
        continue;
      }
      corner(context, x0 + 6, y0 + 6, 1, 1, gilt);
      corner(context, x1 - 6, y0 + 6, -1, 1, gilt);
      corner(context, x0 + 6, y1 - 6, 1, -1, gilt);
      corner(context, x1 - 6, y1 - 6, -1, -1, gilt);
      fleuron(context, width / 2, (y0 + y1) / 2, 0.95, gilt);
      context.fillStyle = gilt;
      for (const [dx, dy] of [[-28, -30], [28, -30], [-28, 30], [28, 30], [-30, 0], [30, 0], [-14, -38], [14, -38], [-14, 38], [14, 38]]) {
        context.beginPath();
        context.arc(width / 2 + dx, (y0 + y1) / 2 + dy, 1.5, 0, Math.PI * 2);
        context.fill();
      }
    }
    // Le pied : l'année entre deux paires de filets ; en tête, deux filets.
    const foot = EDGES[EDGES.length - 1];
    context.fillStyle = gilt;
    for (const y of [foot + 4, foot + 8, foot + 70, foot + 74, 12, 17]) context.fillRect(y < foot ? 8 : 10, y, width - (y < foot ? 16 : 20), 1);
    print(context, year, width / 2, foot + 50, `15px ${GARAMOND}`, gilt, 2);
    context.restore();
  });
