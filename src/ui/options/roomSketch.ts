/** Largeur d'un croquis de salle (repère de la texture du cahier, avant mise à l'échelle). */
const WIDTH = 300;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

/**
 * Une salle peinte passée en croquis au crayon (le chercheur a dessiné les fonds dans son cahier) :
 * les contours appuyés, les ombres en grisé léger, le papier qui transparaît ailleurs.
 */
export const roomSketch = async (src: string): Promise<HTMLCanvasElement> => {
  const image = await loadImage(src);
  const [width, height] = [WIDTH, Math.round((WIDTH * image.height) / image.width)];
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  context.drawImage(image, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  const data = pixels.data;
  const luma = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) luma[i] = (data[i * 4] * 0.3 + data[i * 4 + 1] * 0.59 + data[i * 4 + 2] * 0.11) / 255;
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const edge = Math.min(1, Math.hypot(luma[i + 1] - luma[i - 1], luma[i + width] - luma[i - width]) * 4);
      // Le crayon du cahier (#5d584f).
      [data[i * 4], data[i * 4 + 1], data[i * 4 + 2]] = [93, 88, 79];
      data[i * 4 + 3] = Math.min(0.9, edge * 0.85 + (1 - luma[i]) * 0.35) * 255;
    }
  context.putImageData(pixels, 0, 0);
  return canvas;
};
