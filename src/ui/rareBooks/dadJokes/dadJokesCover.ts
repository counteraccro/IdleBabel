import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board, plainBoard, wrap } from '../draw';
import { CONDENSED, ROUND, bubble, burst, fit, glasses, hexagon, mark, moustache, outlined, sunburst, text } from './dadJokesDraw';
import type * as THREE from 'three';

/**
 * La couverture des Jokes de Papa (maquette .ai/maquette-jokes-papa.html, piste A « Le livre-cadeau ») : un
 * livre d'humour d'aujourd'hui, de ceux qu'on offre à la fête des pères. Jaune vif, grosses lettres rondes,
 * les lunettes et la moustache de papa qui demandent « Tu la connais, celle-là ? ». Aucune marque.
 */

export const YELLOW = '#ffd23f';
export const YELLOW_EDGE = '#f7bf1e';
export const RED = '#e8392c';
export const BLACK = '#1d1a17';
const CREAM = '#fff6e0';
/** Le dos de la maquette : 160 de large pour 1000 de haut. */
export const SPINE_WIDTH = 160;

/** Le bandeau noir du bas, à partir de `top`. */
const footer = (context: CanvasRenderingContext2D, top: number): void => {
  context.fillStyle = BLACK;
  context.fillRect(0, top, WIDTH, HEIGHT - top);
};

/** Une ligne du titre, penchée comme dans la maquette, réduite au besoin pour tenir dans 720. */
const titleLine = (context: CanvasRenderingContext2D, label: string, y: number, size: number, fill: string, width: number): void => {
  context.save();
  context.translate(WIDTH / 2, y);
  context.rotate(-0.05);
  outlined(context, label, 0, 0, `${fit(context, label, size, 720)}px ${ROUND}`, fill, BLACK, width, BLACK);
  context.restore();
};

export const dadJokesFront = (): THREE.CanvasTexture =>
  board(YELLOW, YELLOW_EDGE, (context) => {
    const texts = messages().rareBooks.dadJokes;
    sunburst(context, 600);
    const [small, big, below] = texts.title;
    outlined(context, small, WIDTH / 2, 128, `${fit(context, small, 74, 720)}px ${ROUND}`, CREAM, BLACK, 16);
    titleLine(context, big, 310, 210, RED, 22);
    titleLine(context, below, 420, 110, CREAM, 18);
    // Papa : ses lunettes, sa moustache, et sa question.
    glasses(context, 400, 625, 62, BLACK, 'rgba(255,255,255,0.35)');
    moustache(context, 400, 760, 150, BLACK);
    bubble(context, 560, 512, 300, 120, 470, 590, '#ffffff', BLACK);
    const [ask, ask2] = texts.bubble;
    text(context, ask, 560, 505, `36px ${ROUND}`, BLACK);
    text(context, ask2, 560, 545, `36px ${ROUND}`, BLACK);
    // La pastille.
    burst(context, 150, 560, 104, 14, RED, 0.2);
    context.save();
    context.translate(150, 560);
    context.rotate(-0.18);
    const [count, jokes, tested] = texts.badge;
    text(context, count, 0, -10, `40px ${ROUND}`, CREAM);
    text(context, jokes, 0, 24, `28px ${ROUND}`, CREAM);
    text(context, tested, 0, 52, `500 19px ${CONDENSED}`, YELLOW);
    context.restore();
    footer(context, 880);
    text(context, texts.banner, WIDTH / 2, 930, `${fit(context, texts.banner, 40, 700, 4)}px ${ROUND}`, YELLOW, 'center', 4);
    mark(context, texts.mark, 40, 975, CREAM, BLACK);
    text(context, texts.shelf, WIDTH - 40, 975, `500 22px ${CONDENSED}`, '#c9bfa6', 'right', 1);
  });

/**
 * Le plat arrière (inventé, dans le style du plat) : les mêmes rayons, la moustache, une accroche cernée,
 * le texte de présentation sur une carte blanche, le prix et le code-barres ; le bandeau noir en bas.
 */
export const dadJokesBack = (): THREE.CanvasTexture =>
  board(YELLOW, YELLOW_EDGE, (context) => {
    const texts = messages().rareBooks.dadJokes;
    sunburst(context, 260);
    moustache(context, WIDTH / 2, 150, 90, BLACK);
    context.save();
    context.translate(WIDTH / 2, 300);
    context.rotate(-0.05);
    outlined(context, texts.backTitle, 0, 0, `${fit(context, texts.backTitle, 96, 680)}px ${ROUND}`, RED, BLACK, 16, BLACK);
    context.restore();
    // La carte blanche du texte, cernée de noir.
    context.save();
    context.translate(WIDTH / 2, 560);
    context.rotate(0.02);
    context.fillStyle = BLACK;
    context.fillRect(-300 + 8, -170 + 8, 600, 340);
    context.fillStyle = '#ffffff';
    context.fillRect(-300, -170, 600, 340);
    context.lineWidth = 6;
    context.strokeStyle = BLACK;
    context.strokeRect(-300, -170, 600, 340);
    // Le texte, centré dans la carte.
    context.font = `500 34px ${CONDENSED}`;
    const paragraphs = texts.blurb.map((paragraph) => wrap(context, paragraph, 520));
    const lines = paragraphs.reduce((count, paragraph) => count + paragraph.length, 0);
    let y = -((lines - 1) * 46 + (paragraphs.length - 1) * 20) / 2 + 12;
    for (const paragraph of paragraphs) {
      for (const line of paragraph) {
        text(context, line, 0, y, `500 34px ${CONDENSED}`, BLACK);
        y += 46;
      }
      y += 20;
    }
    context.restore();
    text(context, texts.warning, WIDTH / 2, 800, `34px ${ROUND}`, BLACK, 'center', 2);
    footer(context, 880);
    // Le prix et le code-barres, sur une étiquette blanche qui déborde sur le bandeau.
    context.fillStyle = '#ffffff';
    context.fillRect(WIDTH - 230, 840, 190, 130);
    let seed = 1977;
    context.fillStyle = BLACK;
    for (let x = WIDTH - 215; x < WIDTH - 60;) {
      seed = (seed * 16807) % 2147483647;
      const width = 2 + (seed % 4);
      context.fillRect(x, 852, width, 70);
      x += width + 2 + (seed % 3);
    }
    text(context, texts.price, WIDTH - 135, 956, `500 24px ${CONDENSED}`, BLACK, 'center', 2);
    mark(context, texts.mark, 40, 975, CREAM, BLACK);
  });

/** Le dos : un filet rouge en haut, le titre cerné en long, la moustache, le sceau sur le bandeau noir. */
export const dadJokesSpine = (): THREE.CanvasTexture =>
  board(YELLOW, YELLOW_EDGE, (context) => {
    const texts = messages().rareBooks.dadJokes;
    context.scale(WIDTH / SPINE_WIDTH, 1);
    context.fillStyle = '#fbcb2c';
    context.fillRect(0, 0, SPINE_WIDTH, HEIGHT);
    context.fillStyle = BLACK;
    context.fillRect(0, 880, SPINE_WIDTH, 120);
    context.fillStyle = RED;
    context.fillRect(0, 0, SPINE_WIDTH, 26);
    const size = fit(context, texts.spine, 90, 640, 2);
    context.save();
    context.translate(SPINE_WIDTH / 2, 470);
    context.rotate(Math.PI / 2);
    outlined(context, texts.spine, 0, size * 0.36, `${size}px ${ROUND}`, RED, BLACK, 10);
    context.restore();
    moustache(context, SPINE_WIDTH / 2, 830, 44, BLACK);
    hexagon(context, SPINE_WIDTH / 2, 940, 20, 4, CREAM, CREAM);
    hexagon(context, SPINE_WIDTH / 2, 940, 8, 3, BLACK);
  });

/** Les contre-plats : le jaune du plat, sans rien. */
export const dadJokesInside = (): THREE.CanvasTexture => plainBoard(YELLOW, YELLOW_EDGE);
