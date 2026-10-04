/** Les outils de dessin communs à la couverture et aux pages du Necronomicon. */

export type Random = () => number;

/** Hasard reproductible (Park-Miller), le même que les maquettes : mêmes signes aux mêmes places. */
export const rng =
  (seed: number): Random =>
  (): number =>
    ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** L'or poussé au fer : un dégradé vertical de `y0` à `y1`. */
export const gold = (context: CanvasRenderingContext2D, y0: number, y1: number): CanvasGradient => {
  const gradient = context.createLinearGradient(0, y0, 0, y1);
  gradient.addColorStop(0, '#8a6a2c');
  gradient.addColorStop(0.35, '#f2d68e');
  gradient.addColorStop(0.55, '#c9a24f');
  gradient.addColorStop(0.8, '#f0d48a');
  gradient.addColorStop(1, '#7a5a22');
  return gradient;
};

/** Le médaillon en amande (shamsa), du plat comme de la page de titre. */
export const almond = (context: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void => {
  context.beginPath();
  context.moveTo(cx, cy - ry);
  context.bezierCurveTo(cx + rx * 0.9, cy - ry * 0.55, cx + rx * 0.9, cy + ry * 0.55, cx, cy + ry);
  context.bezierCurveTo(cx - rx * 0.9, cy + ry * 0.55, cx - rx * 0.9, cy - ry * 0.55, cx, cy - ry);
};
