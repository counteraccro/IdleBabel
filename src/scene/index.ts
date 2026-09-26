import { loadDepth } from './depthMap';
import { startScene } from './renderer';

/** Décor de l'Âge Manuel : la pièce à une fenêtre. */
const SCENE = {
  image: 'scenes/age1.jpg',
  depth: 'scenes/age1-depth.png',
  vanishing: { x: 0.56, y: 0.45 },
};

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

export const mountScene = async (perception: { clarity: () => number; beyond: () => number }): Promise<void> => {
  const base = import.meta.env.BASE_URL;
  const canvas = document.createElement('canvas');
  canvas.className = 'scene';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const image = await loadImage(base + SCENE.image);
  const depth = await loadDepth(base + SCENE.depth, image, SCENE.vanishing);
  let started = false;
  try {
    started = startScene(canvas, { image, depth, vanishing: SCENE.vanishing, ...perception });
  } catch (error) {
    console.error('Scène animée indisponible, image fixe affichée à la place.', error);
  }
  if (!started) {
    canvas.remove();
    document.body.style.background = `#0b0806 url(${base + SCENE.image}) center / cover`;
  }
};
