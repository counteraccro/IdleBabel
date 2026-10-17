import '@fontsource/cinzel/400.css';
import '@fontsource/cinzel/600.css';
import '@fontsource/great-vibes/400.css';
import { messages, t } from '../../../i18n';
import { seeded } from '../../../core/random';
import { SCENES } from '../../../scene/scenes';
import { ROW, TOMES, TOME_SHOTS, tomeIsbn } from '../../../data/sagaTomes';
import { canvasTexture } from '../../book3d/textures';
import { CQW, HEIGHT, SANS, SERIF, TITLE, WIDTH, wrap } from '../draw';
import { canvas } from '../../book3d/leatherCover';
import type * as THREE from 'three';

/**
 * Les couvertures des tomes de « L'histoire de Babel » (maquette .ai/maquette-couverture-vraie-fin.html, piste B choisie
 * le 17/10, mesures reprises du plat de 300 × 420). Toute la collection a la toile brune du tome 1, « Qui j'étais ».
 * De face, un livre ancien, tout en doré ; derrière, un livre moderne : l'image de la Bibliothèque, le résumé, un code-barres.
 */
export const CLOTH = '#4c3d30';
export const CLOTH_EDGE = '#3e3226';
const CREAM = 'rgb(232, 214, 178)';
const GILT = 'rgb(222, 188, 112)';
const SCRIPT = "'Great Vibes', cursive";
/** Le plat de la maquette (300 × 420), et du plat de la maquette au plat du jeu (800 × 1000). */
const W = 300;
const H = 420;
const SX = WIDTH / W;
const SY = HEIGHT / H;
/** L'ombre de la charnière, côté dos : 14 de large. */
const HINGE = 14;
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];

/** Les polices des couvertures : chargées avant de les dessiner. */
export const loadTomeFonts = (): Promise<unknown> =>
  Promise.all(
    [`40px ${SERIF}`, `italic 40px ${SERIF}`, `400 40px ${TITLE}`, `600 40px ${TITLE}`, `400 40px ${SCRIPT}`].map((font) =>
      document.fonts.load(font),
    ),
  );

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

/**
 * Une ligne centrée sur (x, y) de la maquette (milieu de la ligne), la police à `size` de la maquette ; rétrécie s'il le faut
 * pour tenir dans `fit` de large.
 */
const line = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: (size: number) => string,
  size: number,
  color: string,
  { spacing = 0, fit = Infinity }: { spacing?: number; fit?: number } = {},
): void => {
  context.save();
  context.font = font(size * SX);
  context.letterSpacing = `${spacing * SX}px`;
  const k = Math.min(1, (fit * SX) / context.measureText(text).width);
  context.translate(x * SX, y * SY);
  context.scale(k, k);
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, (spacing * SX) / 2, 0);
  context.restore();
};

/** Le titre du tome en une ou deux lignes : coupé au mot le plus près du milieu s'il est long. */
const titleLines = (title: string): string[] => {
  const words = title.split(' ');
  if (title.length <= 12 || words.length < 2) return [title];
  const gap = (i: number): number => Math.abs(words.slice(0, i).join(' ').length - title.length / 2);
  let best = 1;
  for (let i = 2; i < words.length; i++) if (gap(i) < gap(best)) best = i;
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
};

/** Le bandeau du dos, qui traverse aussi le plat : sombre, deux filets dorés, de 53 % à 72 % de la hauteur. */
const band = (context: CanvasRenderingContext2D): void => {
  const top = 0.53 * HEIGHT;
  const height = 0.19 * HEIGHT;
  context.fillStyle = 'rgba(20, 14, 10, 0.55)';
  context.fillRect(0, top, WIDTH, height);
  context.fillStyle = GILT;
  context.fillRect(0, top - (6 * HEIGHT) / 512, WIDTH, (3 * HEIGHT) / 512);
  context.fillRect(0, top + height + (3 * HEIGHT) / 512, WIDTH, (3 * HEIGHT) / 512);
};

/**
 * Le plat du tome `index` (0 : le tome 1) : « Vérité » en haut, à la place d'un nom d'auteur (un auteur ou un sous-titre,
 * on ne sait pas) ; le titre en Cinzel doré, un petit losange ; le bandeau avec le nom de la saga ; « TOME I » ; double filet.
 */
export const tomeFront = (index: number): THREE.CanvasTexture => {
  const [node, context] = cloth(3);
  context.fillStyle = 'rgba(0, 0, 0, 0.25)';
  context.fillRect(0, 0, HINGE * SX, HEIGHT);
  context.strokeStyle = 'rgba(222, 188, 112, 0.7)';
  context.lineWidth = SX;
  context.strokeRect(28 * SX, 28 * SY, (W - 44) * SX, (H - 56) * SY);
  context.strokeRect(33 * SX, 33 * SY, (W - 54) * SX, (H - 66) * SY);
  const saga = messages().ui.endings;
  const x = W / 2 + 6;
  line(context, saga.author.toUpperCase(), x, 66, (size) => `400 ${size}px ${TITLE}`, 13, CREAM, { spacing: 4 });
  const lines = titleLines(saga.titles[index]).map((one) => one.toUpperCase());
  // Les deux lignes d'un titre à la même taille : celle de la plus longue.
  context.font = `600 ${22 * SX}px ${TITLE}`;
  context.letterSpacing = `${2 * SX}px`;
  const k = Math.min(1, ...lines.map((one) => ((W - 96) * SX) / context.measureText(one).width));
  context.letterSpacing = '0px';
  const first = lines.length === 1 ? 132 : 114;
  lines.forEach((one, i) => line(context, one, x, first + i * 34, (size) => `600 ${size}px ${TITLE}`, 22 * k, GILT, { spacing: 2 * k }));
  // Le petit losange entre deux traits.
  context.fillStyle = GILT;
  context.fillRect((x - 40) * SX, 182 * SY, 28 * SX, SY);
  context.fillRect((x + 12) * SX, 182 * SY, 28 * SX, SY);
  context.save();
  context.translate(x * SX, 182.5 * SY);
  context.rotate(Math.PI / 4);
  context.fillRect(-3 * SX, -3 * SX, 6 * SX, 6 * SX);
  context.restore();
  band(context);
  const bandHeight = 0.19 * H;
  line(
    context,
    t('ui.endings.collection'),
    x,
    0.53 * H + bandHeight / 2 + 4,
    (size) => `400 ${size}px ${SCRIPT}`,
    bandHeight * 0.62,
    GILT,
    {
      fit: W - 90,
    },
  );
  line(context, saga.tome.replace('{n}', ROMAN[index]).toUpperCase(), x, H * 0.84, (size) => `400 ${size}px ${TITLE}`, 14, GILT, {
    spacing: 3,
  });
  return canvasTexture(node);
};

/** Un code-barres EAN (pour l'allure : les barres ne valent rien), sur son étiquette blanche, avec l'ISBN du tome. */
const barcode = (context: CanvasRenderingContext2D, x: number, y: number, index: number): void => {
  context.save();
  context.scale(SX, SY);
  context.fillStyle = '#f4f1ea';
  context.fillRect(x, y, 84, 50);
  let seed = (index + 1) * 977;
  const random = (): number => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  let bar = x + 7;
  context.fillStyle = '#111';
  for (let i = 0; i < 30 && bar < x + 77; i++) {
    const guard = i === 0 || i === 15 || i === 29;
    const width = guard ? 1 : 0.8 + Math.floor(random() * 3) * 0.8;
    context.fillRect(bar, y + 9, width, guard ? 32 : 28);
    bar += width + 0.8 + Math.floor(random() * 2) * 0.8;
  }
  const isbn = tomeIsbn(index);
  const digits = isbn.replaceAll('-', '');
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.font = `5.5px ${SANS}`;
  context.fillText(`ISBN ${isbn}`, x + 42, y + 7);
  context.font = `7px ${SANS}`;
  context.fillText(`${digits[0]} ${digits.slice(1, 7)} ${digits.slice(7)}`, x + 42, y + 47);
  context.restore();
};

/** Une salle du jeu, chargée (le plat arrière l'imprime). */
const sceneImage = (src: string): Promise<HTMLImageElement | null> =>
  new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });

/** Le haut du plat arrière : 176 de haut, jusqu'à la charnière. */
const PICTURE = 176;

/**
 * Le plat arrière du tome `index` (l'auteur, 17/10) : comme un livre moderne, la salle de la Bibliothèque du tome imprimée à
 * fond perdu (TOME_SHOTS), le résumé (la phrase au « je », puis l'éditeur), le nom de la saga, le numéro, le code-barres.
 */
export const tomeBack = async (index: number): Promise<THREE.CanvasTexture> => {
  const [node, context] = cloth(5);
  context.fillStyle = 'rgba(0, 0, 0, 0.25)';
  context.fillRect((W - HINGE) * SX, 0, HINGE * SX, HEIGHT);
  const shot = TOME_SHOTS[index];
  const image = await sceneImage(import.meta.env.BASE_URL + SCENES.find((scene) => scene.id === shot.scene)!.image);
  const [width, height] = [(W - HINGE) * SX, PICTURE * SY];
  if (image) {
    const sw = image.naturalWidth * shot.zoom;
    const sh = (sw * height) / width;
    const sx = Math.max(0, Math.min(image.naturalWidth - sw, image.naturalWidth * shot.x - sw / 2));
    const sy = Math.max(0, Math.min(image.naturalHeight - sh, image.naturalHeight * shot.y - sh / 2));
    context.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
  }
  context.fillStyle = GILT;
  context.fillRect(0, height, width, 1.5 * SY);
  const [quote, pitch] = messages().ui.endings.blurbs[index];
  const x = ((W - HINGE) / 2) * SX;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  let y = PICTURE + 38;
  context.font = `italic ${15 * SX}px ${SERIF}`;
  context.fillStyle = CREAM;
  for (const one of wrap(context, quote, (W - 80) * SX)) {
    context.fillText(one, x, y * SY);
    y += 20;
  }
  y += 10;
  context.font = `${12.5 * SX}px ${SERIF}`;
  context.fillStyle = 'rgba(232, 214, 178, 0.85)';
  for (const one of wrap(context, pitch, (W - 90) * SX)) {
    context.fillText(one, x, y * SY);
    y += 17;
  }
  // En bas : la saga et le tome à gauche, le code-barres à droite.
  context.textAlign = 'left';
  context.fillStyle = GILT;
  context.font = `400 ${17 * SX}px ${SCRIPT}`;
  context.fillText(t('ui.endings.collection'), 26 * SX, (H - 44) * SY);
  context.font = `400 ${9 * SX}px ${TITLE}`;
  context.letterSpacing = `${2 * SX}px`;
  context.fillText(messages().ui.endings.tome.replace('{n}', ROMAN[index]).toUpperCase(), 26 * SX, (H - 28) * SY);
  context.letterSpacing = '0px';
  barcode(context, W - HINGE - 26 - 84, H - 26 - 50, index);
  return canvasTexture(node);
};

/** La toile du dos et le titre du tome `index` couché dans la longueur, élargi pour un dos étroit (`thickness`, la hauteur du livre faisant 1). */
const titledCloth = (index: number, thickness: number): HTMLCanvasElement => {
  const [node, context] = cloth(7);
  const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
  context.save();
  context.translate(WIDTH / 2, 0);
  context.scale(stretch, 1);
  context.translate(0, 14 * CQW);
  context.rotate(Math.PI / 2);
  context.fillStyle = CREAM;
  context.textBaseline = 'middle';
  context.font = `${7 * CQW}px ${SERIF}`;
  // Un titre long (« Une réponse sans question ») se resserre pour s'arrêter avant le bandeau (paintTomeSpine, à 0,53).
  const title = messages().ui.endings.titles[index];
  context.scale(Math.min(1, (0.5 * HEIGHT - 14 * CQW) / context.measureText(title).width), 1);
  context.fillText(title, 0, 0);
  context.restore();
  return node;
};

/** Le dos d'un tome en texture : PX pour la hauteur du livre (sa largeur : l'épaisseur du tome). */
const PX = 512;
/** Le nom de la saga : 0,15 de la hauteur du livre, un peu plus bas que le milieu du bandeau (l'anglaise). */
const NAME_SIZE = 0.15;
const NAME_DROP = 10;

/**
 * Le dos du tome `index` (maquette validée le 16/10, .ai/maquette-meuble-des-fins.html), le même dans le meuble et en main :
 * comme les dos d'une série de BD, chaque dos porte sa part du nom de la saga (`name`, dans la langue du jeu), écrit d'un
 * trait sur toute la rangée du meuble, dans un bandeau doré (Great Vibes) ; en bas, le numéro du tome.
 */
const paintTomeSpine = (context: CanvasRenderingContext2D, index: number, name: string): void => {
  const { x, t } = TOMES[index];
  const [w, h] = [context.canvas.width, context.canvas.height];
  context.drawImage(titledCloth(index, t), 0, 0, w, h);
  // Ce qui court sur toute la rangée : le bandeau sombre, ses deux filets dorés, le nom de la saga.
  const bandTop = 0.53 * h;
  const bandHeight = 0.19 * h;
  context.fillStyle = 'rgba(20, 14, 10, 0.55)';
  context.fillRect(0, bandTop, w, bandHeight);
  context.fillStyle = GILT;
  context.fillRect(0, bandTop - 6, w, 3);
  context.fillRect(0, bandTop + bandHeight + 3, w, 3);
  context.save();
  context.translate(-(x + ROW / 2) * PX + (ROW * PX) / 2, bandTop + bandHeight / 2);
  context.font = `400 ${NAME_SIZE * PX}px ${SCRIPT}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.scale(Math.min(1, (ROW * PX * 0.9) / context.measureText(name).width), 1);
  context.fillText(name, 0, NAME_DROP);
  context.restore();
  // Le numéro du tome, en bas, dans un petit cercle doré.
  context.strokeStyle = GILT;
  context.lineWidth = 2.5;
  context.beginPath();
  context.arc(w / 2, h * 0.9, Math.min(w * 0.32, 22), 0, Math.PI * 2);
  context.stroke();
  context.font = `600 ${Math.min(w * 0.36, 26)}px ${TITLE}`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(String(index + 1), w / 2, h * 0.9 + 2);
};

/** Le dos du tome `index` en texture, pour le livre en main : le même que dans le meuble. */
export const tomeSpine = (index: number): THREE.CanvasTexture => {
  const node = document.createElement('canvas');
  node.width = Math.round(TOMES[index].t * PX);
  node.height = PX;
  paintTomeSpine(node.getContext('2d')!, index, t('ui.endings.collection'));
  return canvasTexture(node);
};
