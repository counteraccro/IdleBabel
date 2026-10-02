import '@fontsource/libre-caslon-text/400.css';
import '@fontsource/libre-caslon-text/400-italic.css';
import '@fontsource/libre-caslon-text/700.css';
import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import '@fontsource/im-fell-english-sc/400.css';
import { messages } from '../../../i18n';
import { hashText, seeded } from '../../../core/random';
import { CQW, HEIGHT, PAGE_CENTER, WIDTH, board, write } from '../draw';
import type * as THREE from 'three';

/** La toile ardoise de la première édition américaine (Harper & Brothers, New York, 1851). */
export const CLOTH = '#4a525a';
const CLOTH_EDGE = '#262b31';
export const CASLON = "'Libre Caslon Text', Georgia, serif";
const FELL = "'IM Fell English', Georgia, serif";
const FELL_SC = "'IM Fell English SC', Georgia, serif";
export const INK = '#2a2219';

export const loadMobyDickFonts = (): Promise<unknown> =>
  Promise.all(
    [`40px ${CASLON}`, `italic 40px ${CASLON}`, `bold 40px ${CASLON}`, `40px ${FELL}`, `italic 40px ${FELL}`, `40px ${FELL_SC}`].map(
      (font) => document.fonts.load(font),
    ),
  );

const gold = (context: CanvasRenderingContext2D, width: number): CanvasGradient => {
  const gradient = context.createLinearGradient(-width / 2, 0, width / 2, 0);
  gradient.addColorStop(0, '#8a6a2c');
  gradient.addColorStop(0.35, '#f2d68e');
  gradient.addColorStop(0.55, '#c9a24f');
  gradient.addColorStop(0.8, '#f2d68e');
  gradient.addColorStop(1, '#8a6a2c');
  return gradient;
};

/** Le grain de la toile (fils en long et en travers, petites irrégularités) et ses bords frottés. */
const cloth = (context: CanvasRenderingContext2D, seed: string): void => {
  const random = seeded(hashText(seed));
  for (let y = 0; y < HEIGHT; y += 2) {
    context.fillStyle = `rgba(0, 0, 0, ${0.04 + random() * 0.05})`;
    context.fillRect(0, y, WIDTH, 1);
  }
  for (let x = 0; x < WIDTH; x += 2) {
    context.fillStyle = `rgba(255, 255, 255, ${random() * 0.035})`;
    context.fillRect(x, 0, 1, HEIGHT);
  }
  for (let speck = 0; speck < (WIDTH * HEIGHT) / 90; speck++) {
    context.fillStyle = random() < 0.5 ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.05)';
    context.fillRect(random() * WIDTH, random() * HEIGHT, 1 + random() * 2, 1);
  }
  const rubbed = (x0: number, y0: number, x1: number, y1: number): CanvasGradient => {
    const gradient = context.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, 'rgba(230, 220, 200, 0.16)');
    gradient.addColorStop(1, 'rgba(230, 220, 200, 0)');
    return gradient;
  };
  context.fillStyle = rubbed(0, 0, 0, 3 * CQW);
  context.fillRect(0, 0, WIDTH, 3 * CQW);
  context.fillStyle = rubbed(0, HEIGHT, 0, HEIGHT - 3 * CQW);
  context.fillRect(0, HEIGHT - 3 * CQW, WIDTH, 3 * CQW);
};

/** Gaufrage à froid : le dessin s'enfonce dans la toile (ombre en haut, reflet en bas, fond plus sombre). */
const blind = (context: CanvasRenderingContext2D, draw: () => void): void => {
  const depth = 0.15 * CQW;
  for (const [shift, color] of [
    [depth, 'rgba(255, 255, 255, 0.10)'],
    [-depth, 'rgba(0, 0, 0, 0.55)'],
    [0, 'rgba(0, 0, 0, 0.28)'],
  ] as const) {
    context.save();
    context.translate(0, shift);
    context.strokeStyle = color;
    context.fillStyle = color;
    draw();
    context.restore();
  }
};

/** Une rosace : des pétales autour d'un bouton. */
const rosette = (context: CanvasRenderingContext2D, x: number, y: number, radius: number, petals = 8): void => {
  for (let petal = 0; petal < petals; petal++) {
    const angle = (petal / petals) * Math.PI * 2;
    context.beginPath();
    context.ellipse(
      x + Math.cos(angle) * radius * 0.55,
      y + Math.sin(angle) * radius * 0.55,
      radius * 0.45,
      radius * 0.18,
      angle,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.beginPath();
  context.arc(x, y, radius * 0.22, 0, Math.PI * 2);
  context.fill();
};

/** L'encadrement à froid (double filet, filet intérieur, rosaces aux coins, bandeaux) et le médaillon de l'éditeur. */
const blindPlate = (context: CanvasRenderingContext2D): void =>
  blind(context, () => {
    const outer = 4.7 * CQW;
    context.lineWidth = 0.6 * CQW;
    context.strokeRect(outer, outer, WIDTH - 2 * outer, HEIGHT - 2 * outer);
    context.lineWidth = 0.23 * CQW;
    context.strokeRect(outer + 1.4 * CQW, outer + 1.4 * CQW, WIDTH - 2 * outer - 2.8 * CQW, HEIGHT - 2 * outer - 2.8 * CQW);
    const inner = outer + 5.3 * CQW;
    context.lineWidth = 0.4 * CQW;
    context.strokeRect(inner, inner, WIDTH - 2 * inner, HEIGHT - 2 * inner);
    for (const x of [inner, WIDTH - inner]) for (const y of [inner, HEIGHT - inner]) rosette(context, x, y, 2.5 * CQW);
    context.lineWidth = 0.23 * CQW;
    for (const y of [25 * CQW, HEIGHT - 25 * CQW]) {
      context.beginPath();
      context.moveTo(23.4 * CQW, y);
      context.lineTo(WIDTH - 23.4 * CQW, y);
      context.stroke();
      rosette(context, WIDTH / 2, y, 1.7 * CQW, 6);
    }
    // Le médaillon : deux cercles, une couronne de feuilles, un cercle, une rosace au cœur.
    const [x, y] = [WIDTH / 2, HEIGHT / 2];
    for (const [radius, width] of [
      [16.2, 0.6],
      [15, 0.3],
      [9.7, 0.4],
      [7.8, 0.23],
    ]) {
      context.lineWidth = width * CQW;
      context.beginPath();
      context.arc(x, y, radius * CQW, 0, Math.PI * 2);
      context.stroke();
    }
    for (let leaf = 0; leaf < 28; leaf++) {
      const angle = (leaf / 28) * Math.PI * 2;
      context.beginPath();
      context.ellipse(
        x + Math.cos(angle) * 12.5 * CQW,
        y + Math.sin(angle) * 12.5 * CQW,
        1.4 * CQW,
        0.55 * CQW,
        angle + Math.PI / 3,
        0,
        Math.PI * 2,
      );
      context.fill();
    }
    rosette(context, x, y, 6.2 * CQW, 12);
  });

/** Un plat : la toile, l'encadrement et le médaillon à froid ; ni or ni titre (il n'est qu'au dos). */
const plate = (seed: string): THREE.CanvasTexture =>
  board(CLOTH, CLOTH_EDGE, (context) => {
    cloth(context, seed);
    blindPlate(context);
  });

export const mobyDickFront = (): THREE.CanvasTexture => plate('moby:front');

/** Le plat arrière : le même gaufrage, comme sur l'original. */
export const mobyDickBack = (): THREE.CanvasTexture => plate('moby:back');

/**
 * Le dos : des filets dorés en haut et en bas, le titre couché dans un cartouche, une rosace, l'auteur,
 * l'éditeur au pied (à l'horizontale).
 */
export const mobyDickSpine = (thickness: number): THREE.CanvasTexture =>
  board(CLOTH, CLOTH_EDGE, (context) => {
    cloth(context, 'moby:spine');
    const { spine, author, publisher } = messages().rareBooks.mobyDick;
    // Dessiné sans déformation : `half` est la demi-largeur visible du dos.
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const half = WIDTH / 2 / stretch;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch, 1);
    const ink = gold(context, 2 * half);
    context.fillStyle = ink;
    context.strokeStyle = ink;
    const band = half * 0.8;
    for (const [y, weight] of [
      [5.3, 0.45],
      [7, 0.25],
      [103, 0.25],
      [104.7, 0.45],
    ])
      context.fillRect(-band, y * CQW, 2 * band, weight * CQW);
    // Le titre, de haut en bas, dans un cartouche mesuré sur lui.
    const vertical = (text: string, center: number, font: string, spacing: number): number => {
      context.font = font;
      context.letterSpacing = `${spacing}px`;
      const length = context.measureText(text).width;
      context.save();
      context.translate(0, center);
      context.rotate(Math.PI / 2);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, spacing / 2, 0);
      context.restore();
      context.letterSpacing = '0px';
      return length;
    };
    const center = 42 * CQW;
    const title = vertical(spine, center, `bold ${5.9 * CQW}px ${CASLON}`, 0.4 * CQW);
    context.lineWidth = 0.3 * CQW;
    context.strokeRect(-half * 0.7, center - title / 2 - 3.5 * CQW, 1.4 * half, title + 7 * CQW);
    const flower = center + title / 2 + 7.5 * CQW;
    rosette(context, 0, flower, 2.5 * CQW);
    // L'auteur commence juste sous la rosace (sa longueur mesurée d'abord).
    const authorFont = `${3.7 * CQW}px ${CASLON}`;
    context.font = authorFont;
    context.letterSpacing = `${0.6 * CQW}px`;
    const length = context.measureText(author).width;
    context.letterSpacing = '0px';
    vertical(author, flower + 5.5 * CQW + length / 2, authorFont, 0.6 * CQW);
    publisher.forEach((line, row) =>
      write(context, line, 0, (108 + row * 3.6) * CQW, {
        font: row ? `${2.2 * CQW}px ${CASLON}` : `bold ${2.7 * CQW}px ${CASLON}`,
        color: '#e3c27a',
        spacing: 0.15 * CQW,
      }),
    );
    context.restore();
  });

/** La page de titre de l'édition de New York (1851), ligne par ligne (y : ligne de base). */
export const mobyDickTitlePage = (context: CanvasRenderingContext2D): void => {
  const fonts: Record<string, [string, number, number]> = {
    big: [`bold 50px ${CASLON}`, 3, 50],
    whale: [`32px ${CASLON}`, 4, 32],
    or: [`20px ${FELL}`, 2, 20],
    by: [`14px ${FELL}`, 3, 14],
    name: [`24px ${CASLON}`, 2, 24],
    tiny: [`12px ${FELL}`, 2, 12],
    works: [`15px ${FELL}`, 0.5, 15],
    city: [`20px ${CASLON}`, 3, 20],
    publisher: [`17px ${CASLON}`, 1.5, 17],
    london: [`15px ${FELL_SC}`, 1, 15],
    year: [`18px ${CASLON}`, 2, 18],
  };
  for (const [y, kind, text] of messages().rareBooks.mobyDick.titlePage as [number, string, string][]) {
    if (kind === 'rule') {
      context.fillStyle = INK;
      context.fillRect(PAGE_CENTER - Number(text), y, 2 * Number(text), 1);
      continue;
    }
    const [font, spacing, size] = fonts[kind];
    write(context, text, PAGE_CENTER, y - size * 0.8, { font, color: INK, spacing });
  }
};
