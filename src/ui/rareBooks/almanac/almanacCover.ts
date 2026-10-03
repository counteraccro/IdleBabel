import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board, wrap } from '../draw';
import { CONDENSED, chrome, fit, grid, hexagon, mark, pictoRow, text } from './almanacDraw';
import type * as THREE from 'three';

/**
 * La couverture de l'Almanach des sports (maquette .ai/maquette-almanach.html, piste A « Chrome 85 ») : un
 * livre de poche de kiosque des années 80. Bleu nuit, titre chromé, soleil couchant rayé, horizon quadrillé.
 * Un clin d'œil au film, sans rien reprendre de l'objet du film (ni nom, ni logo, ni mise en page).
 */

export const NIGHT = '#0b1030';
export const NIGHT_EDGE = '#07040e';
export const RED = '#e8322a';
const ORANGE = '#ffb21a';
const GOLD = '#ffd23a';
const VIOLET = '#2a1458';
const NEON = 'rgba(80,220,255,0.75)';
/** Le dos de la maquette : 160 de large pour 1000 de haut. */
export const SPINE_WIDTH = 160;

/** Le ciel de nuit, l'horizon rouge à 62 %, le sol presque noir. */
const sky = (context: CanvasRenderingContext2D): void => {
  const night = context.createLinearGradient(0, 0, 0, HEIGHT);
  night.addColorStop(0, NIGHT);
  night.addColorStop(0.55, VIOLET);
  night.addColorStop(0.62, '#e0503a');
  night.addColorStop(0.64, '#1a0a2a');
  night.addColorStop(1, NIGHT_EDGE);
  context.fillStyle = night;
  context.fillRect(0, 0, WIDTH, HEIGHT);
};

/** Le soleil couchant posé sur l'horizon (`horizon`), rayé de bandes de ciel. */
const sun = (context: CanvasRenderingContext2D, horizon: number): void => {
  context.save();
  context.beginPath();
  context.rect(0, 0, WIDTH, horizon);
  context.clip();
  const glow = context.createLinearGradient(0, horizon - 160, 0, horizon);
  glow.addColorStop(0, GOLD);
  glow.addColorStop(1, '#ff3d6e');
  context.fillStyle = glow;
  context.beginPath();
  context.arc(WIDTH / 2, horizon, 160, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = VIOLET;
  for (let band = 0; band < 6; band++) context.fillRect(0, horizon - 70 + band * 12, WIDTH, 2 + band * 1.4);
  context.restore();
};

/** Les deux filets du haut, rouge et orange, à `y`. */
const stripes = (context: CanvasRenderingContext2D, y: number, width: number): void => {
  context.fillStyle = RED;
  context.fillRect(0, y, width, 10);
  context.fillStyle = ORANGE;
  context.fillRect(0, y + 14, width, 6);
};

export const almanacFront = (): THREE.CanvasTexture =>
  board(NIGHT, NIGHT_EDGE, (context) => {
    const texts = messages().rareBooks.almanac;
    sky(context);
    sun(context, 630);
    grid(context, 630, HEIGHT, NEON);
    stripes(context, 56, WIDTH);
    text(context, texts.edition, WIDTH / 2, 46, `500 26px ${CONDENSED}`, '#ffffff', 'center', 8);
    const [first, second] = texts.title;
    chrome(context, first, WIDTH / 2, 270, fit(context, first, 150, 720));
    chrome(context, second, WIDTH / 2, 400, fit(context, second, 112, 720));
    text(context, texts.years, WIDTH / 2, 480, `700 64px ${CONDENSED}`, GOLD, 'center', 10);
    pictoRow(context, 770, '#ffffff', 0.9);
    text(context, texts.tagline, WIDTH / 2, 890, `italic 300 34px ${CONDENSED}`, '#e8f6ff');
    mark(context, texts.mark, 40, 966, '#ffffff', NIGHT_EDGE);
    text(context, texts.sports, WIDTH - 40, 966, `500 22px ${CONDENSED}`, '#9fe8ff', 'right', 1);
  });

/**
 * Le plat arrière (inventé, dans le style du plat) : le même ciel sans le soleil (le texte s'y lit mieux),
 * l'accroche chromée, le texte de présentation, le prix et le code-barres ; l'horizon quadrillé en bas.
 */
export const almanacBack = (): THREE.CanvasTexture =>
  board(NIGHT, NIGHT_EDGE, (context) => {
    const texts = messages().rareBooks.almanac;
    sky(context);
    grid(context, 630, HEIGHT, NEON);
    stripes(context, 56, WIDTH);
    chrome(context, texts.backTitle, WIDTH / 2, 190, fit(context, texts.backTitle, 96, 680));
    context.font = `300 30px ${CONDENSED}`;
    let y = 270;
    for (const paragraph of texts.blurb) {
      for (const line of wrap(context, paragraph, 620)) {
        text(context, line, WIDTH / 2, y, `300 30px ${CONDENSED}`, '#e8f6ff');
        y += 40;
      }
      y += 18;
    }
    text(context, texts.warning, WIDTH / 2, y + 12, `italic 500 28px ${CONDENSED}`, GOLD, 'center', 1);
    // Le prix et le code-barres, sur une étiquette blanche.
    context.fillStyle = '#f6f1e4';
    context.fillRect(WIDTH - 230, 860, 190, 110);
    let seed = 1950;
    context.fillStyle = '#141414';
    for (let x = WIDTH - 215; x < WIDTH - 60; ) {
      seed = (seed * 16807) % 2147483647;
      const width = 2 + (seed % 4);
      context.fillRect(x, 872, width, 60);
      x += width + 2 + (seed % 3);
    }
    text(context, texts.price, WIDTH - 135, 958, `700 22px ${CONDENSED}`, '#141414', 'center', 2);
    mark(context, texts.mark, 40, 966, '#ffffff', NIGHT_EDGE);
  });

/** Le dos : filets en haut, le titre chromé en long, les années, le sceau. */
export const almanacSpine = (): THREE.CanvasTexture =>
  board(NIGHT, NIGHT_EDGE, (context) => {
    const texts = messages().rareBooks.almanac;
    context.scale(WIDTH / SPINE_WIDTH, 1);
    const round = context.createLinearGradient(0, 0, SPINE_WIDTH, 0);
    round.addColorStop(0, '#05081c');
    round.addColorStop(0.5, '#141a44');
    round.addColorStop(1, '#05081c');
    context.fillStyle = round;
    context.fillRect(0, 0, SPINE_WIDTH, HEIGHT);
    stripes(context, 56, SPINE_WIDTH);
    const size = fit(context, texts.spine, 92, 680);
    context.save();
    context.translate(SPINE_WIDTH / 2, 460);
    context.rotate(Math.PI / 2);
    chrome(context, texts.spine, 0, size * 0.36, size);
    context.restore();
    const [from, to] = texts.spineYears;
    text(context, from, SPINE_WIDTH / 2, 860, `700 40px ${CONDENSED}`, GOLD);
    text(context, to, SPINE_WIDTH / 2, 900, `700 40px ${CONDENSED}`, GOLD);
    hexagon(context, SPINE_WIDTH / 2, 950, 18, 4, '#fff', '#fff');
    hexagon(context, SPINE_WIDTH / 2, 950, 7, 3, '#141a44');
  });

/** Les contre-plats : le bleu nuit du ciel, sans rien. */
export const almanacInside = (): THREE.CanvasTexture => board('#141a44', NIGHT_EDGE);
