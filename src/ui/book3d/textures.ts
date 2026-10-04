import * as THREE from 'three';

/** Image d'un document SVG (texte), prête à dessiner sur un canvas. */
export const svgMarkupImage = async (markup: string): Promise<HTMLImageElement> => {
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  await image.decode();
  return image;
};

/** Image d'un SVG (élément déjà construit) à la taille voulue, prête à dessiner sur un canvas. */
export const svgImage = (svg: SVGSVGElement, width: number, height: number): Promise<HTMLImageElement> => {
  const copy = svg.cloneNode(true) as SVGSVGElement;
  copy.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  copy.setAttribute('width', String(width));
  copy.setAttribute('height', String(height));
  return svgMarkupImage(copy.outerHTML);
};

/**
 * Document SVG rendu une fois pour toutes sur un canvas : un SVG à filtres (bruit) serait recalculé à
 * chaque dessin de l'image.
 */
export const rasterizeSvg = async (markup: string, width: number, height: number): Promise<HTMLCanvasElement> => {
  const image = await svgMarkupImage(markup);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(image, 0, 0, width, height);
  return canvas;
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

/**
 * La texture `texture` réduite pour tenir dans `size` (proportions gardées, sauf `keepRatio` faux : chaque
 * côté réduit à sa limite) ; telle quelle si elle y tient déjà ou n'est pas une image. Une texture neuve, qui
 * ne partage rien avec l'ancienne : celle-ci peut servir ailleurs (le même livre ouvert), elle n'est pas
 * touchée ; jamais envoyée à la carte graphique de la vitrine ou de la pile (shelfLook.ts, pileLook.ts), il n'y
 * a rien à y libérer.
 */
export const shrinkTexture = (texture: THREE.Texture, size: { width: number; height: number }, keepRatio = true): THREE.Texture => {
  const image: unknown = texture.image;
  if (!(image instanceof HTMLCanvasElement || image instanceof HTMLImageElement || image instanceof ImageBitmap)) return texture;
  const scaleX = Math.min(1, size.width / image.width);
  const scaleY = Math.min(1, size.height / image.height);
  if (scaleX === 1 && scaleY === 1) return texture;
  const scale = Math.min(scaleX, scaleY);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * (keepRatio ? scale : scaleX)));
  canvas.height = Math.max(1, Math.round(image.height * (keepRatio ? scale : scaleY)));
  const context = canvas.getContext('2d')!;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const small = texture.clone();
  small.source = new THREE.Source(canvas);
  small.needsUpdate = true;
  return small;
};
