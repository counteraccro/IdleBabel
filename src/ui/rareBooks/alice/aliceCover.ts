import '@fontsource/old-standard-tt/400.css';
import '@fontsource/old-standard-tt/400-italic.css';
import '@fontsource/old-standard-tt/700.css';
import '@fontsource/playfair-display/700.css';
import { messages } from '../../../i18n';
import { CQW, HEIGHT, PAGE_CENTER, WIDTH, board, write } from '../draw';
import type * as THREE from 'three';

/** La toile rouge de la première édition (Macmillan, 1865) et son or. */
export const CLOTH = '#a3222a';
const CLOTH_EDGE = '#5e1014';
export const OLD = "'Old Standard TT', Georgia, serif";
export const PLAYFAIR = "'Playfair Display', Georgia, serif";
export const INK = '#2a2118';

export const loadAliceFonts = (): Promise<unknown> =>
  Promise.all([`40px ${OLD}`, `italic 40px ${OLD}`, `bold 40px ${OLD}`, `bold 40px ${PLAYFAIR}`].map((font) => document.fonts.load(font)));

const gold = (context: CanvasRenderingContext2D): CanvasGradient => {
  const gradient = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, '#a8803a');
  gradient.addColorStop(0.5, '#f0d48a');
  gradient.addColorStop(1, '#a8803a');
  return gradient;
};

/** Le grain de la toile : des fils fins, en long et en travers. */
const weave = (context: CanvasRenderingContext2D): void => {
  for (let y = 0; y < HEIGHT; y += 3) {
    context.fillStyle = 'rgba(0, 0, 0, 0.05)';
    context.fillRect(0, y, WIDTH, 1);
  }
  for (let x = 0; x < WIDTH; x += 3) {
    context.fillStyle = 'rgba(255, 255, 255, 0.025)';
    context.fillRect(x, 0, 1, HEIGHT);
  }
};

/** La toile, son triple filet doré, et le médaillon du milieu (double cercle) où l'on dessine `inside`. */
const plate = (inside: (context: CanvasRenderingContext2D, ink: CanvasGradient) => void): THREE.CanvasTexture =>
  board(CLOTH, CLOTH_EDGE, (context) => {
    weave(context);
    const ink = gold(context);
    context.strokeStyle = ink;
    for (const [margin, width] of [
      [4, 0.45],
      [5.6, 0.2],
      [6.9, 0.2],
    ]) {
      context.lineWidth = width * CQW;
      context.strokeRect(margin * CQW, margin * CQW, WIDTH - 2 * margin * CQW, HEIGHT - 2 * margin * CQW);
    }
    for (const [radius, width] of [
      [23.4, 0.45],
      [21.9, 0.2],
    ]) {
      context.lineWidth = width * CQW;
      context.beginPath();
      context.arc(WIDTH / 2, HEIGHT / 2, radius * CQW, 0, Math.PI * 2);
      context.stroke();
    }
    inside(context, ink);
  });

/** La montre du Lapin Blanc : boîtier, anneau, cadran, aiguilles (il est en retard). */
const watch = (context: CanvasRenderingContext2D, ink: CanvasGradient): void => {
  const [x, y, r] = [WIDTH / 2, HEIGHT / 2 + 2 * CQW, 14.4 * CQW];
  context.strokeStyle = ink;
  context.fillStyle = ink;
  context.lineWidth = 0.6 * CQW;
  context.beginPath();
  context.arc(x, y, r, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 0.3 * CQW;
  context.beginPath();
  context.arc(x, y, r - 1.6 * CQW, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.arc(x, y - r - 1.9 * CQW, 1.6 * CQW, 0, Math.PI * 2);
  context.stroke();
  context.fillRect(x - 0.8 * CQW, y - r - 0.6 * CQW, 1.6 * CQW, CQW);
  for (let hour = 0; hour < 12; hour++) {
    const angle = (hour * Math.PI) / 6;
    const [outer, inner] = [r - 2.8 * CQW, r - (hour % 3 ? 3.8 : 4.7) * CQW];
    context.beginPath();
    context.moveTo(x + outer * Math.sin(angle), y - outer * Math.cos(angle));
    context.lineTo(x + inner * Math.sin(angle), y - inner * Math.cos(angle));
    context.stroke();
  }
  context.lineWidth = 0.6 * CQW;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x + 0.5 * (r - 4.7 * CQW), y - 0.2 * (r - 4.7 * CQW));
  context.stroke();
  context.lineWidth = 0.4 * CQW;
  context.beginPath();
  context.moveTo(x, y);
  context.lineTo(x - 0.1 * (r - 3 * CQW), y - 0.95 * (r - 3 * CQW));
  context.stroke();
  context.beginPath();
  context.arc(x, y, 0.6 * CQW, 0, Math.PI * 2);
  context.fill();
};

/** Le sourire du Chat de Cheshire, sans le chat : deux yeux en amande, fendus, et un large croissant de dents. */
const grin = (context: CanvasRenderingContext2D, ink: CanvasGradient): void => {
  const [x, y] = [WIDTH / 2, HEIGHT / 2];
  context.strokeStyle = ink;
  context.fillStyle = ink;
  context.lineWidth = 0.45 * CQW;
  for (const side of [-1, 1]) {
    const [eyeX, eyeY] = [x + side * 7 * CQW, y - 7 * CQW];
    context.beginPath();
    context.moveTo(eyeX - 3.4 * CQW, eyeY + side * 0.6 * CQW);
    context.quadraticCurveTo(eyeX, eyeY - 2.8 * CQW, eyeX + 3.4 * CQW, eyeY - side * 0.6 * CQW);
    context.quadraticCurveTo(eyeX, eyeY + 2.4 * CQW, eyeX - 3.4 * CQW, eyeY + side * 0.6 * CQW);
    context.stroke();
    context.beginPath();
    context.ellipse(eyeX, eyeY, 0.45 * CQW, 1.5 * CQW, 0, 0, Math.PI * 2);
    context.fill();
  }
  // Le croissant : l'arc des lèvres en bas, celui des gencives au-dessus, les dents entre les deux.
  const [lowY, lowR, highY, highR] = [y - 14 * CQW, 21 * CQW, y - 19 * CQW, 22.5 * CQW];
  const [from, to] = [0.2 * Math.PI, 0.8 * Math.PI];
  context.lineWidth = 0.5 * CQW;
  context.beginPath();
  context.arc(x, lowY, lowR, from, to);
  context.stroke();
  context.beginPath();
  context.arc(x, highY, highR, 0.25 * Math.PI, 0.75 * Math.PI);
  context.stroke();
  context.lineWidth = 0.28 * CQW;
  for (let tooth = -7; tooth <= 7; tooth++) {
    const angle = Math.PI / 2 + tooth * 0.032 * Math.PI;
    context.beginPath();
    context.moveTo(x + lowR * Math.cos(angle), lowY + lowR * Math.sin(angle));
    context.lineTo(x + highR * Math.cos(angle), highY + highR * Math.sin(angle));
    context.stroke();
  }
};

/** Le plat : la toile, l'or, la montre ; et pas de titre, comme sur l'original (il n'est qu'au dos). */
export const aliceFront = (): THREE.CanvasTexture => plate(watch);

/** Le plat arrière : le même encadrement, et le sourire du Chat. */
export const aliceBack = (): THREE.CanvasTexture => plate(grin);

/** Le dos : des filets dorés en haut et en bas, le titre couché dans la longueur, l'éditeur au pied. */
export const aliceSpine = (thickness: number): THREE.CanvasTexture =>
  board(CLOTH, CLOTH_EDGE, (context) => {
    weave(context);
    const { spine, publisher } = messages().rareBooks.alice;
    const ink = gold(context);
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch, 1);
    context.fillStyle = ink;
    for (const y of [4, 5.2, 119.8, 121]) context.fillRect(-6 * CQW, y * CQW, 12 * CQW, 0.3 * CQW);
    context.translate(0, 10 * CQW);
    context.rotate(Math.PI / 2);
    context.textBaseline = 'middle';
    context.font = `bold ${4.6 * CQW}px ${OLD}`;
    context.letterSpacing = `${0.4 * CQW}px`;
    context.fillText(spine, 0, 0);
    context.font = `${3.2 * CQW}px ${OLD}`;
    context.textAlign = 'right';
    context.fillText(publisher, 104 * CQW, 0);
    context.restore();
  });

/** La page de titre de l'édition d'origine (Bué 1869 en français, Macmillan 1865 en anglais), ligne par ligne. */
export const aliceTitlePage = (context: CanvasRenderingContext2D): void => {
  const fonts: Record<string, [string, number]> = {
    big: [`bold 44px ${PLAYFAIR}`, 4],
    mid: [`bold 28px ${PLAYFAIR}`, 2],
    name: [`bold 22px ${OLD}`, 3],
    small: [`15px ${OLD}`, 2],
    italic: [`italic 18px ${OLD}`, 0],
  };
  for (const [y, kind, text] of messages().rareBooks.alice.titlePage as [number, string, string][]) {
    if (kind === 'rule') {
      context.fillStyle = INK;
      context.fillRect(PAGE_CENTER - 50, y, 100, 1);
      continue;
    }
    const [font, spacing] = fonts[kind];
    write(context, text, PAGE_CENTER, y - 30, { font, color: INK, spacing });
  }
};
