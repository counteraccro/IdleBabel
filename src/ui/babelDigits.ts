import { el } from './dom';
import { babelDigit } from '../core/format';

/**
 * Chiffres de Babel dessinés (notation « En symboles de Babel ») : un hexagone doré, comme les sceaux,
 * et des rayons à compter. 0 : un point au centre ; 1 à 6 : autant de rayons ; 7, 8, 9 : les six rayons
 * et un cercle, un hexagone, ou les deux. Repère 100 × 100 ; le même tracé sert au HTML (SVG) et aux
 * pages dessinées sur canevas.
 */
type Shape = { d: string } | { circle: [number, number, number]; filled?: boolean };

const corner = (i: number, r: number): [number, number] => {
  const a = (Math.PI / 3) * i - Math.PI / 2;
  return [50 + r * Math.cos(a), 50 + r * Math.sin(a)];
};
const fixed = (value: number): string => value.toFixed(1);
const hexagon = (r: number): string => `M${[0, 1, 2, 3, 4, 5].map((i) => corner(i, r).map(fixed).join(' ')).join(' L')} Z`;

const SHAPES: Shape[][] = Array.from({ length: 10 }, (_, digit) => {
  const shapes: Shape[] = [{ d: hexagon(46) }];
  if (digit === 0) return [...shapes, { circle: [50, 50, 5], filled: true }];
  for (let i = 0; i < Math.min(digit, 6); i++) {
    const [x, y] = corner(i, 34);
    shapes.push({ d: `M50 50 L${fixed(x)} ${fixed(y)}` });
  }
  if (digit === 7 || digit === 9) shapes.push({ circle: [50, 50, 14] });
  if (digit === 8 || digit === 9) shapes.push({ d: hexagon(24) });
  return shapes;
});

/** Largeur d'un chiffre et d'un signe (point, virgule), en fraction de la hauteur du texte. */
const DIGIT_WIDTH = 0.92;
const SIGN_WIDTH = 0.34;
/** Épaisseur des traits (repère 100) : plus épais en petit, pour rester lisible. */
const stroke = (size: number): number => (size < 20 ? 9 : size < 36 ? 7 : 5.5);

const GOLD: readonly [number, string][] = [
  [0, '#f7e2a6'],
  [0.5, '#d9a94e'],
  [1, '#a8762c'],
];
const GRADIENT_ID = 'babel-digit-gold';

export const hasBabelDigits = (text: string): boolean => [...text].some((char) => babelDigit(char) >= 0);

/** Le dégradé doré, défini une fois dans la page pour tous les chiffres. */
const ensureGradient = (): void => {
  if (document.getElementById(GRADIENT_ID)) return;
  const stops = GOLD.map(([at, color]) => `<stop offset="${at}" stop-color="${color}"/>`).join('');
  document.body.insertAdjacentHTML(
    'beforeend',
    `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs><linearGradient id="${GRADIENT_ID}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="100">${stops}</linearGradient></defs></svg>`,
  );
};

const svgDigit = (digit: number, width: number): string => {
  const body = SHAPES[digit]
    .map((shape) =>
      'd' in shape
        ? `<path d="${shape.d}"/>`
        : `<circle cx="${shape.circle[0]}" cy="${shape.circle[1]}" r="${shape.circle[2]}"${shape.filled ? ` fill="url(#${GRADIENT_ID})"` : ''}/>`,
    )
    .join('');
  return `<svg class="babel-digit" viewBox="-2 -2 104 104" aria-hidden="true"><g fill="none" stroke="url(#${GRADIENT_ID})" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
};

/**
 * Un texte coupé en morceaux : les chiffres de Babel (dessinés), les signes d'un nombre (point des
 * milliers, virgule entre deux chiffres, dessinés en or) et le reste (écrit dans la police du texte).
 */
type Part = { digit: number } | { mark: '.' | ',' } | { text: string };

const parts = (text: string): Part[] => {
  const chars = [...text];
  const result: Part[] = [];
  chars.forEach((char, i) => {
    const digit = babelDigit(char);
    if (digit >= 0) result.push({ digit });
    else if ((char === '.' || char === ',') && babelDigit(chars[i - 1] ?? '') >= 0 && babelDigit(chars[i + 1] ?? '') >= 0)
      result.push({ mark: char });
    else {
      const last = result.at(-1);
      if (last && 'text' in last) last.text += char;
      else result.push({ text: char });
    }
  });
  return result;
};

/**
 * Écrit un texte dans un élément HTML : ses chiffres de Babel dessinés, le reste en texte. `size` : taille
 * approximative du texte en pixels (épaisseur des traits). Ne refait rien si le texte n'a pas changé.
 */
export const setNumberText = (node: HTMLElement, text: string, size = 16): void => {
  if (node.dataset.number === text) return;
  node.dataset.number = text;
  if (!hasBabelDigits(text)) {
    node.removeAttribute('aria-label');
    node.textContent = text;
    return;
  }
  ensureGradient();
  node.setAttribute('aria-label', text);
  node.replaceChildren(
    ...parts(text).map((part): Node => {
      if ('digit' in part) {
        const holder = document.createElement('template');
        holder.innerHTML = svgDigit(part.digit, stroke(size));
        return holder.content.firstChild!;
      }
      if ('mark' in part) return el('span', 'babel-sign', part.mark === '.' ? '·' : ',');
      return document.createTextNode(part.text);
    }),
  );
};

/**
 * Largeur d'un texte en chiffres de Babel écrit en `size` pixels ; le reste du texte est mesuré dans la
 * police de `context`.
 */
export const babelTextWidth = (context: CanvasRenderingContext2D, text: string, size: number): number =>
  parts(text).reduce(
    (width, part) =>
      width + ('digit' in part ? DIGIT_WIDTH * size : 'mark' in part ? SIGN_WIDTH * size : context.measureText(part.text).width),
    0,
  );

/**
 * Dessine un texte aux chiffres de Babel sur un canevas : `left` son bord gauche, `top` le haut de la
 * ligne de hauteur `size`, `baseline` la ligne d'écriture du reste du texte (police et couleur de
 * `context`, déjà réglées).
 */
export const drawBabelText = (
  context: CanvasRenderingContext2D,
  text: string,
  left: number,
  top: number,
  size: number,
  baseline = top + size * 0.8,
): void => {
  let x = left;
  const ink = context.fillStyle;
  for (const part of parts(text)) {
    if ('text' in part) {
      context.save();
      context.textAlign = 'left';
      context.textBaseline = 'alphabetic';
      context.fillStyle = ink;
      context.fillText(part.text, x, baseline);
      x += context.measureText(part.text).width;
      context.restore();
      continue;
    }
    if ('mark' in part) {
      // Point des milliers : un petit carré doré à mi-hauteur ; virgule : un trait en bas.
      const width = SIGN_WIDTH * size;
      context.save();
      context.fillStyle = GOLD[1][1];
      if (part.mark === '.') context.fillRect(x + width / 2 - size * 0.05, top + size * 0.45, size * 0.1, size * 0.1);
      else context.fillRect(x + width / 2 - size * 0.04, top + size * 0.72, size * 0.08, size * 0.2);
      context.restore();
      x += width;
      continue;
    }
    const scale = (size * 0.88) / 104;
    context.save();
    context.translate(x + ((DIGIT_WIDTH - 0.88) * size) / 2 + 2 * scale, top + size * 0.06 + 2 * scale);
    context.scale(scale, scale);
    const gradient = context.createLinearGradient(0, 0, 100, 100);
    for (const [at, color] of GOLD) gradient.addColorStop(at, color);
    context.strokeStyle = gradient;
    context.fillStyle = gradient;
    context.lineWidth = stroke(size);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (const shape of SHAPES[part.digit]) {
      if ('d' in shape) context.stroke(new Path2D(shape.d));
      else {
        context.beginPath();
        context.arc(shape.circle[0], shape.circle[1], shape.circle[2], 0, Math.PI * 2);
        if (shape.filled) context.fill();
        else context.stroke();
      }
    }
    context.restore();
    x += DIGIT_WIDTH * size;
  }
};
