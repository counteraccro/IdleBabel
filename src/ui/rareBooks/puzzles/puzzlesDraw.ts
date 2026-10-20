import '@fontsource/luckiest-guy/400.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/libre-franklin/500.css';
import '@fontsource/libre-franklin/700.css';
import '@fontsource/libre-franklin/800.css';

/**
 * Outils de dessin de « 410 grilles de JEUX » (maquette .ai/maquette-livre-jeux.html, 20/10/2026) : les lettres du kiosque,
 * le papier, les en-têtes de couleur, le tampon « Résolu ». Tout se dessine aux unités de la maquette (une page 640 × 800,
 * comme la texture des pages).
 */

export const [W, H] = [640, 800];
export const BIG = "'Luckiest Guy', 'Arial Black', sans-serif";
export const ROUND = "'Fredoka', 'Arial Rounded MT Bold', sans-serif";
export const GRID = "'Libre Franklin', Arial, sans-serif";
export const INK = '#1d1b22';
/** Le stylo du joueur, et ce que « Vérifier » trouve faux. */
export const PEN = '#2d5bb0';
export const WRONG = '#d23a2c';
export const GOLD = '#f2a51d';
export const TEAL = '#17a3a0';
export const RED = '#e2483a';
export const NAVY = '#24345c';
/** Les cases de définitions des mots fléchés. */
export const CLUE = '#d9eef0';

export const loadPuzzleFonts = (): Promise<unknown> =>
  Promise.all(
    [
      `20px ${BIG}`,
      `500 20px ${ROUND}`,
      `600 20px ${ROUND}`,
      `700 20px ${ROUND}`,
      `500 20px ${GRID}`,
      `700 20px ${GRID}`,
      `800 20px ${GRID}`,
    ].map((font) => document.fonts.load(font)),
  );

export const rng = (seed: number) => (): number => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** Du texte posé par sa ligne de base. */
export const text = (
  context: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  font: string,
  color: string,
  align: CanvasTextAlign = 'center',
): void => {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.fillText(line, x, y);
};

/** Du texte bordé de blanc (le titre de la couverture). */
export const outlined = (
  context: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  font: string,
  fill: string,
  stroke: string,
  width: number,
): void => {
  context.font = font;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.lineJoin = 'round';
  context.strokeStyle = stroke;
  context.lineWidth = width;
  context.strokeText(line, x, y);
  context.fillStyle = fill;
  context.fillText(line, x, y);
};

/** Un paragraphe en lignes ; rend la hauteur où il s'arrête. */
export const para = (
  context: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  width: number,
  size: number,
  color = INK,
  weight = 500,
): number => {
  context.font = `${weight} ${size}px ${ROUND}`;
  context.fillStyle = color;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  let current = '';
  for (const word of line.split(' ')) {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width > width && current) {
      context.fillText(current, x, y);
      y += size * 1.35;
      current = word;
    } else current = next;
  }
  context.fillText(current, x, y);
  return y + size * 1.35;
};

/** Le papier du cahier : un grain léger (la gouttière est déjà ombrée par la texture des pages). */
export const speckle = (context: CanvasRenderingContext2D, seed: number): void => {
  const random = rng(seed);
  for (let i = 0; i < 2600; i++) {
    context.fillStyle = `rgba(90,80,60,${random() * 0.07})`;
    context.fillRect(random() * W, random() * H, 1, 1);
  }
};

/** Le bandeau de couleur en haut de page (titre, à droite un mot), et le numéro de page en bas, côté extérieur. */
export const header = (
  context: CanvasRenderingContext2D,
  title: string,
  color: string,
  sub: string,
  folio: number,
  left: boolean,
): void => {
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(40, 36, W - 80, 64, 14);
  context.fill();
  text(context, title, 62, 82, `30px ${BIG}`, '#fff', 'left');
  text(context, sub, W - 62, 76, `600 17px ${ROUND}`, '#fff', 'right');
  text(context, String(folio), left ? 46 : W - 46, H - 22, `500 16px ${ROUND}`, '#8a8070', left ? 'left' : 'right');
};

/** Une définition dans sa case, à la plus grande taille qui tient (15 px, puis plus petit jusqu'à 8). */
export const fitClue = (context: CanvasRenderingContext2D, clue: string, x: number, y: number, w: number, h: number): void => {
  for (let size = 15; size >= 8; size--) {
    context.font = `600 ${size}px ${ROUND}`;
    const lines: string[] = [];
    let line = '';
    for (const word of clue.split(' ')) {
      const next = line ? `${line} ${word}` : word;
      if (context.measureText(next).width > w - 6 && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
    if (lines.length * size * 1.05 <= h - 4 && lines.every((one) => context.measureText(one).width <= w - 4)) {
      context.fillStyle = INK;
      context.textAlign = 'center';
      context.textBaseline = 'alphabetic';
      lines.forEach((one, i) => context.fillText(one, x + w / 2, y + (h - lines.length * size * 1.05) / 2 + size * 0.9 + i * size * 1.05));
      return;
    }
  }
};

/** La petite flèche d'une définition : vers la droite (a) ou vers le bas (d). */
export const arrow = (context: CanvasRenderingContext2D, x: number, y: number, dir: 'a' | 'd'): void => {
  context.fillStyle = INK;
  context.beginPath();
  if (dir === 'a') {
    context.moveTo(x, y - 5);
    context.lineTo(x + 8, y);
    context.lineTo(x, y + 5);
  } else {
    context.moveTo(x - 5, y);
    context.lineTo(x, y + 8);
    context.lineTo(x + 5, y);
  }
  context.fill();
};

/** Le tampon rouge d'une grille résolue, penché, et ce qu'elle a rapporté. */
export const stamp = (context: CanvasRenderingContext2D, x: number, y: number, title: string, line: string): void => {
  context.save();
  context.translate(x, y);
  context.rotate(-0.22);
  context.globalAlpha = 0.88;
  context.strokeStyle = RED;
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(-128, -44, 256, 88, 10);
  context.stroke();
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(-118, -34, 236, 68, 6);
  context.stroke();
  text(context, title, 0, 8, `44px ${BIG}`, RED);
  text(context, line, 0, 28, `600 16px ${ROUND}`, RED);
  context.restore();
};

/** La taille (au plus `size`) à laquelle `line` tient dans `width` (un titre anglais plus long). */
export const fit = (
  context: CanvasRenderingContext2D,
  line: string,
  font: (size: number) => string,
  size: number,
  width: number,
): number => {
  context.font = font(size);
  const natural = context.measureText(line).width;
  return natural <= width ? size : (size * width) / natural;
};
