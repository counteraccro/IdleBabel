import '@fontsource/caveat/400.css';
import { messages } from '../../../i18n';
import { seeded } from '../../../core/random';
import { canvasTexture } from '../../book3d/textures';
import { CQW, HAND, HEIGHT, SERIF, WIDTH, write } from '../draw';
import { canvas } from '../../book3d/leatherCover';
import type * as THREE from 'three';

/**
 * La couverture de « Mon histoire vraie » (maquette .ai/maquette-faux-livre.html, mesures reprises du plat de 300 × 420) :
 * une toile ordinaire, brune, comme un livre d'avant ; le seul livre de la Bibliothèque dont le titre se lit en clair.
 */
export const CLOTH = '#4c3d30';
export const CLOTH_EDGE = '#3e3226';
const TITLE_INK = 'rgb(232, 214, 178)';
const FRAME = 'rgba(225, 205, 165, 0.55)';
/** De la maquette (300 × 420) au plat (800 × 1000). */
const SX = WIDTH / 300;
const SY = HEIGHT / 420;

/** Les polices du livre : chargées avant de le dessiner. */
export const loadTrueStoryFonts = (): Promise<unknown> =>
  Promise.all([`40px ${SERIF}`, `italic 40px ${SERIF}`, `40px ${HAND}`].map((font) => document.fonts.load(font)));

/** La toile : un dégradé brun, en biais, et ses fils, à peine plus clairs. */
const cloth = (seed: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const [node, context] = canvas();
  const shade = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  shade.addColorStop(0, '#5b4a3a');
  shade.addColorStop(1, CLOTH_EDGE);
  context.fillStyle = shade;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  const random = seeded(seed);
  for (let i = 0; i < 1600 * SX * SY; i++) {
    context.fillStyle = `rgba(255, 240, 215, ${random() * 0.05})`;
    context.fillRect(random() * WIDTH, random() * HEIGHT, SX * 0.6, (1 + random() * 3) * SY);
  }
  return [node, context];
};

/** Le plat : un filet clair en cadre, le titre au tiers haut (« vraie » en italique), un petit trait dessous. */
export const trueStoryFront = (): THREE.CanvasTexture => {
  const [node, context] = cloth(3);
  context.fillStyle = 'rgba(0, 0, 0, 0.25)';
  context.fillRect(0, 0, 14 * SX, HEIGHT);
  context.strokeStyle = FRAME;
  context.lineWidth = SX;
  context.strokeRect(30 * SX, 30 * SY, WIDTH - 48 * SX, HEIGHT - 60 * SY);
  const [first, second] = messages().rareBooks.trueStory.cover;
  const x = WIDTH / 2 + 6 * SX;
  write(context, first, x, 150 * SY, { font: `${26 * SX}px ${SERIF}`, color: TITLE_INK });
  write(context, second, x, 186 * SY, { font: `italic ${26 * SX}px ${SERIF}`, color: TITLE_INK });
  context.fillStyle = FRAME;
  context.fillRect(WIDTH / 2 - 14 * SX, 238 * SY, 40 * SX, SY);
  return canvasTexture(node);
};

/** Le plat arrière : la toile seule, sans rien. */
export const trueStoryBack = (): THREE.CanvasTexture => canvasTexture(cloth(5)[0]);

/** Le dos : le titre couché dans la longueur, élargi pour un dos étroit (`thickness`, la hauteur du livre faisant 1). */
export const trueStorySpine = (thickness: number): THREE.CanvasTexture => {
  const [node, context] = cloth(7);
  const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
  context.save();
  context.translate(WIDTH / 2, 0);
  context.scale(stretch, 1);
  context.translate(0, 14 * CQW);
  context.rotate(Math.PI / 2);
  context.fillStyle = TITLE_INK;
  context.textBaseline = 'middle';
  context.font = `${7 * CQW}px ${SERIF}`;
  context.fillText(messages().rareBooks.trueStory.name, 0, 0);
  context.restore();
  return canvasTexture(node);
};
