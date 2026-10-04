/**
 * Repère de la maquette des livres ordinaires (.ai/maquette-livres-ordinaires.html) : plats de 640 × 800,
 * dos de 134 × 800, tranche vue de face de 96 × 800. Les nombres de la maquette sont repris tels quels,
 * dessinés à l'échelle K des textures du jeu (plats de 800 × 1000 : leatherCover.ts).
 */
export const MW = 640;
export const MH = 800;
export const MCQW = MW / 100;
export const SPINE_W = 134;
export const EDGE_W = 96;
export const K = 800 / MW;

export const GOLD = '#d9b56a';
export const SERIF = "Georgia, 'Times New Roman', serif";
export const SANS = "'Helvetica Neue', Arial, sans-serif";

export type Context = CanvasRenderingContext2D;

/** Un canevas aux dimensions de la maquette `w` × `h`, à l'échelle du jeu, déjà mis à l'échelle. */
export const mockupCanvas = (w: number, h: number): [HTMLCanvasElement, Context] => {
  const node = document.createElement('canvas');
  node.width = Math.round(w * K);
  node.height = Math.round(h * K);
  const context = node.getContext('2d')!;
  context.scale(K, K);
  return [node, context];
};

/** Dessine dans le repère de la maquette, sur un canevas du jeu. */
export const inMockup = (context: Context, draw: (context: Context) => void): void => {
  context.save();
  context.scale(K, K);
  draw(context);
  context.restore();
};

/** Hasard reproductible de la maquette (Park-Miller). */
export const rng = (seed: number): (() => number) => {
  let state = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => ((state = (state * 16807) % 2147483647) - 1) / 2147483646;
};

/** Or repoussé, du clair au sombre, de `top` à `bottom`. */
export const goldGradient = (context: Context, top: number, bottom: number): CanvasGradient => {
  const gold = context.createLinearGradient(0, top, 0, bottom);
  gold.addColorStop(0, '#f3dc9c');
  gold.addColorStop(0.55, '#c8993f');
  gold.addColorStop(1, '#8f6a26');
  return gold;
};

/** Écrit `value` au point (x, y), réduit en largeur s'il dépasse `room`. */
export const fitText = (context: Context, value: string, x: number, y: number, room: number): void => {
  const width = context.measureText(value).width;
  context.save();
  context.translate(x, y);
  if (width > room) context.scale(room / width, 1);
  context.fillText(value, 0, 0);
  context.restore();
};

/** Coupe un texte en lignes de la largeur `room`. */
export const wrapLines = (context: Context, text: string, room: number): string[] => {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width <= room || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  lines.push(line);
  return lines;
};

/** Le chemin d'un hexagone de rayon `radius`, pointe en haut, centré en (x, y). */
export const hexagon = (context: Context, x: number, y: number, radius: number): void => {
  context.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 + Math.PI / 6;
    if (i) context.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
    else context.moveTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
  }
  context.closePath();
};
