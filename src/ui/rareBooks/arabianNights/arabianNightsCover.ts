import '@fontsource/cormorant-garamond/400.css';
import '@fontsource/cormorant-garamond/400-italic.css';
import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/im-fell-english-sc/400.css';
import * as THREE from 'three';
import { messages } from '../../../i18n';
import { hashText, seeded } from '../../../core/random';
import { HEIGHT, PAGE_CENTER, WIDTH, board } from '../draw';

/**
 * L'édition d'origine (Galland, chez la veuve Barbin, Paris, 1704) : plein veau moucheté, plats nus bordés
 * d'un triple filet doré, dos à cinq nerfs orné de fleurons, pièce de titre en maroquin rouge, tranches
 * mouchetées de rouge. Mesures de .ai/maquette-nuits.html (plat 640 × 800, dos 110 × 800) mises à l'échelle.
 */
export const CALF = '#7a4a2a';
const CALF_EDGE = '#3f2412';
export const GARAMOND = "'Cormorant Garamond', Georgia, serif";
export const FELL = "'IM Fell English', Georgia, serif";
const FELL_SC = "'IM Fell English SC', Georgia, serif";
export const INK = '#2a2018';
const RED = '#a3271d';
/** Les plats sont dessinés à l'échelle de la maquette (640 de large). */
const K = WIDTH / 640;

export const loadArabianNightsFonts = (): Promise<unknown> =>
  Promise.all(
    [`40px ${GARAMOND}`, `italic 40px ${GARAMOND}`, `40px ${FELL}`, `italic 40px ${FELL}`, `40px ${FELL_SC}`].map((font) =>
      document.fonts.load(font),
    ),
  );

const gold = (context: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): CanvasGradient => {
  const gradient = context.createLinearGradient(x0, y0, x1, y1);
  gradient.addColorStop(0, '#7d5e24');
  gradient.addColorStop(0.35, '#e9c97c');
  gradient.addColorStop(0.55, '#c9a24f');
  gradient.addColorStop(0.8, '#e9c97c');
  gradient.addColorStop(1, '#7d5e24');
  return gradient;
};

/** Le veau moucheté : taches sombres d'acide en grappes, grain du cuir, bords et coins frottés. */
const calf = (context: CanvasRenderingContext2D, width: number, height: number, seed: string): void => {
  const random = seeded(hashText(seed));
  for (let speck = 0; speck < (width * height) / 260; speck++) {
    context.fillStyle = `rgba(30, 14, 4, ${0.18 + random() * 0.3})`;
    context.beginPath();
    context.arc(random() * width, random() * height, 0.6 + random() * 2.4, 0, Math.PI * 2);
    context.fill();
  }
  for (let grain = 0; grain < (width * height) / 40; grain++) {
    context.fillStyle = random() < 0.5 ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 230, 190, 0.05)';
    context.fillRect(random() * width, random() * height, 1 + random(), 1);
  }
  const rubbed = (x0: number, y0: number, x1: number, y1: number): CanvasGradient => {
    const gradient = context.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, 'rgba(200, 160, 110, 0.22)');
    gradient.addColorStop(1, 'rgba(200, 160, 110, 0)');
    return gradient;
  };
  context.fillStyle = rubbed(0, 0, 0, 18);
  context.fillRect(0, 0, width, 18);
  context.fillStyle = rubbed(0, height, 0, height - 18);
  context.fillRect(0, height - 18, width, 18);
  context.fillStyle = rubbed(width, 0, width - 14, 0);
  context.fillRect(width - 14, 0, 14, height);
};

/** Un plat : le veau et le triple filet doré en encadrement (le dos d'origine n'a rien d'autre). */
const plate = (seed: string): THREE.CanvasTexture =>
  board(CALF, CALF_EDGE, (context) => {
    context.save();
    context.scale(K, K);
    const [width, height] = [WIDTH / K, HEIGHT / K];
    calf(context, width, height, seed);
    context.strokeStyle = gold(context, 0, 0, width, height);
    for (const [inset, line] of [
      [20, 1.2],
      [26, 2],
      [32, 1.2],
    ]) {
      context.lineWidth = line;
      context.strokeRect(inset, inset, width - 2 * inset, height - 2 * inset);
    }
    context.restore();
  });

export const arabianNightsFront = (): THREE.CanvasTexture => plate('nights:front');
export const arabianNightsBack = (): THREE.CanvasTexture => plate('nights:back');

/** Un petit fleuron doré (quatre pétales, quatre pointes), comme les fers des dos. */
const fleuron = (context: CanvasRenderingContext2D, x: number, y: number, radius: number): void => {
  context.save();
  context.translate(x, y);
  for (let petal = 0; petal < 4; petal++) {
    context.rotate(Math.PI / 2);
    context.beginPath();
    context.ellipse(0, -radius * 0.5, radius * 0.22, radius * 0.5, 0, 0, Math.PI * 2);
    context.fill();
    context.save();
    context.rotate(Math.PI / 4);
    context.beginPath();
    context.moveTo(0, -radius * 0.35);
    context.lineTo(radius * 0.08, -radius * 0.95);
    context.lineTo(-radius * 0.08, -radius * 0.95);
    context.fill();
    context.restore();
  }
  context.beginPath();
  context.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

/** Du texte doré centré sur le dos (y : ligne de base, comme la maquette). */
const lettering = (context: CanvasRenderingContext2D, text: string, y: number, size: number): void => {
  context.font = `${size}px ${FELL_SC}`;
  context.letterSpacing = '1px';
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillText(text, 0, y);
  context.letterSpacing = '0px';
};

/**
 * Le dos : cinq nerfs, six caissons ; le 2e porte la pièce de titre en maroquin rouge, le 3e la tomaison,
 * les autres un fleuron et quatre points dorés.
 */
export const arabianNightsSpine = (thickness: number): THREE.CanvasTexture =>
  board('#74462a', '#3a2010', (context) => {
    // Dessiné sans déformation, à l'échelle de la maquette : `width` est la largeur visible du dos.
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const scale = HEIGHT / 800;
    const width = WIDTH / stretch / scale;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch * scale, scale);
    context.translate(-width / 2, 0);
    calf(context, width, 800, 'nights:spine');
    const ink = gold(context, 0, 0, width, 0);
    const [top, bottom] = [46, 800 - 46];
    const step = (bottom - top) / 6;
    for (let band = 0; band <= 6; band++) {
      const y = top + band * step;
      if (band > 0 && band < 6) {
        // Le nerf en relief : une bosse claire entre deux ombres.
        const relief = context.createLinearGradient(0, y - 7, 0, y + 7);
        relief.addColorStop(0, 'rgba(0, 0, 0, 0.35)');
        relief.addColorStop(0.35, 'rgba(255, 220, 170, 0.22)');
        relief.addColorStop(0.7, 'rgba(0, 0, 0, 0.1)');
        relief.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
        context.fillStyle = relief;
        context.fillRect(0, y - 7, width, 14);
      }
      context.fillStyle = ink;
      context.fillRect(8, y - 9, width - 16, 1.2);
      context.fillRect(8, y + 8, width - 16, 1.2);
    }
    const { spine, volume } = messages().rareBooks.arabianNights;
    for (let box = 0; box < 6; box++) {
      const [y0, y1] = [top + box * step + 12, top + (box + 1) * step - 12];
      const middle = (y0 + y1) / 2;
      context.save();
      context.translate(width / 2, 0);
      if (box === 1) {
        // La pièce de titre : maroquin rouge, un filet doré en haut et en bas.
        const [x, y, w, h] = [9 - width / 2, y0 + 4, width - 18, y1 - y0 - 8];
        context.fillStyle = '#8e2a1e';
        context.fillRect(x, y, w, h);
        context.fillStyle = 'rgba(255, 255, 255, 0.08)';
        context.fillRect(x, y, w, 2);
        context.fillStyle = 'rgba(0, 0, 0, 0.35)';
        context.fillRect(x, y + h - 2, w, 2);
        context.fillStyle = ink;
        context.fillRect(x + 4, y + 5, w - 8, 1.2);
        context.fillRect(x + 4, y + h - 6, w - 8, 1.2);
        (spine as [string, number][]).forEach(([text, size], row) => lettering(context, text, middle - 16 + row * 20, size));
      } else if (box === 2) {
        context.fillStyle = ink;
        lettering(context, volume, middle + 6, 15);
      } else {
        context.fillStyle = ink;
        fleuron(context, 0, middle, 20);
        for (const [dx, dy] of [
          [-27, -30.6],
          [27, -30.6],
          [-27, 30.6],
          [27, 30.6],
        ]) {
          context.beginPath();
          context.arc(dx, middle + dy, 2.2, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.restore();
    }
    context.restore();
  });

/** Les tranches mouchetées de rouge (un pinceau secoué au-dessus du livre fermé). */
export const sprinkledEdge = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#c4614a';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const random = seeded(hashText('nights:edge'));
  for (let y = 0; y < canvas.height; y += 3) {
    context.fillStyle = 'rgba(90, 30, 20, 0.25)';
    context.fillRect(0, y, canvas.width, random() < 0.3 ? 1.4 : 0.8);
  }
  for (let speck = 0; speck < 900; speck++) {
    context.fillStyle = random() < 0.7 ? 'rgba(120, 25, 15, 0.7)' : 'rgba(240, 210, 180, 0.35)';
    context.fillRect(random() * canvas.width, random() * canvas.height, 1 + random() * 1.5, 1 + random() * 1.5);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

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
