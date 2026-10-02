import '@fontsource/libre-caslon-text/400.css';
import '@fontsource/libre-caslon-text/400-italic.css';
import '@fontsource/libre-caslon-text/700.css';
import { messages } from '../../../i18n';
import { hashText, seeded } from '../../../core/random';
import { canvasTexture } from '../../book3d/textures';
import { CQW, HEIGHT, PAGE_CENTER, TITLE, WIDTH, board, write } from '../draw';
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

const gold = (context: CanvasRenderingContext2D, from: number, to: number): CanvasGradient => {
  const gradient = context.createLinearGradient(from, 0, to, 0);
  gradient.addColorStop(0, '#8a6a2c');
  gradient.addColorStop(0.35, '#f2d68e');
  gradient.addColorStop(0.55, '#c9a24f');
  gradient.addColorStop(0.8, '#f2d68e');
  gradient.addColorStop(1, '#8a6a2c');
  return gradient;
};

/** Le grain du chagrin : de petits bosselages serrés (reflet en haut à gauche, ombre en bas à droite), et l'usure des bords. */
const pebbles = (context: CanvasRenderingContext2D, seed: string): void => {
  const random = seeded(hashText(seed));
  for (let pebble = 0; pebble < (WIDTH * HEIGHT) / 26; pebble++) {
    const [x, y, radius] = [random() * WIDTH, random() * HEIGHT, 1.2 + random() * 2.2];
    context.fillStyle = 'rgba(255, 255, 255, 0.05)';
    context.beginPath();
    context.arc(x - 0.6, y - 0.6, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(0, 0, 0, 0.25)';
    context.beginPath();
    context.arc(x + 0.6, y + 0.6, radius * 0.8, 0, Math.PI * 2);
    context.fill();
  }
  const rubbed = (x0: number, y0: number, x1: number, y1: number): CanvasGradient => {
    const gradient = context.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, 'rgba(225, 195, 150, 0.12)');
    gradient.addColorStop(1, 'rgba(225, 195, 150, 0)');
    return gradient;
  };
  context.fillStyle = rubbed(0, 0, 0, 3 * CQW);
  context.fillRect(0, 0, WIDTH, 3 * CQW);
  context.fillStyle = rubbed(0, HEIGHT, 0, HEIGHT - 3 * CQW);
  context.fillRect(0, HEIGHT - 3 * CQW, WIDTH, 3 * CQW);
};

/** Le double filet à froid, enfoncé dans le cuir (ombre en haut, reflet en bas). */
const blindFrame = (context: CanvasRenderingContext2D): void => {
  for (const [shift, color] of [
    [0.15 * CQW, 'rgba(255, 225, 180, 0.08)'],
    [-0.15 * CQW, 'rgba(0, 0, 0, 0.6)'],
    [0, 'rgba(0, 0, 0, 0.3)'],
  ] as const) {
    context.save();
    context.translate(0, shift);
    context.strokeStyle = color;
    context.lineWidth = 0.4 * CQW;
    context.strokeRect(4.4 * CQW, 4.4 * CQW, WIDTH - 8.8 * CQW, HEIGHT - 8.8 * CQW);
    context.lineWidth = 0.2 * CQW;
    context.strokeRect(5.6 * CQW, 5.6 * CQW, WIDTH - 11.2 * CQW, HEIGHT - 11.2 * CQW);
    context.restore();
  }
};

/** Le plat : chagrin noir, double filet à froid, le titre doré au milieu. */
export const bibleFront = (): THREE.CanvasTexture =>
  board(LEATHER, LEATHER_EDGE, (context) => {
    pebbles(context, 'bible:front');
    blindFrame(context);
    const [small, big] = messages().rareBooks.bible.coverTitle;
    const ink = gold(context, 18 * CQW, 82 * CQW);
    write(context, small, WIDTH / 2, 34 * CQW, { font: `bold ${6.6 * CQW}px ${TITLE}`, color: '#d9b25a', spacing: 1.2 * CQW });
    // Le grand mot doré (un dégradé : `write` ne prend qu'une couleur unie).
    context.save();
    context.font = `bold ${12 * CQW}px ${TITLE}`;
    context.letterSpacing = `${2 * CQW}px`;
    context.fillStyle = ink;
    context.textAlign = 'center';
    context.textBaseline = 'alphabetic';
    context.fillText(big, WIDTH / 2 + CQW, 57 * CQW);
    context.restore();
    context.fillStyle = ink;
    context.fillRect(WIDTH / 2 - 9.4 * CQW, 62 * CQW, 18.8 * CQW, 0.3 * CQW);
  });

/** Le plat arrière : le même cuir, le même filet, rien d'autre. */
export const bibleBack = (): THREE.CanvasTexture =>
  board(LEATHER, LEATHER_EDGE, (context) => {
    pebbles(context, 'bible:back');
    blindFrame(context);
  });

/** Le dos : quatre nerfs soulignés d'or, le titre doré entre eux (à l'horizontale), la ville au pied. */
export const bibleSpine = (thickness: number): THREE.CanvasTexture =>
  board(LEATHER, LEATHER_EDGE, (context) => {
    pebbles(context, 'bible:spine');
    const { spine, city } = messages().rareBooks.bible;
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const half = WIDTH / 2 / stretch;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch, 1);
    const ink = gold(context, -half, half);
    for (const y of [15, 27.5, 70, 82.5].map((value) => value * CQW)) {
      const relief = context.createLinearGradient(0, y - 1.4 * CQW, 0, y + 1.4 * CQW);
      relief.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
      relief.addColorStop(0.4, 'rgba(255, 255, 255, 0.12)');
      relief.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
      context.fillStyle = relief;
      context.fillRect(-half, y - 1.4 * CQW, 2 * half, 2.8 * CQW);
      context.fillStyle = ink;
      context.fillRect(-half * 0.85, y - 1.9 * CQW, 1.7 * half, 0.25 * CQW);
      context.fillRect(-half * 0.85, y + 1.65 * CQW, 1.7 * half, 0.25 * CQW);
    }
    // Le titre, une ligne par mot ; le dernier (BIBLE) plus grand, réduit au besoin à la largeur du dos.
    spine.forEach((word, row) => {
      const last = row === spine.length - 1;
      const size = (last ? 4.2 : 3.2) * CQW;
      context.font = `bold ${size}px ${TITLE}`;
      const fit = Math.min(size, (size * half * 1.5) / context.measureText(word).width);
      write(context, word, 0, (36 + row * 5.2) * CQW, { font: `bold ${fit}px ${TITLE}`, color: '#e0bb66', spacing: 0.3 * CQW });
    });
    context.fillStyle = ink;
    context.fillRect(-half * 0.35, (37.5 + spine.length * 5.2) * CQW, 0.7 * half, 0.25 * CQW);
    write(context, city, 0, 91 * CQW, { font: `bold ${2.3 * CQW}px ${TITLE}`, color: '#e0bb66', spacing: 0.3 * CQW });
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

/** La vraie page de titre de l'édition (Segond, Paris 1910 ; King James, Oxford 1910), ligne par ligne (y : ligne de base). */
export const bibleTitlePage = (context: CanvasRenderingContext2D): void => {
  context.strokeStyle = INK;
  context.lineWidth = 1;
  context.strokeRect(60, 60, 520, 680);
  context.strokeRect(66, 66, 508, 668);
  const fonts: Record<string, [string, number, number]> = {
    the: [`22px ${CASLON}`, 6, 22],
    big: [`bold 50px ${CASLON}`, 4, 50],
    small: [`14px ${CASLON}`, 3, 14],
    mid: [`19px ${CASLON}`, 2, 19],
    tiny: [`13px ${CASLON}`, 1.5, 13],
    name: [`22px ${CASLON}`, 3, 22],
    italic: [`italic 16px ${CASLON}`, 0, 16],
    city: [`20px ${CASLON}`, 4, 20],
    year: [`17px ${CASLON}`, 3, 17],
  };
  for (const [y, kind, text] of messages().rareBooks.bible.titlePage as [number, string, string][]) {
    if (kind === 'rule') {
      context.fillStyle = INK;
      context.fillRect(PAGE_CENTER - Number(text), y, 2 * Number(text), 1);
      continue;
    }
    const [font, spacing, size] = fonts[kind];
    write(context, text, PAGE_CENTER, y - size * 0.8, { font, color: INK, spacing });
  }
};
