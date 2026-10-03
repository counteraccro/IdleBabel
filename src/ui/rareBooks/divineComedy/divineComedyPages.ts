import { hashText, seeded } from '../../../core/random';
import { messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGE_CENTER } from '../draw';
import { rng } from '../arabianNights/arabianNightsOrnaments';
import { GARAMOND } from './divineComedyBinding';
import type { Paper } from '../../book/pageRender';

/**
 * Les pages de la Divine Comédie, d'après .ai/maquette-divine-comedie.html (y : lignes de base) : la page de
 * titre de l'édition Didier de 1863 (celle du texte), l'ouverture des chants (le nom du cantique au premier,
 * trois anneaux enlacés, « CHANT PREMIER », la lettrine rouge à filigranes bleus), la table, le papier.
 */
export const PAPER: Paper = ['#f4ecd8', '#ebdfc3', '#e3d4b2'];
export const INK = '#221c16';
const RED = '#a3271c';
const BLUE = '#2a4a8a';

/** Le texte : sa taille et son interligne (17 et 24 sur la maquette : trop grand pour que les 100 chants tiennent). */
export const BODY_SIZE = 16;
export const BODY_LINE = 21;

const print = (context: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, spacing = 0, color = INK): void => {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${spacing}px`;
  context.fillText(text, x, y);
  context.letterSpacing = '0px';
};

/** Le papier de la maquette : grain et rousseurs (toujours les mêmes pour une page). */
export const foxing = (context: CanvasRenderingContext2D, page: number): void => {
  const random = seeded(hashText(`divineComedy:paper:${page}`));
  const { width, height } = PAGE_TEXTURE;
  for (let speck = 0; speck < (width * height) / 120; speck++) {
    context.fillStyle = `rgba(110, 80, 30, ${random() * 0.07})`;
    context.fillRect(random() * width, random() * height, 1.5, 1.5);
  }
  for (let spot = 0; spot < 14; spot++) {
    context.fillStyle = `rgba(150, 100, 40, ${0.05 + random() * 0.08})`;
    context.beginPath();
    context.arc(random() * width, random() * height, 1 + random() * 3.5, 0, Math.PI * 2);
    context.fill();
  }
};

/** Les sortes de lignes de la page de titre : [taille, espacement, style]. */
const TITLE_FONTS: Record<string, [number, number, string]> = {
  names: [16, 3, ''],
  article: [18, 4, ''],
  title: [44, 3, ''],
  translated: [12, 3, ''],
  preface: [11.5, 1.5, ''],
  posthumous: [13, 2, ''],
  wish: [11, 1.5, 'italic'],
  editor: [13, 2, ''],
  edition: [12, 2, 'italic'],
  city: [20, 5, ''],
  bookshop: [12, 1.5, ''],
  publisher: [13, 1.5, ''],
  address: [10, 1.5, ''],
  year: [13, 2.5, ''],
};

/**
 * La page de titre de l'édition Didier (1863), d'après le fac-similé de Wikisource : sans la ligne du tome
 * (« I · INTRODUCTION — L'ENFER »), le livre du jeu ayant les trois cantiques ; la vignette de l'éditeur
 * devient les trois anneaux.
 */
export const divineComedyTitlePage = (context: CanvasRenderingContext2D): void => {
  for (const [y, kind, text] of messages().rareBooks.divineComedy.titlePage as [number, string, string][]) {
    if (kind === 'rule') {
      context.fillStyle = INK;
      context.fillRect(PAGE_CENTER - Number(text), y, 2 * Number(text), 1.3);
    } else if (kind === 'rings') rings(context, y);
    else {
      const [size, spacing, style] = TITLE_FONTS[kind];
      print(context, text, PAGE_CENTER, y, `${style} ${size}px ${GARAMOND}`.trim(), spacing);
    }
  }
};

/** Trois anneaux enlacés, un point de chaque côté : l'Enfer, le Purgatoire, le Paradis. */
const rings = (context: CanvasRenderingContext2D, y: number, radius = 9): void => {
  context.strokeStyle = INK;
  context.fillStyle = INK;
  context.lineWidth = 1.3;
  for (const dx of [-radius * 1.1, 0, radius * 1.1]) {
    context.beginPath();
    context.arc(PAGE_CENTER + dx, y, radius, 0, Math.PI * 2);
    context.stroke();
  }
  for (const dx of [-radius * 3, radius * 3]) {
    context.beginPath();
    context.arc(PAGE_CENTER + dx, y, 1.8, 0, Math.PI * 2);
    context.fill();
  }
};

/** Le premier chant d'un cantique (l'Enfer, le Purgatoire, le Paradis) : il porte le nom du cantique. */
const isFirstCanto = (label: string): boolean => label === messages().rareBooks.divineComedy.firstCanto;

/** Le haut de l'ouverture d'un chant : le nom du cantique au premier seulement, les anneaux, « CHANT PREMIER », un filet. */
export const divineComedyHead = (context: CanvasRenderingContext2D, title: string, label: string): void => {
  if (isFirstCanto(label)) print(context, title.toUpperCase(), PAGE_CENTER, 168, `500 34px ${GARAMOND}`, 8);
  rings(context, 206);
  print(context, label, PAGE_CENTER, 262, `500 19px ${GARAMOND}`, 4);
  context.fillStyle = INK;
  context.fillRect(PAGE_CENTER - 20, 286, 40, 1);
};

/** Un chant dans la table : « Chant deuxième » ; le premier d'un cantique avec son nom, « L’Enfer, chant premier ». */
export const divineComedyContentsName = (label: string, title: string): string => {
  const canto = label.charAt(0) + label.slice(1).toLowerCase();
  return isFirstCanto(label) ? `${title}, ${canto.toLowerCase()}` : canto;
};

/** La lettrine : un carré de trois lignes, moins le blanc sous la dernière. */
export const DROP_CAP = 3 * BODY_LINE - 4;

/**
 * La lettrine des manuscrits italiens : la lettre rouge dans un double cadre bleu, des filigranes bleus à la
 * plume (petites volutes) autour d'elle, une antenne qui descend dans la marge le long du cadre. Son haut :
 * 18 au-dessus de la 1re ligne de base.
 */
export const divineComedyDropCap = (context: CanvasRenderingContext2D, letter: string, x: number, baseline: number): void => {
  const [size, y] = [DROP_CAP, baseline - 18];
  context.save();
  context.strokeStyle = BLUE;
  context.lineWidth = 0.9;
  context.lineCap = 'round';
  /** Une petite volute : une spirale qui s'enroule sur un tour et demi. */
  const curl = (cx: number, cy: number, radius: number, turn: number): void => {
    context.beginPath();
    for (let t = 0; t <= 1; t += 0.04) {
      const [angle, reach] = [turn * t * Math.PI * 3, radius * (1 - t * 0.8)];
      context.lineTo(cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach);
    }
    context.stroke();
  };
  context.strokeRect(x, y, size, size);
  context.strokeRect(x + 3, y + 3, size - 6, size - 6);
  const random = rng(14);
  for (let flourish = 0; flourish < 26; flourish++)
    curl(x + 8 + random() * (size - 16), y + 8 + random() * (size - 16), 3 + random() * 3, random() < 0.5 ? 1 : -1);
  // La lettre sur une réserve de papier, pour que les volutes ne la traversent pas.
  const font = `500 ${size * 0.9}px ${GARAMOND}`;
  context.font = font;
  const width = context.measureText(letter).width;
  context.fillStyle = PAPER[0];
  context.fillRect(x + (size - width) / 2 - 1, y + size * 0.16, width + 2, size * 0.7);
  print(context, letter, x + size / 2, y + size * 0.82, font, 0, RED);
  // L'antenne, dans la marge : elle s'arrête au bas du cadre (les numéros des tercets viennent dessous).
  const margin = x - 14;
  context.beginPath();
  context.moveTo(x, y + 10);
  context.quadraticCurveTo(margin, y + 10, margin, y + 30);
  context.lineTo(margin, y + size);
  context.stroke();
  for (let flourish = 0; flourish < 3; flourish++) curl(margin + (flourish % 2 ? -5 : 5), y + 30 + flourish * 16, 4, flourish % 2 ? 1 : -1);
  context.restore();
};
