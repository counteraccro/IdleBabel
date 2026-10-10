import '@fontsource/cinzel-decorative/900.css';
import '@fontsource/libre-franklin/400.css';
import '@fontsource/libre-franklin/700.css';
import '@fontsource/libre-franklin/900.css';
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/eb-garamond/700.css';
import '@fontsource/cinzel/700.css';
import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board } from '../draw';
import { paintTower, rng } from './endlessBookTower';
import type * as THREE from 'three';

/**
 * La couverture du « Livre sans fin… sauf une ? », piste A de .ai/maquette-livre-sans-fin.html (validée le 10/10) :
 * un poche de livre-jeu des années 80. Fond noir, bandeau vert de la collection (inventée : « Les Sentiers qui
 * bifurquent », n° 7), titre en capitales métalliques, la grande peinture de la tour ; au dos le titre en long ; au
 * plat arrière, l'accroche, « 100 paragraphes, 27 façons de mourir, 1 seule fin » et un code-barre. Dessinée dans
 * les unités de la maquette (plat 640 × 800, dos 100 × 800), mises à l'échelle.
 */

export const BLACK = '#0b0a0c';
export const GREEN = '#1d6b5e';
const CREAM = '#f3ead6';
export const DECORATIVE = "'Cinzel Decorative', 'Cinzel', serif";
export const FRANKLIN = "'Libre Franklin', Arial, sans-serif";
export const GARAMOND = "'EB Garamond', Georgia, serif";
export const CINZEL = "'Cinzel', Georgia, serif";
const [W, H] = [640, 800];
const K = WIDTH / W;

export const loadEndlessBookFonts = (): Promise<unknown> =>
  Promise.all(
    [
      `900 20px ${DECORATIVE}`,
      `400 20px ${FRANKLIN}`,
      `700 20px ${FRANKLIN}`,
      `900 20px ${FRANKLIN}`,
      `20px ${GARAMOND}`,
      `italic 20px ${GARAMOND}`,
      `700 20px ${GARAMOND}`,
      `700 20px ${CINZEL}`,
      `400 20px ${CINZEL}`,
    ].map((font) => document.fonts.load(font)),
  );

/** Du texte posé par sa ligne de base, comme dans la maquette (centré : l'espacement après la dernière lettre ne le décale pas). */
export const print = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string | CanvasGradient,
  align: CanvasTextAlign = 'center',
  spacing = 0,
): void => {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${spacing}px`;
  context.fillText(text, x + (align === 'center' ? spacing / 2 : 0), y);
  context.letterSpacing = '0px';
};

/** La taille (au plus `size`) à laquelle `text` tient dans `width` (un titre anglais plus long). */
export const fit = (
  context: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  size: number,
  width: number,
): number => {
  context.font = font(size);
  const natural = context.measureText(text).width;
  return natural <= width ? size : (size * width) / natural;
};

/** Un mot du titre en capitales métalliques : un trait noir épais, un dégradé d'or chaud. */
const metal = (context: CanvasRenderingContext2D, text: string, x: number, y: number, size: number): void => {
  const fitted = fit(context, text, (px) => `900 ${px}px ${DECORATIVE}`, size, W - 70);
  context.font = `900 ${fitted}px ${DECORATIVE}`;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.letterSpacing = '1px';
  context.lineJoin = 'round';
  context.lineWidth = 9;
  context.strokeStyle = '#0a0608';
  context.strokeText(text, x, y);
  const fill = context.createLinearGradient(0, y - fitted, 0, y + 6);
  fill.addColorStop(0, '#fff3c0');
  fill.addColorStop(0.45, '#f0b040');
  fill.addColorStop(0.55, '#b0561a');
  fill.addColorStop(1, '#ffd070');
  context.fillStyle = fill;
  context.fillText(text, x, y);
  context.letterSpacing = '0px';
};

/** Le bandeau de la collection, en haut du plat et du plat arrière. */
const band = (context: CanvasRenderingContext2D): void => {
  context.fillStyle = GREEN;
  context.fillRect(0, 0, W, 64);
  context.fillStyle = BLACK;
  context.fillRect(0, 64, W, 4);
};

/** Un plat noir, dessiné aux unités de la maquette. */
const cover = (draw: (context: CanvasRenderingContext2D) => void): THREE.CanvasTexture =>
  board(BLACK, BLACK, (context) => {
    context.save();
    context.scale(K, K);
    draw(context);
    context.restore();
  });

export const endlessBookFront = (): THREE.CanvasTexture =>
  cover((context) => {
    const text = messages().rareBooks.endlessBook;
    band(context);
    print(context, text.collection, 26, 42, `700 22px ${FRANKLIN}`, CREAM, 'left', 2);
    context.fillStyle = CREAM;
    context.beginPath();
    context.arc(W - 46, 32, 22, 0, Math.PI * 2);
    context.fill();
    print(context, text.number, W - 46, 42, `900 28px ${FRANKLIN}`, GREEN);
    metal(context, text.title[0], W / 2, 138, 58);
    metal(context, text.title[1], W / 2, 206, 66);
    print(context, text.tail, W / 2 + 120, 246, `italic 30px ${GARAMOND}`, '#e8c88a');
    paintTower(context, 30, 268, W - 60, 440, 11);
    context.strokeStyle = CREAM;
    context.lineWidth = 2;
    context.strokeRect(30, 268, W - 60, 440);
    print(context, text.author, W / 2, 752, `700 22px ${FRANKLIN}`, CREAM, 'center', 4);
    print(context, text.tagline, W / 2, 782, `400 15px ${FRANKLIN}`, '#9a9080', 'center', 1);
  });

/** Les lignes de `text` d'au plus `width` de large, à la police du contexte. */
const lines = (context: CanvasRenderingContext2D, text: string, width: number): string[] => {
  const out: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const tried = line ? `${line} ${word}` : word;
    if (line && context.measureText(tried).width > width) {
      out.push(line);
      line = word;
    } else line = tried;
  }
  return line ? [...out, line] : out;
};

export const endlessBookBack = (): THREE.CanvasTexture =>
  cover((context) => {
    const text = messages().rareBooks.endlessBook;
    band(context);
    print(context, `${text.collection} · ${text.number}`, W / 2, 42, `700 20px ${FRANKLIN}`, CREAM, 'center', 2);
    print(context, text.hook, W / 2, 140, `italic 30px ${GARAMOND}`, '#f0c060');
    let y = 200;
    context.font = `22px ${GARAMOND}`;
    for (const line of lines(context, text.blurb, 500)) {
      print(context, line, W / 2, y, `22px ${GARAMOND}`, '#e6dcc6');
      y += 32;
    }
    y += 30;
    for (const [count, label] of text.stats) {
      print(context, count, W / 2 - 20, y, `900 40px ${FRANKLIN}`, '#f0b040', 'right');
      print(context, label, W / 2, y, `400 24px ${FRANKLIN}`, '#e6dcc6', 'left');
      y += 52;
    }
    print(context, text.memory, W / 2, y + 26, `italic 21px ${GARAMOND}`, '#b8a684');
    // Le code-barre, ses chiffres en lettres de Babel.
    const random = rng(5);
    context.fillStyle = CREAM;
    context.fillRect(W - 220, H - 130, 180, 92);
    for (let x = W - 210; x < W - 50; x += 2 + Math.floor(random() * 3)) {
      context.fillStyle = BLACK;
      context.fillRect(x, H - 120, 1 + Math.floor(random() * 3), 60);
    }
    print(context, 'zxv uts rqp', W - 130, H - 46, `13px ${GARAMOND}`, BLACK, 'center', 2);
    print(context, text.age, 50, H - 60, `700 18px ${FRANKLIN}`, '#9a9080', 'left', 1);
  });

export const endlessBookSpine = (thickness: number): THREE.CanvasTexture =>
  board(BLACK, BLACK, (context) => {
    const text = messages().rareBooks.endlessBook;
    // Dessiné sans déformation, à l'échelle de la maquette : `w` est la largeur visible du dos.
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const scale = HEIGHT / H;
    const w = WIDTH / stretch / scale;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch * scale, scale);
    context.translate(-w / 2, 0);
    context.fillStyle = BLACK;
    context.fillRect(0, 0, w, H);
    context.fillStyle = GREEN;
    context.fillRect(0, 0, w, 90);
    print(context, text.number, w / 2, 62, `900 44px ${FRANKLIN}`, CREAM);
    context.save();
    context.translate(w / 2, 450);
    context.rotate(Math.PI / 2);
    const size = fit(context, text.spine, (px) => `900 ${px}px ${DECORATIVE}`, 34, 560);
    print(context, text.spine, 0, 4, `900 ${size}px ${DECORATIVE}`, '#f0b040');
    print(context, text.author, 0, 34, `700 14px ${FRANKLIN}`, CREAM, 'center', 3);
    context.restore();
    // La petite tour, emblème de la collection.
    context.fillStyle = GREEN;
    context.beginPath();
    context.moveTo(36, 770);
    context.lineTo(42, 712);
    context.lineTo(58, 712);
    context.lineTo(64, 770);
    context.fill();
    context.restore();
  });
