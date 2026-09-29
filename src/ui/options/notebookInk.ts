import '@fontsource/nothing-you-could-do/400.css';
import { HAND, hash } from '../strangeBook/pageItems';
import { cssBaseline } from '../book/pageRender';
import { GRID, MARGIN, TEXT_LEFT, TEXT_RIGHT } from './notebookPaper';

/** Écriture du chercheur : stylo bille bleu pour les réglages, crayon pour ses remarques. */
export const PEN_FONT = "'Nothing You Could Do', cursive";
const PEN = '#243e86';
const RED_PEN = '#b0302a';
const PENCIL = '#5d584f';

/** Hauteur d'une ligne au stylo (deux carreaux) et d'une ligne au crayon, plus serrée. */
const PEN_LINE = 2 * GRID;
const PENCIL_LINE = 1.5 * GRID;

/** Zone cliquable de la page (repère de la texture) et ce qu'elle fait. */
export interface Zone {
  x: number;
  y: number;
  width: number;
  height: number;
  act: () => void;
}

export const zoneAt = (zones: Zone[], x: number, y: number): Zone | undefined =>
  zones.find((zone) => x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height);

type Point = [number, number];

/**
 * Plume qui écrit une page du cahier de haut en bas, ligne après ligne, calée sur les carreaux. Elle
 * dessine sur `context` et relève les zones cliquables : la même écriture sert à dessiner la page et à
 * savoir ce qu'un clic y touche. Chaque trait tire son tremblement de la page et de son rang (graine
 * fixe) : cocher une case ne fait pas bouger le reste de la page.
 */
export const createWriter = (context: CanvasRenderingContext2D, page: number) => {
  const zones: Zone[] = [];
  /** Haut de la prochaine ligne. */
  let top = 4 * GRID;
  let item = 0;
  /** Nombre entre -1 et 1, toujours le même pour ce trait de cette page. */
  const wobble = (k: number): number => ((hash(page, item, k) % 20001) - 10000) / 10000;

  /** Un trait de stylo à main levée passant par ces points. */
  const stroke = (points: Point[], color: string, width = 1.8, shake = 1): void => {
    context.strokeStyle = color;
    context.lineWidth = width;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    points.forEach(([x, y], i) => {
      const [dx, dy] = [wobble(10 + 2 * i) * shake, wobble(11 + 2 * i) * shake];
      if (i === 0) context.moveTo(x + dx, y + dy);
      else context.lineTo(x + dx, y + dy);
    });
    context.stroke();
  };

  /** Texte posé à gauche en `x`, dans la ligne qui commence à `lineTop`, un peu de travers. */
  const write = (text: string, x: number, lineTop: number, font: string, color: string, lineHeight: number): number => {
    context.font = font;
    context.fillStyle = color;
    context.textAlign = 'left';
    context.textBaseline = 'alphabetic';
    const baseline = cssBaseline(context, lineTop, lineHeight);
    context.save();
    context.translate(x, baseline);
    context.rotate(wobble(1) * 0.012);
    context.fillText(text, 0, 0);
    context.restore();
    return context.measureText(text).width;
  };

  /** Coupe un texte en lignes qui tiennent dans `width`. */
  const wrap = (text: string, font: string, width: number): string[] => {
    context.font = font;
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (line && context.measureText(next).width > width) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  };

  const pen = (size: number): string => `${size}px ${PEN_FONT}`;
  const pencil = (size: number): string => `${size}px ${HAND}`;

  /** Paragraphe au crayon, à partir de `x` ; renvoie sa hauteur. */
  const paragraph = (text: string, x: number, lineTop: number): number => {
    const lines = wrap(text, pencil(23), TEXT_RIGHT - x);
    lines.forEach((line, i) => {
      item++;
      write(line, x, lineTop + i * PENCIL_LINE, pencil(23), PENCIL, PENCIL_LINE);
    });
    return lines.length * PENCIL_LINE;
  };

  return {
    zones,
    /** Titre du cahier, souligné de deux traits. */
    title: (text: string): void => {
      item++;
      const width = write(text, TEXT_LEFT, top, pen(46), PEN, 4 * GRID);
      const y = top + 4 * GRID - 4;
      stroke([[TEXT_LEFT - 4, y], [TEXT_LEFT + width * 0.5, y + 1.5], [TEXT_LEFT + width + 8, y - 1]], PEN, 2);
      item++;
      stroke([[TEXT_LEFT + 6, y + 6], [TEXT_LEFT + width * 0.6, y + 7], [TEXT_LEFT + width + 2, y + 4]], PEN, 1.6);
      top += 6 * GRID;
    },
    /** Titre d'une partie, souligné. */
    heading: (text: string): void => {
      item++;
      const width = write(text, TEXT_LEFT, top, pen(32), PEN, PEN_LINE);
      const y = top + PEN_LINE - 3;
      item++;
      stroke([[TEXT_LEFT - 2, y], [TEXT_LEFT + width / 2, y + 1], [TEXT_LEFT + width + 4, y - 0.5]], PEN, 1.7);
      top += PEN_LINE + GRID;
    },
    /** Case dessinée à la main, cochée d'une croix ; l'explication au crayon dessous. Un clic la coche ou la décoche. */
    toggle: (label: string, hint: string, checked: boolean, act: () => void): void => {
      item++;
      const start = top;
      // Case d'un carreau, un peu plus grande, posée sur la ligne.
      const [x, y, size] = [TEXT_LEFT, top + GRID - 2, GRID + 2];
      stroke([[x, y], [x + size, y + 0.5], [x + size - 0.5, y + size], [x + 0.5, y + size + 0.5], [x, y - 1]], PEN, 1.6, 0.8);
      if (checked) {
        item++;
        // Croix appuyée, qui déborde de la case : tracée vite.
        stroke([[x - 3, y - 4], [x + size / 2, y + size / 2 + 1], [x + size + 4, y + size + 3]], PEN, 2.4, 1.5);
        item++;
        stroke([[x + size + 3, y - 5], [x + size / 2 + 1, y + size / 2], [x - 2, y + size + 4]], PEN, 2.4, 1.5);
      }
      item++;
      write(label, TEXT_LEFT + 2 * GRID, top, pen(24), PEN, PEN_LINE);
      top += PEN_LINE;
      top += paragraph(hint, TEXT_LEFT + 2 * GRID, top) + GRID;
      zones.push({ x: TEXT_LEFT - GRID / 2, y: start, width: TEXT_RIGHT - TEXT_LEFT + GRID / 2, height: top - start - GRID, act });
    },
    /** Choix sur une ligne (langues) : le choisi est entouré. */
    choices: (options: { label: string; active: boolean; act: () => void }[]): void => {
      let x = TEXT_LEFT + GRID;
      for (const option of options) {
        item++;
        const width = write(option.label, x, top, pen(28), PEN, PEN_LINE);
        if (option.active) {
          // Entouré d'un trait qui fait un peu plus d'un tour, sans se refermer tout à fait.
          const [cx, cy, rx, ry] = [x + width / 2, top + PEN_LINE / 2 + 2, width / 2 + 14, PEN_LINE / 2 + 5];
          const points: Point[] = [];
          for (let a = -2.4; a < -2.4 + Math.PI * 2.25; a += 0.2) points.push([cx + rx * Math.cos(a) * (1 + a * 0.012), cy + ry * Math.sin(a)]);
          item++;
          stroke(points, PEN, 1.6, 1.2);
        }
        zones.push({ x: x - 10, y: top, width: width + 20, height: PEN_LINE, act: option.act });
        x += width + 3 * GRID;
      }
      top += PEN_LINE + GRID;
    },
    /** Lien écrit au stylo (rouge : dangereux), précédé d'une flèche. */
    link: (text: string, act: () => void, danger = false): void => {
      item++;
      const color = danger ? RED_PEN : PEN;
      const y = top + PEN_LINE / 2 + 3;
      stroke([[TEXT_LEFT, y], [TEXT_LEFT + 22, y]], color, 1.8);
      item++;
      stroke([[TEXT_LEFT + 14, y - 6], [TEXT_LEFT + 23, y], [TEXT_LEFT + 14, y + 6]], color, 1.8);
      item++;
      const width = write(text, TEXT_LEFT + 2 * GRID, top, pen(24), color, PEN_LINE);
      zones.push({ x: TEXT_LEFT - GRID / 2, y: top, width: width + 3 * GRID, height: PEN_LINE, act });
      top += PEN_LINE;
    },
    /** Remarque au crayon, sur toute la largeur. */
    note: (text: string): void => {
      top += paragraph(text, TEXT_LEFT, top);
    },
    /** Saute des carreaux. */
    skip: (rows: number): void => {
      top += rows * GRID;
    },
    /**
     * Annotation au crayon dans la marge, écrite de bas en haut le long de la ligne rouge, vers `at`
     * (part de la hauteur de la page).
     */
    margin: (text: string, at: number): void => {
      item++;
      context.save();
      context.font = pencil(23);
      const width = context.measureText(text).width;
      const lines = width > 520 ? wrap(text, pencil(23), 520) : [text];
      context.translate(MARGIN / 2 + (lines.length - 1) * 12 + wobble(2) * 4, 800 * at);
      context.rotate(-Math.PI / 2 + wobble(3) * 0.03);
      context.fillStyle = PENCIL;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      lines.forEach((line, i) => context.fillText(line, 0, i * 24));
      context.restore();
    },
    /** Quelques signes en travers de la marge. */
    scribble: (text: string, at: number): void => {
      item++;
      context.save();
      context.font = pencil(26);
      context.translate(MARGIN / 2, 800 * at);
      context.rotate(wobble(4) * 0.2);
      context.fillStyle = PENCIL;
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(text, 0, 0);
      context.restore();
    },
    /** Croquis (image déjà tracée) de côté `size`, centré en (x, y), un peu tourné. */
    sketch: (image: CanvasImageSource, x: number, y: number, size: number): void => {
      item++;
      context.save();
      context.globalAlpha = 0.7;
      context.translate(x, y);
      context.rotate(wobble(5) * 0.1);
      context.drawImage(image, -size / 2, -size / 2, size, size);
      context.restore();
    },
    /** Numéro griffonné en bas de page, côté tranche. */
    folio: (number: number, spineOnLeft: boolean): void => {
      item++;
      context.font = pencil(22);
      context.fillStyle = PENCIL;
      context.textAlign = 'center';
      context.textBaseline = 'alphabetic';
      context.fillText(String(number), spineOnLeft ? 600 : MARGIN / 2, 770);
    },
  };
};

export type Writer = ReturnType<typeof createWriter>;
