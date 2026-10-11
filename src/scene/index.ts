import { loadDepth } from './depthMap';
import { startScene, type SceneSwap } from './renderer';
import { SCENES, type SceneDefinition, type SceneId } from './scenes';

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

const base = import.meta.env.BASE_URL;
const sceneOf = (id: SceneId): SceneDefinition => SCENES.find((scene) => scene.id === id)!;
const load = async (scene: SceneDefinition) => {
  const image = await loadImage(base + scene.image);
  return { image, depth: await loadDepth(base + scene.depth, image, scene.vanishing), vanishing: scene.vanishing };
};

/** Le fond voulu est relu chaque seconde : un nouvel Âge, un fond coché dans le cahier. */
const FOLLOW_MS = 1000;

let current: SceneId;
/** Le dernier fond demandé (peut-être encore en chargement, ou introuvable). */
let target: SceneId;
/** Numéro du dernier changement demandé : un chargement dépassé par un plus récent ne s'affiche pas. */
let ticket = 0;
let forced: SceneId | undefined;
let swap: SceneSwap | undefined;

/** Le fond affiché. */
export const shownScene = (): SceneId => current;

/** Débogage : montre ce fond, même pas encore vu, ou undefined pour rendre la main au jeu. */
export const forceScene = (id: SceneId | undefined): void => {
  forced = id;
};

/**
 * Change de fond : `current` ne change qu'une fois l'image affichée (la Mimic s'y place). Une image introuvable laisse
 * l'ancien fond ; elle n'est redemandée que si le fond voulu change.
 */
const showScene = async (id: SceneId): Promise<void> => {
  target = id;
  const mine = ++ticket;
  if (!swap) {
    document.body.style.backgroundImage = `url(${base + sceneOf(id).image})`;
    current = id;
    return;
  }
  try {
    const scene = await load(sceneOf(id));
    if (mine !== ticket) return;
    swap(scene);
    current = id;
  } catch (error) {
    console.error(`Fond « ${id} » introuvable : l'ancien reste affiché.`, error);
  }
};

export const mountScene = async (options: { beyond: () => number; wanted: () => SceneId }): Promise<void> => {
  current = target = options.wanted();

  const canvas = document.createElement('canvas');
  canvas.className = 'scene';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  try {
    swap = startScene(canvas, { ...(await load(sceneOf(current))), beyond: options.beyond });
  } catch (error) {
    // Image introuvable ou WebGL2 en panne : le fond reste sombre, ou l'image fixe si elle se charge.
    console.error('Scène animée indisponible, image fixe affichée à la place.', error);
  }
  if (!swap) {
    canvas.remove();
    document.body.style.background = `#0b0806 url(${base + sceneOf(current).image}) center / cover`;
  }
  // Une fois le premier fond en place (ou l'image fixe) : sinon un changement pendant son chargement serait écrasé.
  setInterval(() => {
    const wanted = forced ?? options.wanted();
    if (wanted !== target) void showScene(wanted);
  }, FOLLOW_MS);
};
