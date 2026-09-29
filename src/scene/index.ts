import { loadDepth } from './depthMap';
import { startScene } from './renderer';

/** Décor de l'Âge Manuel : la pièce à une fenêtre. */
const SCENE = {
  image: 'scenes/age1.jpg',
  depth: 'scenes/age1-depth.png',
  vanishing: { x: 0.56, y: 0.45 },
  /** Âge Manuel : une obscurité presque totale, pas de brume. */
  fogColor: [0.012, 0.009, 0.007] as [number, number, number],
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

  let started = false;
  try {
    const image = await loadImage(base + SCENE.image);
    const depth = await loadDepth(base + SCENE.depth, image, SCENE.vanishing);
    started = startScene(canvas, { image, depth, vanishing: SCENE.vanishing, fogColor: SCENE.fogColor, ...perception });
  } catch (error) {
    // Image introuvable ou WebGL2 en panne : le fond reste sombre, ou l'image fixe si elle se charge.
    console.error('Scène animée indisponible, image fixe affichée à la place.', error);
  }
  if (!started) {
    canvas.remove();
    document.body.style.background = `#0b0806 url(${base + SCENE.image}) center / cover`;
  }
};
