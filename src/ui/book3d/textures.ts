import * as THREE from 'three';

/** Image d'un SVG (élément déjà construit) à la taille voulue, prête à dessiner sur un canvas. */
export const svgImage = async (svg: SVGSVGElement, width: number, height: number): Promise<HTMLImageElement> => {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('width', String(width));
  copy.setAttribute('height', String(height));
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(copy.outerHTML)}`;
  await image.decode();
  return image;
};

/** Texture tirée d'un canvas déjà dessiné. */
export const canvasTexture = (canvas: HTMLCanvasElement): THREE.CanvasTexture => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

/** Dessine un SVG (élément déjà construit) sur un canvas, pour en faire une texture. */
export const svgTexture = async (svg: SVGSVGElement, width: number, height: number): Promise<THREE.CanvasTexture> => {
  const image = await svgImage(svg, width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(image, 0, 0, width, height);
  return canvasTexture(canvas);
};

/**
 * Tranche des feuilles : une fine ligne par feuille, dans le sens des pages (lignes le long de
 * `length`, empilées sur `thickness`), plus sombre contre les plats.
 */
export const edgeTexture = (paper: string, line: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  context.fillStyle = paper;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = line;
  for (let y = 0; y < canvas.height; y += 3) context.fillRect(0, y, canvas.width, Math.random() < 0.3 ? 1.4 : 0.8);
  // Contre les plats, le papier fonce (lumière, doigts).
  const shade = context.createLinearGradient(0, 0, 0, canvas.height);
  shade.addColorStop(0, 'rgba(60, 40, 10, 0.35)');
  shade.addColorStop(0.15, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(0.85, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(40, 25, 5, 0.45)');
  context.fillStyle = shade;
  context.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};
