import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/900.css';
import '@fontsource/crimson-pro/400.css';
import '@fontsource/crimson-pro/400-italic.css';
import '@fontsource/crimson-pro/600.css';
import '@fontsource/oswald/400.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';
import '@fontsource/caveat/600.css';

/**
 * Les outils de WiskyPedia (maquette .ai/maquette-wiskypedia.html, validée le 22/10) : les polices du guide,
 * le texte posé par sa ligne de base, l'écriture qui penche et se dédouble avec l'ivresse, les ronds de verre
 * et les flaques. Mesures de la maquette (page 640 × 800, celle de la texture).
 */

export const SERIF = "'Crimson Pro', Georgia, serif";
export const DISPLAY = "'Playfair Display', Georgia, serif";
export const SANS = "'Oswald', 'Arial Narrow', sans-serif";
export const HAND = "'Caveat', cursive";
export const INK = '#1e1b18';
export const SOFT = '#6f665c';
export const RULE = '#b9ab95';
export const GOLD = '#c9a24a';
export const AMBER = '#c7811f';
/** L'encre du stylo de l'auteur, dans la marge. */
export const PEN = '#3a3550';

export const loadWiskyFonts = (): Promise<unknown> =>
  Promise.all(
    [
      `900 40px "Playfair Display"`,
      `700 40px "Playfair Display"`,
      `italic 400 40px "Playfair Display"`,
      `400 40px "Crimson Pro"`,
      `italic 400 40px "Crimson Pro"`,
      `600 40px "Crimson Pro"`,
      `400 40px Oswald`,
      `500 40px Oswald`,
      `600 40px Oswald`,
      `600 40px Caveat`,
    ].map((font) => document.fonts.load(font)),
  );

/** Hasard reproductible (Park-Miller), le même que la maquette. */
export const rng = (seed: number): (() => number) => {
  let value = seed % 2147483647 || 1;
  return () => (value = (value * 16807) % 2147483647) / 2147483647;
};

/** Un élément de `list` tiré par `random`. */
export const pick = <T>(list: readonly T[], random: () => number): T => list[Math.floor(random() * list.length)];

/** Du texte posé par sa ligne de base `y`. */
export const text = (
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  font: string,
  color: string | CanvasGradient,
  align: CanvasTextAlign = 'left',
  spacing = 0,
): void => {
  context.save();
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${spacing}px`;
  context.fillText(label, x, y);
  context.restore();
};

/** Les lignes de `label` d'au plus `width` de large ; la ponctuation haute reste avec son mot. */
export const wrap = (context: CanvasRenderingContext2D, label: string, font: string, width: number): string[] => {
  context.save();
  context.font = font;
  const lines: string[] = [];
  let line = '';
  for (const word of label
    .replace(/ ([?!:;»%])/g, ' $1')
    .replace(/« /g, '« ')
    .split(' ')) {
    const tried = line ? `${line} ${word}` : word;
    if (line && context.measureText(tried).width > width) {
      lines.push(line);
      line = word;
    } else line = tried;
  }
  context.restore();
  return line ? [...lines, line] : lines;
};

/**
 * Une ligne écrite avec l'ivresse `drunk` (0 à 1) : la ligne penche, glisse, ses lettres ondulent, et elle se
 * dédouble passé 0,5. À 0 : le texte droit.
 */
export const drunkLine = (
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  font: string,
  color: string,
  drunk: number,
  random: () => number,
  align: CanvasTextAlign = 'left',
): void => {
  if (drunk <= 0) {
    text(context, label, x, y, font, color, align);
    return;
  }
  const tilt = (random() - 0.5) * drunk * drunk * 0.07;
  const drift = (random() - 0.3) * drunk * drunk * 18;
  // Les mêmes secousses pour la ligne et son double.
  const wobbles = Array.from(label, () => (random() - 0.5) * drunk * drunk * 2.2);
  const draw = (dx: number, dy: number, alpha: number): void => {
    context.save();
    context.globalAlpha = alpha;
    context.translate(x + dx + drift, y + dy);
    context.rotate(tilt);
    context.font = font;
    context.fillStyle = color;
    context.textBaseline = 'alphabetic';
    context.textAlign = 'left';
    const width = context.measureText(label).width;
    let at = align === 'center' ? -width / 2 : align === 'right' ? -width : 0;
    let i = 0;
    for (const char of label) {
      context.fillText(char, at, Math.sin(at * 0.05 + y) * drunk * drunk * 3.5 + wobbles[i++]);
      at += context.measureText(char).width;
    }
    context.restore();
  };
  if (drunk > 0.5) draw(drunk * 5, drunk * 1.5, (drunk - 0.5) * 0.55);
  draw(0, 0, 1);
};

/** Un rond de verre : un anneau brun irrégulier, plus ou moins marqué (`strength`). */
export const ring = (context: CanvasRenderingContext2D, x: number, y: number, r: number, strength: number, random: () => number): void => {
  context.save();
  for (let k = 0; k < 3; k++) {
    context.beginPath();
    for (let i = 0; i <= 64; i++) {
      const a = (Math.PI * 2 * i) / 64;
      const rr = r + Math.sin(a * 3 + k) * 1.5 + (random() - 0.5) * 1.6;
      if (i) context.lineTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
      else context.moveTo(x + rr * Math.cos(a), y + rr * Math.sin(a));
    }
    context.strokeStyle = `rgba(150,90,30,${(0.1 + k * 0.05) * strength})`;
    context.lineWidth = 3 - k;
    context.stroke();
  }
  const fill = context.createRadialGradient(x, y, r * 0.2, x, y, r);
  fill.addColorStop(0, `rgba(190,130,50,${0.03 * strength})`);
  fill.addColorStop(1, `rgba(170,110,40,${0.09 * strength})`);
  context.fillStyle = fill;
  context.beginPath();
  context.arc(x, y, r, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

/** Une flaque renversée : bords ronds, quelques gouttes autour. */
export const splash = (context: CanvasRenderingContext2D, x: number, y: number, r: number, random: () => number): void => {
  context.save();
  context.beginPath();
  const k1 = random() * 6;
  const k2 = random() * 6;
  for (let i = 0; i <= 80; i++) {
    const a = (Math.PI * 2 * i) / 80;
    const rr = r * (0.85 + 0.13 * Math.sin(3 * a + k1) + 0.07 * Math.sin(7 * a + k2));
    if (i) context.lineTo(x + rr * Math.cos(a), y + rr * 0.75 * Math.sin(a));
    else context.moveTo(x + rr * Math.cos(a), y + rr * 0.75 * Math.sin(a));
  }
  context.closePath();
  context.fillStyle = 'rgba(190,125,45,0.13)';
  context.fill();
  context.strokeStyle = 'rgba(150,90,30,0.25)';
  context.lineWidth = 1.5;
  context.stroke();
  for (let i = 0; i < 4; i++) {
    const a = random() * Math.PI * 2;
    const rr = r * (1.15 + random() * 0.4);
    context.beginPath();
    context.arc(x + rr * Math.cos(a), y + rr * 0.75 * Math.sin(a), 3 + random() * 5, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
};

/** Un petit verre bas, devant le compteur des gorgées. */
export const tumbler = (context: CanvasRenderingContext2D, x: number, y: number, color: string): void => {
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(x - 6, y - 6);
  context.lineTo(x - 5, y + 5);
  context.lineTo(x + 5, y + 5);
  context.lineTo(x + 6, y - 6);
  context.stroke();
  context.fillRect(x - 5, y, 10, 5);
  context.restore();
};
