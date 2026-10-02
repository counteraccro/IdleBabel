import '@fontsource/libre-caslon-text/400.css';
import '@fontsource/libre-caslon-text/400-italic.css';
import '@fontsource/libre-caslon-text/700.css';
import { messages } from '../../../i18n';
import { hashText, seeded } from '../../../core/random';
import { canvasTexture } from '../../book3d/textures';
import { HEIGHT, PAGE_CENTER, TITLE, WIDTH, board, write } from '../draw';
import type * as THREE from 'three';

/** Le chagrin noir des Bibles de famille du début du XXe siècle, et son or. */
export const LEATHER = '#2a2724';
const LEATHER_EDGE = '#0c0b0a';
export const CASLON = "'Libre Caslon Text', Georgia, serif";
export const INK = '#221c16';

export const loadBibleFonts = (): Promise<unknown> =>
  Promise.all(
    [`40px ${CASLON}`, `italic 40px ${CASLON}`, `bold 40px ${CASLON}`, `bold 40px ${TITLE}`].map((font) => document.fonts.load(font)),
  );

/** Les mesures de la maquette validée (.ai/maquette-bible.html, plats de 640 × 800) mises à l'échelle des textures. */
const K = WIDTH / 640;

const gold = (context: CanvasRenderingContext2D, from: number, to: number): CanvasGradient => {
  const gradient = context.createLinearGradient(from, 0, to, 0);
  gradient.addColorStop(0, '#8a6a2c');
  gradient.addColorStop(0.35, '#f2d68e');
  gradient.addColorStop(0.55, '#c9a24f');
  gradient.addColorStop(0.8, '#f2d68e');
  gradient.addColorStop(1, '#8a6a2c');
  return gradient;
};

/** Du texte doré (un dégradé : `write` ne prend qu'une couleur unie), posé sur sa ligne de base. */
const gilt = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  ink: CanvasGradient,
  spacing: number,
): void => {
  context.save();
  context.font = font;
  context.letterSpacing = `${spacing}px`;
  context.fillStyle = ink;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillText(text, x, y);
  context.restore();
};

/**
 * Le chagrin : la teinte (plus sombre vers les bords), de petits bosselages serrés (reflet en haut à gauche,
 * ombre en bas à droite), l'usure des bords.
 */
const leather = (context: CanvasRenderingContext2D, color: string, dark: string, seed: string): void => {
  const [width, height] = [context.canvas.width, context.canvas.height];
  const shade = context.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.1,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75,
  );
  shade.addColorStop(0, color);
  shade.addColorStop(1, dark);
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);
  const random = seeded(hashText(seed));
  for (let pebble = 0; pebble < (width * height) / (26 * K * K); pebble++) {
    const [x, y, radius] = [random() * width, random() * height, (1.2 + random() * 2.2) * K];
    context.fillStyle = 'rgba(255, 255, 255, 0.05)';
    context.beginPath();
    context.arc(x - 0.6 * K, y - 0.6 * K, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(0, 0, 0, 0.25)';
    context.beginPath();
    context.arc(x + 0.6 * K, y + 0.6 * K, radius * 0.8, 0, Math.PI * 2);
    context.fill();
  }
  const rubbed = (x0: number, y0: number, x1: number, y1: number, alpha: number): CanvasGradient => {
    const gradient = context.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, `rgba(225, 195, 150, ${alpha})`);
    gradient.addColorStop(1, 'rgba(225, 195, 150, 0)');
    return gradient;
  };
  const [band, side] = [26 * K, 20 * K];
  context.fillStyle = rubbed(0, 0, 0, band, 0.18);
  context.fillRect(0, 0, width, band);
  context.fillStyle = rubbed(0, height, 0, height - band, 0.18);
  context.fillRect(0, height - band, width, band);
  context.fillStyle = rubbed(width, 0, width - side, 0, 0.14);
  context.fillRect(width - side, 0, side, height);
};

/** Le double filet à froid, enfoncé dans le cuir (reflet en bas, ombre en haut, fond plus sombre). */
const blindFrame = (context: CanvasRenderingContext2D): void => {
  for (const [shift, color] of [
    [K, 'rgba(255, 225, 180, 0.10)'],
    [-K, 'rgba(0, 0, 0, 0.55)'],
    [0, 'rgba(0, 0, 0, 0.30)'],
  ] as const) {
    context.save();
    context.translate(0, shift);
    context.strokeStyle = color;
    context.lineWidth = 2.5 * K;
    context.strokeRect(28 * K, 28 * K, WIDTH - 56 * K, HEIGHT - 56 * K);
    context.lineWidth = 1.2 * K;
    context.strokeRect(36 * K, 36 * K, WIDTH - 72 * K, HEIGHT - 72 * K);
    context.restore();
  }
};

/** Le plat : chagrin noir, double filet à froid, le titre doré au milieu. */
export const bibleFront = (): THREE.CanvasTexture =>
  board(LEATHER, LEATHER_EDGE, (context) => {
    leather(context, LEATHER, LEATHER_EDGE, 'bible:front');
    blindFrame(context);
    const [small, big] = messages().rareBooks.bible.coverTitle;
    const ink = gold(context, 120 * K, 520 * K);
    gilt(context, small, WIDTH / 2, 300 * K, `bold ${34 * K}px ${TITLE}`, ink, 6 * K);
    gilt(context, big, WIDTH / 2, 368 * K, `bold ${62 * K}px ${TITLE}`, ink, 10 * K);
    context.fillStyle = ink;
    context.fillRect(WIDTH / 2 - 60 * K, 398 * K, 120 * K, 2 * K);
  });

/** Le plat arrière : le même cuir, le même filet, rien d'autre. */
export const bibleBack = (): THREE.CanvasTexture =>
  board(LEATHER, LEATHER_EDGE, (context) => {
    leather(context, LEATHER, LEATHER_EDGE, 'bible:back');
    blindFrame(context);
  });

/**
 * Le dos (la maquette : 130 de large, 800 de haut) : quatre nerfs soulignés d'or, le titre doré entre eux, à
 * l'horizontale, une ligne par mot, la ville au pied.
 */
export const bibleSpine = (thickness: number): THREE.CanvasTexture =>
  board(LEATHER, LEATHER_EDGE, (context) => {
    leather(context, '#2c2926', '#0e0d0c', 'bible:spine');
    const { spine, city } = messages().rareBooks.bible;
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const half = WIDTH / 2 / stretch;
    /** Une abscisse de la maquette (0 à 130, milieu à 65) sur le vrai dos. */
    const across = (x: number): number => ((x - 65) / 65) * half;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch, 1);
    const ink = gold(context, -half, half);
    for (const y of [120, 220, 560, 660].map((value) => value * K)) {
      const relief = context.createLinearGradient(0, y - 9 * K, 0, y + 9 * K);
      relief.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
      relief.addColorStop(0.4, 'rgba(255, 255, 255, 0.12)');
      relief.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
      context.fillStyle = relief;
      context.fillRect(-half, y - 9 * K, 2 * half, 18 * K);
      context.fillStyle = ink;
      context.fillRect(across(10), y - 12 * K, across(120) - across(10), 1.5 * K);
      context.fillRect(across(10), y + 11 * K, across(120) - across(10), 1.5 * K);
    }
    // Les mots du titre aux places de la maquette (« LA », « SAINTE », puis « BIBLE », plus grand).
    const rows = [300, 330, 366];
    spine.forEach((word, row) => {
      const size = (row === spine.length - 1 ? 24 : 18) * K;
      gilt(context, word, 0, rows[row] * K, `bold ${size}px ${TITLE}`, ink, 2 * K);
    });
    context.fillStyle = ink;
    context.fillRect(across(43), 392 * K, across(87) - across(43), 1.5 * K);
    gilt(context, city, 0, 740 * K, `bold ${12 * K}px ${TITLE}`, ink, 2 * K);
    context.restore();
  });

/**
 * Les tranches dorées : un or bruni, plus clair par endroits le long de la tranche, les feuilles à peine
 * visibles, plus sombre contre les plats (même repère que edgeTexture : les feuilles empilées en hauteur).
 */
export const giltEdge = (): THREE.CanvasTexture => {
  const node = document.createElement('canvas');
  node.width = 64;
  node.height = 512;
  const context = node.getContext('2d')!;
  const burnish = context.createLinearGradient(0, 0, node.width, 0);
  burnish.addColorStop(0, '#a07e34');
  burnish.addColorStop(0.3, '#d8b45e');
  burnish.addColorStop(0.5, '#f0d488');
  burnish.addColorStop(0.7, '#c9a24f');
  burnish.addColorStop(1, '#8a6a2c');
  context.fillStyle = burnish;
  context.fillRect(0, 0, node.width, node.height);
  const random = seeded(hashText('bible:edge'));
  for (let y = 0; y < node.height; y += 3) {
    context.fillStyle = `rgba(90, 62, 18, ${0.1 + random() * 0.12})`;
    context.fillRect(0, y, node.width, 0.8);
  }
  const shade = context.createLinearGradient(0, 0, 0, node.height);
  shade.addColorStop(0, 'rgba(50, 30, 5, 0.5)');
  shade.addColorStop(0.12, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(0.88, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(50, 30, 5, 0.55)');
  context.fillStyle = shade;
  context.fillRect(0, 0, node.width, node.height);
  return canvasTexture(node);
};

/**
 * La vraie page de titre de l'édition (Segond, Paris 1910 ; King James, Oxford 1910), ligne par ligne, aux
 * places de la maquette (y : haut de la ligne).
 */
export const bibleTitlePage = (context: CanvasRenderingContext2D): void => {
  context.strokeStyle = INK;
  context.lineWidth = 1;
  context.strokeRect(60, 60, 520, 680);
  context.strokeRect(66, 66, 508, 668);
  const fonts: Record<string, [string, number]> = {
    the: [`22px ${CASLON}`, 6],
    big: [`bold 50px ${CASLON}`, 4],
    small: [`14px ${CASLON}`, 3],
    mid: [`19px ${CASLON}`, 2],
    tiny: [`13px ${CASLON}`, 1.5],
    by: [`13px ${CASLON}`, 3],
    name: [`22px ${CASLON}`, 3],
    italic: [`italic 16px ${CASLON}`, 0],
    edition: [`15px ${CASLON}`, 3],
    city: [`20px ${CASLON}`, 4],
    street: [`13px ${CASLON}`, 2],
    year: [`17px ${CASLON}`, 3],
  };
  for (const [y, kind, text] of messages().rareBooks.bible.titlePage as [number, string, string][]) {
    if (kind === 'rule') {
      context.fillStyle = INK;
      context.fillRect(PAGE_CENTER - Number(text), y, 2 * Number(text), 1);
      continue;
    }
    const [font, spacing] = fonts[kind];
    write(context, text, PAGE_CENTER, y, { font, color: INK, spacing });
  }
};
