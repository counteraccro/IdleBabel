import { messages } from '../../../i18n';
import { coverDesign } from '../../../systems/coverDesign';
import { STRANGE_BOOK_INDEX } from '../../../systems/strangeBook';
import { ALBUM_SLOTS, rareAt } from '../../../systems/stickerAlbum';
import { coverFront } from '../../book3d/coverFront';
import { HEIGHT, WIDTH, board, plainBoard } from '../draw';
import { BLUE, C, H, POP, RED, W, YELLOW, text } from './albumDraw';
import { STICKER_H, STICKER_W, sticker } from './albumStickers';
import type { GameState } from '../../../core/state';
import type * as THREE from 'three';

/**
 * La couverture de l'album, piste A de .ai/maquette-album-autocollants.html (choisie le 22/10) : un album de cour de récré,
 * des rayons jaunes et bleus, des alvéoles en filigrane, le grand titre bombé, un éventail de cinq vrais autocollants (des
 * livres que le joueur a lus) et la pastille du nombre d'images. Dessinée dans les unités de la maquette (640 × 800).
 */

const K = WIDTH / 640;
const EDGE = '#123f7a';

const texts = () => messages().rareBooks.stickerAlbum;

/** Les rayons autour de `y`, et les alvéoles en filigrane. */
const rays = (context: CanvasRenderingContext2D, y: number): void => {
  context.fillStyle = BLUE;
  context.fillRect(0, 0, W, H);
  context.save();
  context.translate(C, y);
  for (let k = 0; k < 24; k++) {
    context.rotate(Math.PI / 12);
    context.fillStyle = k % 2 ? '#2c7ad6' : '#f7c51e';
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(-90, -900);
    context.lineTo(90, -900);
    context.fill();
  }
  context.restore();
  context.strokeStyle = 'rgba(255,255,255,0.18)';
  context.lineWidth = 2;
  for (let y = 0; y < H; y += 52)
    for (let x = (y / 52) % 2 ? 30 : 0; x < W; x += 60) {
      context.beginPath();
      for (let a = 0; a < 6; a++) context.lineTo(x + 18 * Math.cos((a * Math.PI) / 3), y + 18 * Math.sin((a * Math.PI) / 3));
      context.closePath();
      context.stroke();
    }
};

/** Un bandeau rouge, en haut ou en bas, et son texte blanc. */
const band = (context: CanvasRenderingContext2D, top: number, height: number, label: string, size: number): void => {
  context.fillStyle = RED;
  context.fillRect(0, top, W, height);
  text(context, label, C, top + height / 2 + size * 0.36, `${size}px ${POP}`, '#fff');
};

/** Le titre bombé : jaune, liseré blanc, ombre rouge sombre. */
const bigTitle = (context: CanvasRenderingContext2D, lines: string[]): void => {
  context.save();
  context.lineJoin = 'round';
  context.textAlign = 'center';
  lines.forEach((line, i) => {
    let size = i ? 74 : 58;
    do context.font = `${size--}px ${POP}`;
    while (context.measureText(line).width > W - 70 && size > 20);
    const y = i ? 214 : 148;
    context.lineWidth = 16;
    context.strokeStyle = '#7a0f16';
    context.strokeText(line, C, y);
    context.lineWidth = 8;
    context.strokeStyle = '#ffffff';
    context.strokeText(line, C, y);
    context.fillStyle = YELLOW;
    context.fillText(line, C, y);
  });
  context.restore();
};

/** La pastille étoilée du nombre d'images. */
const starBadge = (context: CanvasRenderingContext2D, x: number, y: number, count: number, label: string): void => {
  context.save();
  context.translate(x, y);
  context.rotate(-0.2);
  context.fillStyle = RED;
  context.beginPath();
  for (let a = 0; a < 24; a++) {
    const r = a % 2 ? 54 : 66;
    context.lineTo(r * Math.cos((a * Math.PI) / 12), r * Math.sin((a * Math.PI) / 12));
  }
  context.fill();
  text(context, String(count), 0, 2, `34px ${POP}`, YELLOW);
  text(context, label, 0, 24, `15px ${POP}`, '#fff');
  context.restore();
};

/** Les livres de l'éventail : un livre moderne, le premier livre, une bande dessinée, le livre étrange, une autobiographie. */
const FAN_SEARCH = 3000;
const fanBooks = (state: GameState): number[] => {
  const read = state.booksFinished;
  const first = (wanted: (book: number) => boolean): number | undefined => {
    for (let book = 0; book < Math.min(read, FAN_SEARCH); book++) if (!rareAt(state, book) && wanted(book)) return book;
    return undefined;
  };
  const kind = (book: number) => coverDesign(book).details?.kind ?? 'none';
  const picks = [
    first((book) => book !== STRANGE_BOOK_INDEX && coverDesign(book).modern && kind(book) === 'none'),
    0,
    first((book) => kind(book) === 'comic'),
    read > STRANGE_BOOK_INDEX ? STRANGE_BOOK_INDEX : undefined,
    first((book) => kind(book) === 'autobiography'),
  ];
  // Ce qui manque (une partie courte) : les premiers livres lus.
  const spare = [1, 3, 4, 5, 6].filter((book) => !picks.includes(book));
  return picks.map((book) => book ?? spare.shift()!);
};

const fan = (context: CanvasRenderingContext2D, images: (HTMLCanvasElement | null)[], books: number[]): void => {
  const spread = 0.32;
  images.forEach((image, k) => {
    const angle = (k - (images.length - 1) / 2) * spread;
    context.save();
    context.translate(C + angle * 330, 470 + Math.abs(angle) * 120);
    context.rotate(angle);
    context.scale(1.25, 1.25);
    sticker(context, -STICKER_W / 2, -STICKER_H / 2, books[k] + 1, image, false, books[k]);
    context.restore();
  });
};

/** Le plat de devant : ses cinq autocollants sont dessinés d'abord (des livres de cette partie). */
export const albumFront = async (state: GameState): Promise<THREE.CanvasTexture> => {
  const books = fanBooks(state);
  const images = await Promise.all(books.map((book) => coverFront(book).catch(() => null)));
  const book = texts();
  return board(BLUE, EDGE, (context) => {
    context.scale(K, K);
    rays(context, 470);
    band(context, 0, 64, book.band, 28);
    bigTitle(context, book.titleLines);
    fan(context, images, books);
    starBadge(context, 520, 640, ALBUM_SLOTS.length, book.badge);
    band(context, H - 56, 56, book.publisher, 20);
  });
};

/** Le plat arrière : le même album, le slogan, trois lignes, une rangée de cases vides. */
export const albumBack = (): THREE.CanvasTexture =>
  board(BLUE, EDGE, (context) => {
    const book = texts();
    context.scale(K, K);
    rays(context, 520);
    band(context, 0, 64, book.band, 28);
    context.save();
    context.lineJoin = 'round';
    context.textAlign = 'center';
    let size = 46;
    do context.font = `${size--}px ${POP}`;
    while (context.measureText(book.backTitle).width > W - 70 && size > 20);
    context.lineWidth = 10;
    context.strokeStyle = '#7a0f16';
    context.strokeText(book.backTitle, C, 150);
    context.fillStyle = YELLOW;
    context.fillText(book.backTitle, C, 150);
    context.restore();
    // Le texte, sur un cartouche blanc.
    context.fillStyle = 'rgba(255,255,255,0.92)';
    context.beginPath();
    context.roundRect(70, 200, W - 140, 150, 14);
    context.fill();
    book.back.forEach((line, i) => text(context, line, C, 245 + i * 40, `20px ${POP}`, BLUE));
    // Trois cases vides, numérotées.
    [1, 2, 3].forEach((n, i) => {
      const x = C - 1.5 * 150 + 16 + i * 150;
      context.fillStyle = 'rgba(255,255,255,0.85)';
      context.beginPath();
      context.roundRect(x, 420, 118, 147, 6);
      context.fill();
      context.setLineDash([5, 4]);
      context.strokeStyle = 'rgba(29,95,184,0.6)';
      context.lineWidth = 2;
      context.stroke();
      context.setLineDash([]);
      text(context, String(n), x + 59, 510, `46px ${POP}`, 'rgba(29,95,184,0.35)');
    });
    starBadge(context, 520, 650, ALBUM_SLOTS.length, book.badge);
    band(context, H - 56, 56, book.publisher, 20);
  });

/** Le dos : rouge, le titre en long, en jaune. */
export const albumSpine = (thickness: number): THREE.CanvasTexture =>
  board(RED, '#8a1119', (context) => {
    // Dessiné sans déformation : `w` est la largeur visible du dos, à l'échelle de la maquette.
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const scale = HEIGHT / H;
    const w = WIDTH / stretch / scale;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch * scale, scale);
    context.translate(-w / 2, 0);
    context.fillStyle = RED;
    context.fillRect(0, 0, w, H);
    context.fillStyle = YELLOW;
    context.fillRect(0, 46, w, 6);
    context.fillRect(0, H - 52, w, 6);
    context.translate(w / 2, H / 2);
    context.rotate(Math.PI / 2);
    const title = texts().spine;
    let size = 40;
    do context.font = `${size--}px ${POP}`;
    while (context.measureText(title).width > H - 160 && size > 12);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = YELLOW;
    context.fillText(title, 0, 2);
    context.restore();
  });

/** Les contre-plats : le carton bleu, sans rien. */
export const albumInside = (): THREE.CanvasTexture => plainBoard(BLUE, EDGE);
