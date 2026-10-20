import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board, plainBoard } from '../draw';
import { BIG, CLUE, GOLD, GRID, H, INK, NAVY, RED, ROUND, TEAL, W, fit, outlined, rng, text } from './puzzlesDraw';
import type * as THREE from 'three';

/**
 * La couverture de « 410 grilles de JEUX » (maquette .ai/maquette-livre-jeux.html, validée le 20/10), d'après le modèle de
 * l'auteur, « 200 grilles de jeux, un crayon offert » : reliure jaune d'or, cadre blanc, grilles en vrac, titre bordé de
 * blanc, bandeau rouge des trois jeux, pastille « Nouvelles grilles chaque jour ! ». Pas de crayon (« il va falloir le
 * modéliser en 3D sinon »). Éditeur inventé, les Éditions de la Tour. Dessinée aux unités de la maquette (plat 640 × 800,
 * dos 120 × 800), mises à l'échelle.
 */

const K = WIDTH / W;
const texts = () => messages().rareBooks.puzzles;

/** Un plat jaune, dessiné aux unités de la maquette. */
const cover = (draw: (context: CanvasRenderingContext2D) => void): THREE.CanvasTexture =>
  board(GOLD, GOLD, (context) => {
    context.save();
    context.scale(K, K);
    draw(context);
    context.restore();
  });

/** Le cadre blanc arrondi sur le jaune. */
const frame = (context: CanvasRenderingContext2D): void => {
  context.fillStyle = GOLD;
  context.fillRect(0, 0, W, H);
  context.fillStyle = '#fbfaf6';
  context.beginPath();
  context.roundRect(26, 26, W - 52, H - 52, 26);
  context.fill();
};

type SheetKind = 'sudoku' | 'arrows' | 'crossword';

/** Une feuille de jeu en vrac sous le titre : blanche, penchée, avec sa grille. */
const sheet = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  angle: number,
  kind: SheetKind,
  seed: number,
): void => {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.shadowColor = 'rgba(0,0,0,0.18)';
  context.shadowBlur = 10;
  context.shadowOffsetY = 3;
  context.fillStyle = '#fff';
  context.fillRect(-w / 2, -h / 2, w, h);
  context.shadowColor = 'transparent';
  const random = rng(seed);
  const n = kind === 'sudoku' ? 9 : 8;
  const size = (w - 30) / n;
  const [gx, gy] = [-w / 2 + 15, -h / 2 + 34];
  context.fillStyle = kind === 'sudoku' ? TEAL : kind === 'arrows' ? GOLD : RED;
  context.fillRect(-w / 2 + 15, -h / 2 + 10, w * 0.45, 14);
  for (let i = 0; i < n * n; i++) {
    const [cx, cy] = [gx + (i % n) * size, gy + Math.floor(i / n) * size];
    if (cy + size > h / 2 - 8) continue;
    if (kind === 'arrows' && random() < 0.22) {
      context.fillStyle = CLUE;
      context.fillRect(cx, cy, size, size);
    }
    if (kind === 'crossword' && random() < 0.15) {
      context.fillStyle = INK;
      context.fillRect(cx, cy, size, size);
    }
    if (kind === 'sudoku' && random() < 0.4)
      text(context, String(1 + Math.floor(random() * 9)), cx + size / 2, cy + size * 0.75, `700 ${size * 0.6}px ${GRID}`, INK);
    context.strokeStyle = '#555';
    context.lineWidth = kind === 'sudoku' && (i % n) % 3 === 0 ? 1.5 : 0.6;
    context.strokeRect(cx, cy, size, size);
  }
  context.restore();
};

/** Le petit rond de l'éditeur. */
const publisher = (context: CanvasRenderingContext2D, x: number, y: number, radius: number, size: number): void => {
  const name = texts().publisher;
  context.fillStyle = NAVY;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
  text(context, name, x, y + size * 0.42, `${fit(context, name, (px) => `${px}px ${BIG}`, size, radius * 1.7)}px ${BIG}`, '#fff');
};

export const puzzlesFront = (): THREE.CanvasTexture =>
  cover((f) => {
    const book = texts();
    const [a, b, c, d] = book.title;
    frame(f);
    f.save();
    f.beginPath();
    f.roundRect(26, 26, W - 52, H - 52, 26);
    f.clip();
    sheet(f, 120, 110, 190, 230, -0.18, 'crossword', 3);
    sheet(f, 540, 170, 200, 250, 0.14, 'arrows', 5);
    sheet(f, 110, 660, 210, 260, 0.1, 'sudoku', 7);
    sheet(f, 520, 690, 200, 240, -0.12, 'crossword', 9);
    // Le cadre clair du titre, comme sur le modèle.
    f.fillStyle = '#d4f0ee';
    f.beginPath();
    f.roundRect(70, 120, 470, 330, 34);
    f.fill();
    f.restore();
    outlined(f, a, 300, 230, `${a.length > 3 ? 88 : 120}px ${BIG}`, GOLD, '#fff', 14);
    outlined(f, b, 300, 300, `600 ${fit(f, b, (px) => `600 ${px}px ${ROUND}`, b.length > 7 ? 62 : 76, 420)}px ${ROUND}`, TEAL, '#fff', 10);
    if (c) outlined(f, c, 300, 345, `600 40px ${ROUND}`, NAVY, '#fff', 8);
    outlined(f, d, 300, 438, `${fit(f, d, (px) => `${px}px ${BIG}`, 112, 420)}px ${BIG}`, NAVY, '#fff', 14);
    // Le bandeau rouge : la liste des jeux.
    f.fillStyle = RED;
    f.beginPath();
    f.roundRect(150, 480, 330, 168, 18);
    f.fill();
    book.games.forEach((game, i) =>
      text(
        f,
        `•  ${game}`,
        182,
        530 + i * 44,
        `600 ${fit(f, `•  ${game}`, (px) => `600 ${px}px ${ROUND}`, 30, 280)}px ${ROUND}`,
        '#fff',
        'left',
      ),
    );
    // La pastille.
    f.save();
    f.translate(486, 470);
    f.rotate(0.2);
    f.fillStyle = TEAL;
    f.beginPath();
    f.arc(0, 0, 74, 0, Math.PI * 2);
    f.fill();
    f.strokeStyle = '#fff';
    f.lineWidth = 4;
    f.beginPath();
    f.arc(0, 0, 66, 0, Math.PI * 2);
    f.stroke();
    const [first, second, third] = book.badge;
    text(f, first, 0, -16, `600 ${fit(f, first, (px) => `600 ${px}px ${ROUND}`, 21, 110)}px ${ROUND}`, '#fff');
    text(f, second, 0, 8, `600 ${fit(f, second, (px) => `600 ${px}px ${ROUND}`, 21, 110)}px ${ROUND}`, '#fff');
    text(f, third, 0, 32, `600 ${fit(f, third, (px) => `600 ${px}px ${ROUND}`, 18, 110)}px ${ROUND}`, '#fff');
    f.restore();
    // L'éditeur, en bas à gauche.
    publisher(f, 70, H - 70, 26, 14);
  });

/** Le dos : jaune, le titre en long bordé de bleu nuit, le rond de l'éditeur en bas. */
export const puzzlesSpine = (thickness: number): THREE.CanvasTexture =>
  board(GOLD, GOLD, (context) => {
    const book = texts();
    // Dessiné sans déformation, à l'échelle de la maquette : `w` est la largeur visible du dos.
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const scale = HEIGHT / H;
    const w = WIDTH / stretch / scale;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch * scale, scale);
    context.translate(-w / 2, 0);
    context.fillStyle = GOLD;
    context.fillRect(0, 0, w, H);
    context.fillStyle = 'rgba(0,0,0,0.08)';
    context.fillRect(0, 0, w * 0.08, H);
    context.fillRect(w * 0.92, 0, w * 0.08, H);
    publisher(context, w / 2, H - 50, Math.min(22, w * 0.4), 12);
    context.translate(w / 2, H / 2);
    context.rotate(Math.PI / 2);
    const title = book.title.filter(Boolean).join(' ').toUpperCase();
    outlined(context, title, 0, 18, `${fit(context, title, (px) => `${px}px ${BIG}`, 50, H - 180)}px ${BIG}`, '#fff', NAVY, 8);
    context.restore();
  });

export const puzzlesBack = (): THREE.CanvasTexture =>
  cover((k) => {
    const book = texts();
    frame(k);
    const [top, bottom] = book.backTitle;
    outlined(k, top, W / 2, 170, `${fit(k, top, (px) => `${px}px ${BIG}`, 56, W - 120)}px ${BIG}`, TEAL, '#fff', 8);
    outlined(k, bottom, W / 2, 236, `${fit(k, bottom, (px) => `${px}px ${BIG}`, 46, W - 120)}px ${BIG}`, GOLD, '#fff', 8);
    book.backList.forEach((line, i) =>
      text(
        k,
        `•  ${line}`,
        90,
        330 + i * 48,
        `500 ${fit(k, `•  ${line}`, (px) => `500 ${px}px ${ROUND}`, 26, W - 160)}px ${ROUND}`,
        NAVY,
        'left',
      ),
    );
    text(
      k,
      book.backLine,
      W / 2,
      560,
      `italic 500 ${fit(k, book.backLine, (px) => `italic 500 ${px}px ${ROUND}`, 24, W - 120)}px ${ROUND}`,
      '#7a7060',
    );
    // Le code-barres.
    k.fillStyle = '#fff';
    k.fillRect(W - 250, H - 170, 180, 100);
    const random = rng(41);
    for (let x = W - 240; x < W - 80; x += 3)
      if (random() < 0.55) {
        k.fillStyle = INK;
        k.fillRect(x, H - 160, 1 + Math.floor(random() * 2), 64);
      }
    text(k, '9 782410 004101', W - 160, H - 82, `500 13px ${GRID}`, INK);
  });

/** Les contre-plats : le carton jaune, sans rien. */
export const puzzlesInside = (): THREE.CanvasTexture => plainBoard(GOLD, '#d98f10');
