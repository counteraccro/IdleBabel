import * as THREE from 'three';
import { getLocale, t } from '../../i18n';
import { seeded } from '../../core/random';
import { PAGE_TEXTURE } from '../book/pageLayout';
import { canvasTexture, edgeTexture } from '../book3d/textures';
import { headbandTexture } from '../book3d/headband';
import { goldBookBoard, goldBookFront, goldBookSpine, loadGoldBookCoverFonts } from './goldBookCover';
import type { BookLook } from '../book3d/bookMesh';

/** L'or des lettres, de l'ombre au reflet. */
const GOLD = ['#5e3a0a', '#a8741e', '#dcae4e', '#7e5012'];
const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

const canvas = (width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const node = document.createElement('canvas');
  node.width = width;
  node.height = height;
  return [node, node.getContext('2d')!];
};

/** Un dégradé d'or en travers de la zone (lettres, filets). */
const goldFill = (context: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): CanvasGradient => {
  const fill = context.createLinearGradient(x, y, x + w, y + h);
  GOLD.forEach((color, i) => fill.addColorStop(i / (GOLD.length - 1), color));
  return fill;
};

/** Une ligne de mots en lettres d'or, à la main, un peu de travers : une signature du livre. */
const goldLine = (context: CanvasRenderingContext2D, random: () => number, x: number, y: number, width: number): void => {
  let at = x;
  context.save();
  context.translate(0, y);
  context.rotate((random() - 0.5) * 0.02);
  while (at < x + width - 60) {
    const word = Array.from({ length: 2 + Math.floor(random() * 6) }, () => LETTERS[Math.floor(random() * LETTERS.length)]).join('');
    const size = 25 + random() * 4;
    context.font = `italic ${size}px Georgia, serif`;
    const w = context.measureText(word).width;
    if (at + w > x + width) break;
    context.globalAlpha = 0.75 + random() * 0.25;
    context.fillStyle = goldFill(context, at, -size, w, size);
    context.fillText(word, at, 0);
    at += w + 12 + random() * 8;
  }
  context.restore();
};

/** Une page du livre : papier chaud, couvert de lettres d'or ; la première porte son nom. */
const page = (seed: number, title: boolean): HTMLCanvasElement => {
  const { width, height } = PAGE_TEXTURE;
  const [node, context] = canvas(width, height);
  const paper = context.createRadialGradient(width / 2, height / 2, 60, width / 2, height / 2, width * 0.75);
  paper.addColorStop(0, '#efdcab');
  paper.addColorStop(1, '#d6b673');
  context.fillStyle = paper;
  context.fillRect(0, 0, width, height);
  const random = seeded(seed);
  const [left, right] = [70, width - 70];
  let y = 110;
  if (title) {
    context.font = `600 40px Cinzel, Georgia, serif`;
    context.textAlign = 'center';
    const name = t('goldBook.name').toUpperCase();
    context.fillStyle = goldFill(context, width / 2 - 200, 60, 400, 60);
    context.fillText(name, width / 2, 120);
    context.textAlign = 'left';
    // Un filet sous le titre, un losange au milieu.
    context.fillStyle = goldFill(context, 160, 140, 320, 10);
    context.fillRect(160, 148, 320, 2);
    context.beginPath();
    context.moveTo(width / 2, 140);
    context.lineTo(width / 2 + 9, 149);
    context.lineTo(width / 2, 158);
    context.lineTo(width / 2 - 9, 149);
    context.fill();
    y = 230;
  }
  // Des signatures : quelques lignes, un blanc, d'autres lignes.
  while (y < height - 80) {
    const lines = 2 + Math.floor(random() * 3);
    for (let i = 0; i < lines && y < height - 80; i++, y += 44)
      goldLine(context, random, left + (i ? 0 : 30), y, right - left - (i ? 0 : 30));
    y += 30;
  }
  return node;
};

/** Pages différentes, après celle du titre : elles reviennent en boucle quand les pages tournent. */
const PAGES = 6;

/**
 * Les images du livre, dessinées une fois par langue (elles portent son nom) : les redessiner à chaque ouverture, c'est des
 * centaines de milliers de grains de cuir. Chaque livre affiché en tire ses propres textures, libérées avec lui.
 */
interface Drawn {
  locale: string;
  front: HTMLCanvasElement;
  back: HTMLCanvasElement;
  inside: HTMLCanvasElement;
  spine: HTMLCanvasElement;
  pages: HTMLCanvasElement[];
}
let drawn: Drawn | null = null;

const drawAll = (): Drawn => {
  if (drawn?.locale === getLocale()) return drawn;
  drawn = {
    locale: getLocale(),
    front: goldBookFront(),
    back: goldBookBoard(9, true),
    inside: goldBookBoard(13, false),
    spine: goldBookSpine(),
    pages: [page(3, true), ...Array.from({ length: PAGES }, (_, i) => page(8 + 5 * i, false))],
  };
  return drawn;
};

/**
 * L'apparence du Livre d'or : maroquin rouge poussé à l'or (goldBookCover.ts), tranche dorée, pages couvertes d'or, signet
 * rouge. `pages` : la page n (0 : le titre).
 */
export const goldBookLook = async (): Promise<{ look: BookLook; pages: (n: number) => THREE.Texture }> => {
  await Promise.all([document.fonts.load('600 40px Cinzel'), loadGoldBookCoverFonts()]);
  const images = drawAll();
  const pages = images.pages.map(canvasTexture);
  return {
    look: {
      cover: canvasTexture(images.front),
      back: canvasTexture(images.back),
      inside: canvasTexture(images.inside),
      spine: canvasTexture(images.spine),
      leather: 0xffffff,
      edge: edgeTexture('#e8c060', '#9a6a1c'),
      paper: 0xe4c88a,
      headband: headbandTexture('#d4a23e', '#7a1e1e'),
      ribbon: 0x8a1c1c,
    },
    pages: (n: number) => pages[n === 0 ? 0 : 1 + ((n - 1) % PAGES)],
  };
};
