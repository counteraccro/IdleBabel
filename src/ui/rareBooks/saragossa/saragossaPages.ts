import { hashText, seeded } from '../../../core/random';
import { messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGE_CENTER } from '../draw';
import { DIDOT } from './saragossaBinding';
import { fleuron, rosette } from './saragossaOrnaments';
import type { Paper } from '../../book/pageRender';

/**
 * Les pages du Manuscrit trouvé à Saragosse, d'après .ai/maquette-saragosse.html (y : lignes de base) : la
 * page de titre de Gide fils (1814), l'ouverture des journées comme dans l'édition (un bandeau de fleurons, le
 * titre du livre à la première, la journée), le papier.
 */
export const PAPER: Paper = ['#f4ecd8', '#ebdfc3', '#e3d4b2'];
export const INK = '#1e1915';

/** Le texte : sa taille et son interligne (ceux de la maquette). */
export const BODY_SIZE = 17;
export const BODY_LINE = 24;

const print = (context: CanvasRenderingContext2D, text: string, x: number, y: number, font: string, spacing = 0): void => {
  context.font = font;
  context.fillStyle = INK;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${spacing}px`;
  context.fillText(text, x, y);
  context.letterSpacing = '0px';
};

/** Un filet centré, de demi-largeur `half`. */
const rule = (context: CanvasRenderingContext2D, y: number, half: number): void => {
  context.fillStyle = INK;
  context.fillRect(PAGE_CENTER - half, y, 2 * half, 1.3);
};

/** Le papier de la maquette : grain et rousseurs (toujours les mêmes pour une page). */
export const foxing = (context: CanvasRenderingContext2D, page: number): void => {
  const random = seeded(hashText(`saragossa:paper:${page}`));
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

/** Les sortes de lignes de la page de titre : [taille, espacement, graisse]. */
const TITLE_FONTS: Record<string, [number, number, number]> = {
  title: [52, 3, 500],
  of: [18, 4, 400],
  hero: [28, 2, 400],
  printer: [10.5, 1.5, 400],
  city: [24, 5, 400],
  publisher: [13, 1.5, 400],
  address: [10.5, 1.5, 400],
  year: [16, 3, 400],
};

/**
 * La page de titre de Gide fils (1814), d'après le fac-similé de Wikisource : sans « TOME PREMIER » (le livre
 * du jeu a les trois tomes), la marque de l'imprimeur Jacob devient un petit fleuron.
 */
export const saragossaTitlePage = (context: CanvasRenderingContext2D): void => {
  for (const [y, kind, text] of messages().rareBooks.saragossa.titlePage as [number, string, string][]) {
    if (kind === 'rule') rule(context, y, Number(text));
    else if (kind === 'fleuron') fleuron(context, PAGE_CENTER, y, 1.6, INK);
    else {
      const [size, spacing, weight] = TITLE_FONTS[kind];
      print(context, text, PAGE_CENTER, y, `${weight} ${size}px ${DIDOT}`, spacing);
    }
  }
};

/** Le bandeau : une rangée de fleurons typographiques (rosaces et losanges) entre deux doubles filets. */
const headband = (context: CanvasRenderingContext2D, y: number): void => {
  const { width } = PAGE_TEXTURE;
  context.fillStyle = INK;
  context.fillRect(110, y - 16, width - 220, 1.2);
  context.fillRect(110, y + 16, width - 220, 1.2);
  context.fillRect(110, y - 13, width - 220, 0.5);
  context.fillRect(110, y + 13, width - 220, 0.5);
  for (let x = 124; x <= width - 124; x += 24) {
    if ((x - 124) % 48 === 0) rosette(context, x, y, 6);
    else {
      context.beginPath();
      context.moveTo(x, y - 5);
      context.lineTo(x + 4, y);
      context.lineTo(x, y + 5);
      context.lineTo(x - 4, y);
      context.closePath();
      context.fill();
    }
  }
};

/**
 * Le haut de l'ouverture d'une journée (ou de l'Avertissement) : le bandeau ; à la première journée, le titre
 * du livre et un filet ; puis la journée (« PREMIÈRE JOURNÉE. »).
 */
export const saragossaHead = (context: CanvasRenderingContext2D, _title: string, label: string): void => {
  const { firstDay, book } = messages().rareBooks.saragossa;
  headband(context, 104);
  if (label === firstDay) {
    const [title, of, hero] = book as string[];
    print(context, title, PAGE_CENTER, 178, `700 34px ${DIDOT}`, 3);
    print(context, of, PAGE_CENTER, 210, `400 14px ${DIDOT}`, 3);
    print(context, hero, PAGE_CENTER, 246, `400 20px ${DIDOT}`, 2);
    rule(context, 270, 22);
  }
  print(context, `${label}.`, PAGE_CENTER, 310, `400 16px ${DIDOT}`, 3);
};

/** Le folio de l'édition : entre parenthèses, en tête de page (« ( 2 ) »). */
export const saragossaFolio = (page: number): string => `( ${page} )`;
