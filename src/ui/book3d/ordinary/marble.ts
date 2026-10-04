import { K, rng } from './mockup';

/** Palettes du papier marbré : trois couleurs de cailloux, et le fond. */
export const MARBLES: readonly (readonly [string, string, string, string])[] = [
  ['#34485e', '#8e4a36', '#b9a77c', '#d8ccb0'],
  ['#5e2e2a', '#b39660', '#3a4536', '#e2d6bb'],
  ['#3e5266', '#a89160', '#6e3a2e', '#ddd0b2'],
  ['#4a4258', '#9a9274', '#2a2a33', '#d2c3a4'],
];

/**
 * Papier marbré de `w` × `h` (repère de la maquette), rendu à l'échelle du jeu : caillouté (`kind` 0 :
 * des cailloux cernés de veines) ou peigné (1 : des bandes tirées au peigne en vagues).
 */
export const marble = (seed: number, palette: number, kind: number, w: number, h: number): HTMLCanvasElement => {
  const random = rng(seed + 29);
  const colors = MARBLES[palette];
  const [width, height] = [Math.round(w * K), Math.round(h * K)];
  const flat = document.createElement('canvas');
  flat.width = width;
  flat.height = height;
  const context = flat.getContext('2d')!;
  context.scale(K, K);
  if (kind === 0) {
    context.fillStyle = colors[3];
    context.fillRect(0, 0, w, h);
    for (let i = 0; i < (w * h) / 70; i++) {
      const [x, y, radius] = [random() * w, random() * h, 2.5 + random() * 9];
      context.beginPath();
      context.ellipse(x, y, radius, radius * (0.7 + random() * 0.5), random() * Math.PI, 0, 2 * Math.PI);
      context.fillStyle = colors[Math.floor(random() * 3)];
      context.fill();
      context.lineWidth = 0.8;
      context.strokeStyle = 'rgba(30,22,14,0.5)';
      context.stroke();
    }
  } else {
    for (let x = 0; x < w; x += 3) {
      context.fillStyle = colors[Math.floor(random() * 4)];
      context.fillRect(x, 0, 3, h);
      context.fillStyle = 'rgba(30,22,14,0.25)';
      context.fillRect(x, 0, 0.6, h);
    }
  }
  // Le peigne : chaque bande de deux lignes décalée en vague.
  const combed = document.createElement('canvas');
  combed.width = width;
  combed.height = height;
  const out = combed.getContext('2d')!;
  const phase = random() * 6;
  for (let y = 0; y < h; y += 2) {
    const shift = Math.sin(y / (kind ? 9 : 31) + phase) * (kind ? 7 : 4);
    out.drawImage(flat, 0, y * K, width, 2 * K, shift * K, y * K, width, 2 * K);
  }
  out.fillStyle = 'rgba(40,28,14,0.14)';
  out.fillRect(0, 0, width, height);
  return combed;
};
