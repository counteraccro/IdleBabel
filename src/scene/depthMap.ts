/**
 * Carte de profondeur provisoire, déduite de la perspective centrale de la pièce :
 * le point de fuite est au fond (la fenêtre), les bords de l'image sont les plus proches.
 * À remplacer par une vraie carte (Depth Anything) : public/scenes/<scène>-depth.png.
 */
export const createPerspectiveDepth = (width: number, height: number, vanishing: { x: number; y: number }): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(width, height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = Math.abs(x / width - vanishing.x) / 0.5;
      const dy = Math.abs(y / height - vanishing.y) / 0.55;
      const depth = Math.min(1, Math.max(0, (Math.max(dx, dy) - 0.3) / 0.7)) ** 0.8;
      const value = Math.round(depth * 255);
      const i = (y * width + x) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
      image.data[i + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  return canvas;
};

/** Charge la carte de profondeur si elle existe, sinon construit la carte provisoire. */
export const loadDepth = async (
  url: string,
  fallbackSize: { width: number; height: number },
  vanishing: { x: number; y: number },
): Promise<TexImageSource> => {
  try {
    const response = await fetch(url);
    if (response.ok && response.headers.get('content-type')?.startsWith('image/')) {
      return await createImageBitmap(await response.blob());
    }
  } catch {
    // pas de carte : on utilise la perspective
  }
  return createPerspectiveDepth(fallbackSize.width, fallbackSize.height, vanishing);
};
