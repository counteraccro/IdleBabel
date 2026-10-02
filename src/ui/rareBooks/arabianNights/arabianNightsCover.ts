import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/im-fell-english-sc/400.css';
import { messages } from '../../../i18n';
import { HEIGHT, PAGE_CENTER, WIDTH, board } from '../draw';
import type { Drawing } from '../slowDrawing';
import { cell, cornerCell, lobed, morocco, rose, rubGold, scroll, star8, tooled } from './arabianNightsOrnaments';

/**
 * Notre reliure orientale (piste C de .ai/maquette-nuits.html, validée) : maroquin bordeaux, large bordure
 * dorée de cartouches à étoiles, écoinçons, médaillon polylobé à deux pendentifs qui porte le titre entre deux
 * rinceaux ; au dos lisse, le titre doré se lit de bas en haut. Dessinée dans les unités de la maquette (plat
 * 640 × 800, dos 110 × 800) mises à l'échelle.
 */
export const MOROCCO = '#6a1f22';
const MOROCCO_EDGE = '#2c0a0c';
export const GARAMOND = "'Cormorant Garamond', Georgia, serif";
export const FELL = "'IM Fell English', Georgia, serif";
const FELL_SC = "'IM Fell English SC', Georgia, serif";
const CINZEL = "'Cinzel', Georgia, serif";
export const INK = '#2a2018';
const RED = '#a3271d';
const [W, H] = [640, 800];
/** Les plats sont dessinés à l'échelle de la maquette (640 de large). */
const K = WIDTH / W;

export const loadArabianNightsFonts = (): Promise<unknown> =>
  Promise.all(
    [`40px ${GARAMOND}`, `italic 40px ${GARAMOND}`, `40px ${FELL}`, `italic 40px ${FELL}`, `40px ${FELL_SC}`, `600 40px ${CINZEL}`].map(
      (font) => document.fonts.load(font),
    ),
  );

/** La bordure de cartouches, le double encadrement et les écoinçons, communs aux deux plats. */
const frame = (context: CanvasRenderingContext2D): void => {
  const [outer, band] = [22, 62];
  const inner = outer + 8 + band + 8;
  context.lineWidth = 2.2;
  context.strokeRect(outer, outer, W - 2 * outer, H - 2 * outer);
  context.lineWidth = 1;
  context.strokeRect(outer + 5, outer + 5, W - 2 * outer - 10, H - 2 * outer - 10);
  context.lineWidth = 1;
  context.strokeRect(inner - 5, inner - 5, W - 2 * inner + 10, H - 2 * inner + 10);
  context.lineWidth = 2.2;
  context.strokeRect(inner, inner, W - 2 * inner, H - 2 * inner);
  // La bordure : un cartouche carré après l'autre, de grosses rosaces aux coins.
  const [x0, y0] = [outer + 8, outer + 8];
  const along = (from: number, to: number): [number, number][] => {
    const count = Math.round((to - from) / band);
    const size = (to - from) / count;
    return Array.from({ length: count }, (_, index) => [from + index * size, size]);
  };
  for (const [x, size] of along(x0 + band, W - x0 - band)) {
    cell(context, x, y0, size);
    cell(context, x, H - y0 - band, size);
  }
  for (const [y, size] of along(y0 + band, H - y0 - band)) {
    cell(context, x0, y, size);
    cell(context, W - x0 - band, y, size);
  }
  for (const [x, y] of [
    [x0, y0],
    [W - x0 - band, y0],
    [x0, H - y0 - band],
    [W - x0 - band, H - y0 - band],
  ])
    cornerCell(context, x, y, band);
  // Les écoinçons : un quart de médaillon festonné dans chaque angle du panneau.
  for (const [x, y, angle] of [
    [inner, inner, 0],
    [W - inner, inner, Math.PI / 2],
    [W - inner, H - inner, Math.PI],
    [inner, H - inner, -Math.PI / 2],
  ]) {
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.beginPath();
    context.rect(0, 0, 90, 90);
    context.clip();
    context.lineWidth = 1.6;
    lobed(context, 0, 0, 78, 78, 16);
    context.stroke();
    context.lineWidth = 1;
    lobed(context, 0, 0, 64, 64, 16, 1.08);
    context.stroke();
    context.lineWidth = 1.2;
    star8(context, 0, 0, 40);
    rose(context, 22, 22, 9);
    context.restore();
  }
};

/** Le médaillon central et ses deux pendentifs ; avec un titre, deux rinceaux l'encadrent, sinon une rosace au cœur. */
const medallion = (context: CanvasRenderingContext2D, title: [string, number, number, number][] | null): void => {
  const [x, y, rx, ry] = [W / 2, H / 2, 150, 118];
  context.lineWidth = 2.4;
  lobed(context, x, y, rx, ry, 18);
  context.stroke();
  context.lineWidth = 1;
  lobed(context, x, y, rx - 10, ry - 9, 18, 1.1);
  context.stroke();
  for (const dir of [-1, 1]) {
    const py = y + dir * (ry + 62);
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(x, y + dir * (ry + 15));
    context.lineTo(x, py - dir * 30);
    context.stroke();
    const knot = y + dir * (ry + 22);
    context.beginPath();
    context.moveTo(x, knot - 6);
    context.lineTo(x + 6, knot);
    context.lineTo(x, knot + 6);
    context.lineTo(x - 6, knot);
    context.fill();
    context.lineWidth = 1.8;
    lobed(context, x, py, 44, 32, 10);
    context.stroke();
    context.lineWidth = 1.1;
    star8(context, x, py, 20);
    rose(context, x, py, 9);
    // La pointe du pendentif.
    context.beginPath();
    context.moveTo(x - 8, py + dir * 32);
    context.lineTo(x, py + dir * 48);
    context.lineTo(x + 8, py + dir * 32);
    context.stroke();
  }
  if (title) {
    for (const [at, dir] of [
      [-74, -1],
      [-74, 1],
      [80, -1],
      [80, 1],
    ])
      scroll(context, x, y + at, 92, dir);
    rose(context, x, y - 74, 6);
    rose(context, x, y + 80, 6);
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    for (const [text, size, dy, spacing] of title) {
      context.font = `600 ${size}px ${CINZEL}`;
      context.letterSpacing = `${spacing}px`;
      context.fillText(text, x, y + dy);
    }
    context.letterSpacing = '0px';
  } else {
    context.lineWidth = 1.6;
    star8(context, x, y, 70);
    context.lineWidth = 1.1;
    star8(context, x, y, 50);
    rose(context, x, y, 30);
    for (let petal = 0; petal < 8; petal++) {
      const angle = (petal / 8) * Math.PI * 2 + Math.PI / 8;
      rose(context, x + Math.cos(angle) * 96, y + Math.sin(angle) * 76, 8);
    }
  }
};

/** Une pièce de maroquin (plat ou dos) : `draw` y dessine par morceaux (yield : une pause possible). */
function* leather(draw: (context: CanvasRenderingContext2D) => Generator<void>): Drawing {
  const canvas = board(MOROCCO, MOROCCO_EDGE).image as HTMLCanvasElement;
  yield* draw(canvas.getContext('2d')!);
  return canvas;
}

/** Un plat : le maroquin, l'or poussé au fer, puis frotté. */
const plate = (seed: number, title: [string, number, number, number][] | null): Drawing =>
  leather(function* (context) {
    context.save();
    context.scale(K, K);
    yield* morocco(context, W, H, seed);
    tooled(
      context,
      (gilt) => {
        frame(gilt);
        medallion(gilt, title);
      },
      W,
      H,
    );
    yield;
    rubGold(context, W, H, seed);
    context.restore();
  });

export const arabianNightsFront = (): Drawing => plate(21, messages().rareBooks.arabianNights.plate as [string, number, number, number][]);
export const arabianNightsBack = (): Drawing => plate(22, null);

/**
 * Le dos lisse : filets en tête et en pied, deux frises de trois cartouches, le titre couché (de bas en haut)
 * entre deux étoiles, la tomaison au-dessus de la frise du pied.
 */
export const arabianNightsSpine = (thickness: number): Drawing =>
  leather(function* (context) {
    // Dessiné sans déformation, à l'échelle de la maquette : `width` est la largeur visible du dos.
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const scale = HEIGHT / H;
    const width = WIDTH / stretch / scale;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch * scale, scale);
    context.translate(-width / 2, 0);
    yield* morocco(context, width, H, 13);
    const { spine, volume } = messages().rareBooks.arabianNights;
    tooled(
      context,
      (gilt) => {
        for (const y of [20, 26, H - 26, H - 20]) {
          gilt.lineWidth = y % 2 ? 1 : 2;
          gilt.beginPath();
          gilt.moveTo(6, y);
          gilt.lineTo(width - 6, y);
          gilt.stroke();
        }
        for (const top of [34, H - 34 - 3 * 34]) for (let row = 0; row < 3; row++) cell(gilt, (width - 34) / 2, top + row * 34, 34);
        // Le titre se lit de bas en haut ; plus long (en anglais), il est poussé plus petit.
        gilt.save();
        gilt.translate(width / 2, 395);
        gilt.rotate(-Math.PI / 2);
        gilt.textAlign = 'center';
        gilt.textBaseline = 'alphabetic';
        // Il tient dans 390 (la longueur du titre français) : l'espacement des lettres, lui, ne rétrécit pas.
        gilt.font = `600 24px ${CINZEL}`;
        const letters = 3 * spine.length;
        const size = Math.min(24, (24 * (390 - letters)) / gilt.measureText(spine).width);
        gilt.font = `600 ${size}px ${CINZEL}`;
        gilt.letterSpacing = '3px';
        gilt.fillText(spine, 0, 9);
        gilt.letterSpacing = '0px';
        gilt.restore();
        for (const y of [160, 618]) {
          gilt.lineWidth = 1.1;
          star8(gilt, width / 2, y, 14);
          rose(gilt, width / 2, y, 6);
        }
        gilt.textAlign = 'center';
        gilt.font = `600 13px ${CINZEL}`;
        gilt.letterSpacing = '2px';
        gilt.fillText(volume, width / 2, 652);
        gilt.letterSpacing = '0px';
      },
      width,
      H,
    );
    yield;
    rubGold(context, width, H, 13);
    context.restore();
  });

/** Un fleuron typographique (vignette de la page de titre, bandeau des contes). */
export const typeFlower = (context: CanvasRenderingContext2D, x: number, y: number, radius: number): void => {
  context.save();
  context.translate(x, y);
  context.fillStyle = INK;
  context.strokeStyle = INK;
  context.lineWidth = 1.2;
  for (let petal = 0; petal < 6; petal++) {
    context.rotate(Math.PI / 3);
    context.beginPath();
    context.ellipse(0, -radius * 0.55, radius * 0.18, radius * 0.45, 0, 0, Math.PI * 2);
    context.fill();
  }
  context.beginPath();
  context.arc(0, 0, radius * 0.2, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(0, 0, radius * 1.05, 0, Math.PI * 2);
  context.stroke();
  context.restore();
};

/**
 * La page de titre de l'édition de chaque langue (Barbin 1704 en français, Scott 1811 en anglais), une ligne
 * imprimée par ligne de texte : « y sorte texte » (y : ligne de base) ; « rule » : un filet de demi-largeur
 * `texte`, « flower » : le fleuron de rayon `texte`. (Un seul texte : les deux pages n'ont pas le même nombre
 * de lignes, les deux langues gardent les mêmes clés.)
 */
export const arabianNightsTitlePage = (context: CanvasRenderingContext2D): void => {
  const fonts: Record<string, [string, number, string?]> = {
    les: [`22px ${FELL}`, 4],
    title: [`46px ${FELL}`, 2, RED],
    tales: [`28px ${FELL}`, 3],
    translated: [`20px ${FELL}`, 2],
    galland: [`22px ${FELL}`, 1, RED],
    volume: [`18px ${FELL}`, 3],
    paris: [`22px ${FELL}`, 3, RED],
    barbin: [`18px ${FELL}`, 0.5],
    palais: [`italic 17px ${FELL}`, 0.5],
    year: [`20px ${FELL}`, 3, RED],
    privilege: [`15px ${FELL_SC}`, 2],
    the: [`18px ${FELL}`, 4],
    nights: [`42px ${FELL}`, 2],
    entertainments: [`26px ${FELL}`, 3],
    small: [`14px ${FELL}`, 1],
    added: [`italic 13px ${FELL}`, 2],
    tales2: [`15px ${FELL}`, 1],
    first: [`13px ${FELL}`, 0.5],
    scott: [`17px ${FELL}`, 1],
    six: [`15px ${FELL}`, 2],
    london: [`18px ${FELL}`, 3],
    printer: [`12px ${FELL}`, 0.5],
    year2: [`17px ${FELL}`, 2],
  };
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  for (const line of messages().rareBooks.arabianNights.titlePage.split('\n')) {
    const [y, kind, ...words] = line.split(' ');
    const text = words.join(' ');
    if (kind === 'rule') {
      context.fillStyle = INK;
      context.fillRect(PAGE_CENTER - Number(text), Number(y), 2 * Number(text), 1);
    } else if (kind === 'flower') typeFlower(context, PAGE_CENTER, Number(y), Number(text));
    else {
      const [font, spacing, color = INK] = fonts[kind];
      context.font = font;
      context.letterSpacing = `${spacing}px`;
      context.fillStyle = color;
      context.fillText(text, PAGE_CENTER, Number(y));
      context.letterSpacing = '0px';
    }
  }
};
