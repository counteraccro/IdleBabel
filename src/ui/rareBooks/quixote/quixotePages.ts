import { hashText, seeded } from '../../../core/random';
import { messages } from '../../../i18n';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGE_CENTER } from '../draw';
import { rng } from '../arabianNights/arabianNightsOrnaments';
import { DIDOT, FELL } from './quixoteBinding';
import type { Paper } from '../../book/pageRender';

/**
 * Les pages du Doré de Hachette, d'après .ai/maquette-quichotte.html (y : lignes de base) : la page de titre
 * de 1863, et avant elle le fac-similé de celle de l'originale (Madrid, 1605) ; l'ouverture des chapitres
 * (bandeau gravé, « CHAPITRE PREMIER », le sommaire de Cervantès en italique, lettrine ornée), les pages de
 * partie, le papier.
 */
export const PAPER: Paper = ['#f4ecd8', '#ebdfc3', '#e3d4b2'];
export const INK = '#221c16';
/** Le papier plus ancien du fac-similé de 1605. */
const OLD_PAPER = ['#f1e6cb', '#d9c69c'] as const;
const OLD_INK = '#1d1712';

/** Le texte : sa taille et son interligne (la maquette). */
export const BODY_SIZE = 15.5;
export const BODY_LINE = 23;

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
  const random = seeded(hashText(`quixote:paper:${page}`));
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

/** Des lignes centrées : [y, sorte, texte], chaque sorte avec sa police et son espacement. */
const lines = (
  context: CanvasRenderingContext2D,
  rows: [number, string, string][],
  fonts: Record<string, [string, number]>,
  color: string,
): void => {
  for (const [y, kind, text] of rows) {
    if (kind === 'rule') {
      context.fillStyle = color;
      context.fillRect(PAGE_CENTER - 30, y, 60, 1.3);
    } else print(context, text, PAGE_CENTER, y, ...fonts[kind], color);
  }
};

/** La page de titre de Hachette (1863). */
export const quixoteTitlePage = (context: CanvasRenderingContext2D): void =>
  lines(
    context,
    messages().rareBooks.quixote.titlePage as [number, string, string][],
    {
      over: [`22px ${DIDOT}`, 3],
      title: [`700 52px ${DIDOT}`, 2],
      under: [`22px ${DIDOT}`, 3],
      by: [`10px ${DIDOT}`, 3],
      author: [`15px ${DIDOT}`, 2],
      translation: [`13px ${DIDOT}`, 2],
      drawings: [`15px ${DIDOT}`, 1.5],
      engraver: [`11px ${DIDOT}`, 2],
      volume: [`13px ${DIDOT}`, 3],
      city: [`20px ${DIDOT}`, 4],
      publisher: [`14px ${DIDOT}`, 1.5],
      address: [`10px ${DIDOT}`, 1.5],
      year: [`11px ${DIDOT}`, 2.5],
    },
    INK,
  );

/** La marque de Juan de la Cuesta : dans un ovale à devise, le faucon chaperonné sur le poing ganté. */
const falcon = (context: CanvasRenderingContext2D, cx: number, cy: number, scale: number, motto: string): void => {
  context.save();
  context.translate(cx, cy);
  context.scale(scale, scale);
  context.strokeStyle = OLD_INK;
  context.fillStyle = OLD_INK;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = 2;
  context.beginPath();
  context.ellipse(0, 0, 70, 86, 0, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 1;
  context.beginPath();
  context.ellipse(0, 0, 56, 72, 0, 0, Math.PI * 2);
  context.stroke();
  // La devise, en couronne entre les deux ovales.
  context.font = `9.5px ${FELL}`;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  const [start, span] = [-Math.PI * 0.98, Math.PI * 1.96];
  for (let i = 0; i < motto.length; i++) {
    const angle = start + (i / motto.length) * span;
    context.save();
    context.translate(Math.cos(angle) * 63, Math.sin(angle) * 79);
    context.rotate(angle + Math.PI / 2);
    context.fillText(motto[i], 0, 3);
    context.restore();
  }
  const shape = (points: number[][]): void => {
    context.beginPath();
    points.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)));
    context.fill();
  };
  // Le poing ganté, la manche, le faucon dessus.
  context.beginPath();
  context.moveTo(-50, 40);
  context.quadraticCurveTo(-30, 30, -12, 34);
  context.lineTo(-10, 46);
  context.quadraticCurveTo(-30, 46, -48, 54);
  context.closePath();
  context.fill();
  context.beginPath();
  context.ellipse(-2, 36, 13, 10, 0.2, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.moveTo(-4, 28);
  context.bezierCurveTo(-18, 10, -16, -20, -4, -32);
  context.bezierCurveTo(4, -38, 14, -36, 16, -28);
  context.bezierCurveTo(20, -14, 18, 10, 6, 28);
  context.closePath();
  context.fill();
  shape([
    [-2, 26],
    [-14, 52],
    [2, 50],
    [8, 26],
  ]);
  context.beginPath();
  context.arc(6, -38, 10, 0, Math.PI * 2);
  context.fill();
  shape([
    [14, -40],
    [24, -36],
    [15, -32],
  ]);
  // Le chaperon et l'aile, en réserve.
  context.strokeStyle = OLD_PAPER[0];
  context.lineWidth = 1.2;
  context.beginPath();
  context.arc(6, -40, 8, Math.PI * 1.05, Math.PI * 1.95);
  context.stroke();
  context.beginPath();
  context.moveTo(6, -50);
  context.lineTo(6, -56);
  context.stroke();
  context.beginPath();
  context.moveTo(0, -18);
  context.bezierCurveTo(10, -8, 10, 8, 2, 20);
  context.stroke();
  for (let feather = 0; feather < 4; feather++) {
    context.beginPath();
    context.moveTo(2, -10 + feather * 8);
    context.lineTo(10, -6 + feather * 8);
    context.stroke();
  }
  context.restore();
};

/** Le fac-similé de la page de titre de l'originale (Madrid, Juan de la Cuesta, 1605), sur un papier plus ancien. */
export const cuestaFlyleaf = (context: CanvasRenderingContext2D): void => {
  const { width, height } = PAGE_TEXTURE;
  const shade = context.createRadialGradient(width / 2, height / 2, width * 0.2, width / 2, height / 2, height * 0.75);
  shade.addColorStop(0, OLD_PAPER[0]);
  shade.addColorStop(1, OLD_PAPER[1]);
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);
  const random = rng(51);
  for (let spot = 0; spot < 26; spot++) {
    context.fillStyle = `rgba(150,100,40,${0.05 + random() * 0.08})`;
    context.beginPath();
    context.arc(random() * width, random() * height, 1 + random() * 3.5, 0, Math.PI * 2);
    context.fill();
  }
  const page = messages().rareBooks.quixote.flyleaf;
  lines(
    context,
    page.lines as [number, string, string][],
    {
      title: [`34px ${FELL}`, 1.5],
      author: [`italic 19px ${FELL}`, 0],
      dedication: [`15px ${FELL}`, 1],
      titles: [`italic 14px ${FELL}`, 0],
      privilege: [`14px ${FELL}`, 1.5],
      printer: [`17px ${FELL}`, 0],
      seller: [`italic 11.5px ${FELL}`, 0],
    },
    OLD_INK,
  );
  falcon(context, PAGE_CENTER, 520, 0.95, page.motto);
  // « Año, 1605. » de part et d'autre de la marque, comme sur l'originale.
  const [year, number] = page.year;
  print(context, year, PAGE_CENTER - 104, 600, `italic 18px ${FELL}`, 0, OLD_INK);
  print(context, number, PAGE_CENTER + 104, 600, `20px ${FELL}`, 0, OLD_INK);
};

/** Le bandeau gravé : rinceaux en réserve sur une bande noire, de part et d'autre d'un petit armet. */
const headpiece = (context: CanvasRenderingContext2D, y: number): void => {
  const [x0, x1, height] = [120, PAGE_TEXTURE.width - 120, 46];
  context.fillStyle = INK;
  context.fillRect(x0, y, x1 - x0, height);
  context.strokeStyle = PAPER[0];
  context.lineWidth = 1.2;
  context.strokeRect(x0 + 4, y + 4, x1 - x0 - 8, height - 8);
  for (const side of [-1, 1])
    for (let curl = 0; curl < 5; curl++) {
      const [cx, cy] = [PAGE_CENTER + side * (52 + curl * 34), y + height / 2];
      context.beginPath();
      context.arc(cx, cy + (curl % 2 ? 4 : -4), 10, curl % 2 ? Math.PI : 0, curl % 2 ? Math.PI * 2 : Math.PI);
      context.stroke();
      context.beginPath();
      context.arc(cx + side * 10, cy, 3, 0, Math.PI * 2);
      context.stroke();
    }
  context.fillStyle = PAPER[0];
  context.beginPath();
  context.ellipse(PAGE_CENTER, y + 30, 22, 3.5, 0, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.moveTo(PAGE_CENTER - 14, y + 30);
  context.bezierCurveTo(PAGE_CENTER - 13, y + 12, PAGE_CENTER + 13, y + 12, PAGE_CENTER + 14, y + 30);
  context.fill();
  context.fillStyle = INK;
  context.beginPath();
  context.ellipse(PAGE_CENTER - 11, y + 31, 5, 2.5, 0, 0, Math.PI);
  context.fill();
};

/** Les lignes d'un sommaire de chapitre, en italique : au plus trois, plus petites s'il le faut. */
const summary = (context: CanvasRenderingContext2D, title: string): { lines: string[]; size: number } => {
  const room = PAGE_TEXTURE.width - 2 * 90;
  for (let size = 15; ; size -= 0.5) {
    context.font = `italic ${size}px ${DIDOT}`;
    const rows: string[] = [];
    let row = '';
    for (const word of title.split(' ')) {
      const tried = row ? `${row} ${word}` : word;
      if (row && context.measureText(tried).width > room) {
        rows.push(row);
        row = word;
      } else row = tried;
    }
    if (row) rows.push(row);
    if (rows.length <= 3 || size <= 11) return { lines: rows.slice(0, 3), size };
  }
};

/** Le premier mot d'un nom de partie (« PREMIÈRE PARTIE ») : un chapitre se reconnaît à son « CHAPITRE ». */
const isChapter = (label: string): boolean => /^CHAP/i.test(label);
const isPart = (label: string): boolean => /PARTIE|PART$/i.test(label);

/**
 * Le haut d'une ouverture : le bandeau, le numéro du chapitre (ou « PROLOGUE »), son sommaire en italique et
 * un petit filet. Une grande partie n'a que son nom, au milieu de la page.
 */
export const quixoteHead = (context: CanvasRenderingContext2D, title: string, label: string): void => {
  if (isPart(label)) {
    headpiece(context, 300);
    print(context, label, PAGE_CENTER, 420, `700 30px ${DIDOT}`, 4);
    context.fillStyle = INK;
    context.fillRect(PAGE_CENTER - 30, 450, 60, 1);
    return;
  }
  headpiece(context, 150);
  print(context, label, PAGE_CENTER, 262, `700 22px ${DIDOT}`, 3);
  let rule = 286;
  if (title && isChapter(label)) {
    const { lines: rows, size } = summary(context, title);
    rows.forEach((row, index) => print(context, row, PAGE_CENTER, 298 + index * 22, `italic ${size}px ${DIDOT}`));
    rule = 298 + (rows.length - 1) * 22 + 24;
  }
  context.fillStyle = INK;
  context.fillRect(PAGE_CENTER - 20, rule, 40, 1);
};

/** La lettrine : un carré de trois lignes, moins le blanc sous la dernière. */
export const DROP_CAP = 3 * BODY_LINE - 4;

/** La lettrine ornée : la lettre en réserve dans un carré noir, sur des rinceaux. Son haut : 17 au-dessus de la 1re ligne de base. */
export const quixoteDropCap = (context: CanvasRenderingContext2D, letter: string, x: number, baseline: number): void => {
  const [size, y] = [DROP_CAP, baseline - 17];
  context.save();
  context.fillStyle = INK;
  context.fillRect(x, y, size, size);
  // Les rinceaux restent dans le carré.
  context.beginPath();
  context.rect(x, y, size, size);
  context.clip();
  context.strokeStyle = PAPER[0];
  context.lineWidth = 1.1;
  const random = rng(9);
  for (let curl = 0; curl < 14; curl++) {
    const [cx, cy, radius] = [x + random() * size, y + random() * size, 5 + random() * 9];
    const start = random() * 6;
    context.beginPath();
    context.arc(cx, cy, radius, start, random() * 6 + 3.5);
    context.stroke();
  }
  context.strokeRect(x + 3, y + 3, size - 6, size - 6);
  context.fillStyle = INK;
  context.fillRect(x + size * 0.2, y + size * 0.14, size * 0.6, size * 0.72);
  context.font = `700 ${size * 0.78}px ${DIDOT}`;
  context.fillStyle = PAPER[0];
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.fillText(letter, x + size / 2, y + size * 0.8);
  context.restore();
};
