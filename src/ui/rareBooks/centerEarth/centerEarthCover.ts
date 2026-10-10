import '@fontsource/old-standard-tt/400.css';
import '@fontsource/old-standard-tt/400-italic.css';
import '@fontsource/old-standard-tt/700.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/playfair-display/700.css';
import '@fontsource/playfair-display/700-italic.css';
import '@fontsource/playfair-display/900.css';
import '@fontsource/noto-sans-runic/runic-400.css';
import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board } from '../draw';
import type * as THREE from 'three';

/**
 * Le cartonnage Hetzel, piste A de .ai/maquette-voyage-centre-terre.html (validée le 10/10) : percaline rouge,
 * plaque dorée et noire, la bannière « Voyages extraordinaires », le titre dans son cartouche noir, le Sneffels
 * qui fume ; au dos, le titre en pièce noire et le phare ; au plat arrière, le chiffre de l'éditeur à froid.
 * Dessiné dans les unités de la maquette (plat 640 × 800, dos 110 × 800), mises à l'échelle.
 */
export const RED = ['#a3201f', '#5a0d0e'] as const;
const BLACK = '#140c0a';
/** Les polices des années 1860 : un didot pour les titres, l'Old Standard pour le texte (et les runes). */
export const DIDOT = "'Playfair Display', Georgia, serif";
export const OLD = "'Old Standard TT', 'Noto Sans Runic', Georgia, serif";
const [W, H] = [640, 800];
const K = WIDTH / W;

export const loadCenterEarthFonts = (): Promise<unknown> =>
  Promise.all(
    [
      [`17px ${OLD}`],
      [`700 17px ${OLD}`],
      [`italic 17px ${OLD}`],
      [`17px 'Noto Sans Runic'`, 'ᛯᚼ'],
      [`italic 20px ${DIDOT}`],
      [`700 20px ${DIDOT}`],
      [`italic 700 20px ${DIDOT}`],
      [`900 20px ${DIDOT}`],
    ].map(([font, text]) => document.fonts.load(font, text)),
  );

/** Le hasard de la maquette (le même grain de toile). */
const rng = (seed: number) => (): number => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

/** Du texte posé par sa ligne de base (centré : l'espacement après la dernière lettre ne le décale pas). */
export const print = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string | CanvasGradient,
  spacing = 0,
  align: CanvasTextAlign = 'center',
): void => {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${spacing}px`;
  context.fillText(text, x + (align === 'center' ? spacing / 2 : 0), y);
  context.letterSpacing = '0px';
};

/** La taille (au plus `size`) à laquelle `text` tient dans `width`. */
const fit = (
  context: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  size: number,
  width: number,
  spacing: number,
): number => {
  context.font = font(size);
  context.letterSpacing = `${spacing}px`;
  const natural = context.measureText(text).width;
  context.letterSpacing = '0px';
  return natural <= width ? size : (size * width) / natural;
};

const gold = (context: CanvasRenderingContext2D, w: number, h: number): CanvasGradient => {
  const gradient = context.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, '#8a6a2c');
  gradient.addColorStop(0.35, '#f2d68e');
  gradient.addColorStop(0.55, '#c9a24f');
  gradient.addColorStop(0.8, '#f2d68e');
  gradient.addColorStop(1, '#8a6a2c');
  return gradient;
};

/** La percaline : grain croisé, petites irrégularités, bords frottés. */
const cloth = (context: CanvasRenderingContext2D, w: number, h: number, color: string, dark: string, seed: number): void => {
  const shade = context.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.15, w / 2, h / 2, Math.max(w, h) * 0.75);
  shade.addColorStop(0, color);
  shade.addColorStop(1, dark);
  context.fillStyle = shade;
  context.fillRect(0, 0, w, h);
  const random = rng(seed * 7919);
  for (let y = 0; y < h; y += 2) {
    context.fillStyle = `rgba(0,0,0,${0.04 + random() * 0.05})`;
    context.fillRect(0, y, w, 1);
  }
  for (let x = 0; x < w; x += 2) {
    context.fillStyle = `rgba(255,255,255,${random() * 0.035})`;
    context.fillRect(x, 0, 1, h);
  }
  for (let speck = 0; speck < (w * h) / 90; speck++) {
    context.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.05)';
    context.fillRect(random() * w, random() * h, 1 + random() * 2, 1);
  }
  const rubbed = (x0: number, y0: number, x1: number, y1: number): CanvasGradient => {
    const gradient = context.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, 'rgba(230,220,200,0.16)');
    gradient.addColorStop(1, 'rgba(230,220,200,0)');
    return gradient;
  };
  context.fillStyle = rubbed(0, 0, 0, 22);
  context.fillRect(0, 0, w, 22);
  context.fillStyle = rubbed(0, h, 0, h - 22);
  context.fillRect(0, h - 22, w, 22);
  context.fillStyle = rubbed(w, 0, w - 18, 0);
  context.fillRect(w - 18, 0, 18, h);
};

/** Or estampé : une ombre sombre sous le dessin, puis l'or. */
const gilt = (context: CanvasRenderingContext2D, draw: (tool: CanvasRenderingContext2D) => void, fill: CanvasGradient): void => {
  context.save();
  context.translate(0, 1.2);
  context.strokeStyle = context.fillStyle = 'rgba(0,0,0,0.45)';
  draw(context);
  context.restore();
  context.save();
  context.strokeStyle = context.fillStyle = fill;
  draw(context);
  context.restore();
};

/** Gaufrage à froid : le dessin s'enfonce dans la toile (reflet en bas, ombre en haut, fond plus sombre). */
const blind = (context: CanvasRenderingContext2D, draw: (tool: CanvasRenderingContext2D) => void, depth: number): void => {
  context.save();
  context.translate(0, depth);
  context.strokeStyle = context.fillStyle = 'rgba(255,255,255,0.10)';
  draw(context);
  context.translate(0, -2 * depth);
  context.strokeStyle = context.fillStyle = 'rgba(0,0,0,0.55)';
  draw(context);
  context.translate(0, depth);
  context.strokeStyle = context.fillStyle = 'rgba(0,0,0,0.28)';
  draw(context);
  context.restore();
};

/** Un fleuron d'angle : une feuille double et une perle. */
const cornerFleuron = (context: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, r: number): void => {
  context.save();
  context.translate(x, y);
  context.scale(sx, sy);
  context.beginPath();
  context.moveTo(0, 0);
  context.quadraticCurveTo(r * 1.1, r * 0.1, r * 1.3, r * 0.7);
  context.quadraticCurveTo(r * 0.6, r * 0.5, 0, 0);
  context.fill();
  context.beginPath();
  context.moveTo(0, 0);
  context.quadraticCurveTo(r * 0.1, r * 1.1, r * 0.7, r * 1.3);
  context.quadraticCurveTo(r * 0.5, r * 0.6, 0, 0);
  context.fill();
  context.beginPath();
  context.arc(r * 0.55, r * 0.55, r * 0.16, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

/** Le Sneffels : un cône, son cratère, ses coulées, sa fumée, le sol. */
const volcano = (context: CanvasRenderingContext2D, cx: number, base: number, s: number): void => {
  context.save();
  context.translate(cx, base);
  context.scale(s, s);
  context.beginPath();
  context.moveTo(-90, 0);
  context.quadraticCurveTo(-40, -30, -20, -70);
  context.lineTo(-8, -76);
  context.lineTo(8, -76);
  context.lineTo(20, -70);
  context.quadraticCurveTo(40, -30, 90, 0);
  context.closePath();
  context.fill();
  context.save();
  context.strokeStyle = 'rgba(30,15,8,0.55)';
  context.lineWidth = 2;
  for (const [x0, x1] of [
    [-6, -34],
    [4, 22],
    [-1, -8],
  ]) {
    context.beginPath();
    context.moveTo(x0, -72);
    context.quadraticCurveTo((x0 + x1) / 2 + 4, -40, x1, -8);
    context.stroke();
  }
  context.restore();
  context.lineWidth = 3;
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(0, -82);
  context.bezierCurveTo(-14, -100, 14, -112, 0, -128);
  context.bezierCurveTo(-10, -140, 12, -150, 4, -162);
  context.stroke();
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(6, -86);
  context.bezierCurveTo(24, -98, 18, -116, 34, -126);
  context.stroke();
  context.fillRect(-110, 2, 220, 3);
  context.restore();
};

/** La bannière : un ruban qui ondule, ses bouts repliés derrière, le texte noir qui suit l'onde. */
const banner = (context: CanvasRenderingContext2D, cx: number, cy: number, half: number, label: string, fill: CanvasGradient): void => {
  const wave = (x: number): number => Math.sin((x / half) * Math.PI) * 6;
  const h = 34;
  context.fillStyle = fill;
  for (const side of [-1, 1]) {
    const x = cx + side * half;
    context.save();
    context.fillStyle = 'rgba(0,0,0,0.35)';
    context.fillRect(Math.min(x, x + side * 46), cy - h / 2 + 12, 46, h);
    context.restore();
    context.beginPath();
    context.moveTo(x - side * 4, cy - h / 2 + 12);
    context.lineTo(x + side * 46, cy - h / 2 + 12);
    context.lineTo(x + side * 34, cy + 12);
    context.lineTo(x + side * 46, cy + h / 2 + 12);
    context.lineTo(x - side * 4, cy + h / 2 + 12);
    context.closePath();
    context.fill();
  }
  context.beginPath();
  for (let x = -half; x <= half; x += 4) context.lineTo(cx + x, cy - h / 2 + wave(x));
  for (let x = half; x >= -half; x -= 4) context.lineTo(cx + x, cy + h / 2 + wave(x));
  context.closePath();
  context.fill();
  context.strokeStyle = BLACK;
  context.lineWidth = 1.2;
  for (const edge of [-1, 1]) {
    context.beginPath();
    for (let x = -half + 6; x <= half - 6; x += 4) context.lineTo(cx + x, cy + edge * (h / 2 - 5) + wave(x));
    context.stroke();
  }
  // Le texte, lettre par lettre ; trop long pour le ruban, il rapetisse.
  const size = fit(context, label, (px) => `700 ${px}px ${DIDOT}`, 17, 2 * half - 24, 3);
  context.font = `700 ${size}px ${DIDOT}`;
  context.letterSpacing = '3px';
  let x = -context.measureText(label).width / 2;
  context.fillStyle = BLACK;
  context.textAlign = 'left';
  context.textBaseline = 'alphabetic';
  for (const letter of label) {
    const w = context.measureText(letter).width;
    context.save();
    context.translate(cx + x + w / 2, cy + 6 + wave(x + w / 2));
    context.rotate(Math.cos(((x + w / 2) / half) * Math.PI) * 0.05);
    context.fillText(letter, -w / 2, 0);
    context.restore();
    x += w;
  }
  context.letterSpacing = '0px';
};

/** Le cartouche du titre : un rectangle aux coins arrondis en creux (`inset` : le filet intérieur). */
const cartouche = (context: CanvasRenderingContext2D, inset: number): void => {
  const [x, y, w, h, n] = [118, 258, W - 236, 222, 18];
  context.beginPath();
  context.moveTo(x + n + inset, y + inset);
  context.lineTo(x + w - n - inset, y + inset);
  context.arc(x + w - inset, y + inset, n, Math.PI, Math.PI / 2, true);
  context.lineTo(x + w - inset, y + h - n - inset);
  context.arc(x + w - inset, y + h - inset, n, -Math.PI / 2, Math.PI, true);
  context.lineTo(x + n + inset, y + h - inset);
  context.arc(x + inset, y + h - inset, n, 0, -Math.PI / 2, true);
  context.lineTo(x + inset, y + n + inset);
  context.arc(x + inset, y + inset, n, Math.PI / 2, 0, true);
  context.closePath();
};

/** Le plat : le cadre noir et or, la bannière, l'auteur, le titre en cartouche, le Sneffels, l'éditeur. */
export const centerEarthFront = (): THREE.CanvasTexture =>
  board(RED[0], RED[1], (context) => {
    const { banner: series, author, title, publisher } = messages().rareBooks.centerEarth.front;
    context.save();
    context.scale(K, K);
    cloth(context, W, H, RED[0], RED[1], 11);
    const fill = gold(context, W, H * 0.3);
    context.fillStyle = 'rgba(15,8,6,0.82)';
    context.fillRect(34, 34, W - 68, 12);
    context.fillRect(34, H - 46, W - 68, 12);
    context.fillRect(34, 34, 12, H - 68);
    context.fillRect(W - 46, 34, 12, H - 68);
    gilt(
      context,
      (tool) => {
        tool.lineWidth = 2;
        tool.strokeRect(28, 28, W - 56, H - 56);
        tool.lineWidth = 1.2;
        tool.strokeRect(34, 34, W - 68, H - 68);
        tool.strokeRect(46, 46, W - 92, H - 92);
        tool.lineWidth = 1;
        tool.strokeRect(58, 58, W - 116, H - 116);
        for (const [x, y, sx, sy] of [
          [58, 58, 1, 1],
          [W - 58, 58, -1, 1],
          [58, H - 58, 1, -1],
          [W - 58, H - 58, -1, -1],
        ])
          cornerFleuron(tool, x, y, sx, sy, 26);
      },
      fill,
    );
    banner(context, W / 2, 128, 190, series, fill);
    gilt(context, (tool) => print(tool, author, W / 2, 216, `700 30px ${DIDOT}`, fill, 6), fill);
    context.fillStyle = 'rgba(15,8,6,0.9)';
    cartouche(context, 0);
    context.fill();
    gilt(
      context,
      (tool) => {
        tool.lineWidth = 2.5;
        cartouche(tool, 0);
        tool.stroke();
        tool.lineWidth = 1;
        cartouche(tool, 9);
        tool.stroke();
      },
      fill,
    );
    // Les trois lignes du titre ; une ligne trop longue (en anglais) rapetisse pour tenir dans le cartouche.
    gilt(
      context,
      (tool) =>
        (title as string[]).forEach((line, row) => {
          const spacing = row ? 4 : 5;
          const size = fit(tool, line, (px) => `900 ${px}px ${DIDOT}`, 40, W - 236 - 48, spacing);
          print(tool, line, W / 2, 322 + row * 60, `900 ${size}px ${DIDOT}`, fill, spacing);
        }),
      fill,
    );
    gilt(context, (tool) => volcano(tool, W / 2, 640, 0.95), fill);
    gilt(
      context,
      (tool) => {
        tool.lineWidth = 1;
        tool.beginPath();
        tool.moveTo(200, 680);
        tool.lineTo(W - 200, 680);
        tool.stroke();
        print(tool, publisher, W / 2, 712, `700 14px ${DIDOT}`, fill, 3);
      },
      fill,
    );
    context.restore();
  });

/** Le plat arrière : un double filet et le médaillon au chiffre de l'éditeur, à froid. */
export const centerEarthBack = (): THREE.CanvasTexture =>
  board(RED[0], RED[1], (context) => {
    context.save();
    context.scale(K, K);
    cloth(context, W, H, RED[0], RED[1], 13);
    blind(
      context,
      (tool) => {
        tool.lineWidth = 2.5;
        tool.strokeRect(30, 30, W - 60, H - 60);
        tool.lineWidth = 1;
        tool.strokeRect(40, 40, W - 80, H - 80);
        tool.lineWidth = 2.5;
        tool.beginPath();
        tool.arc(W / 2, H / 2, 86, 0, Math.PI * 2);
        tool.stroke();
        tool.lineWidth = 1;
        tool.beginPath();
        tool.arc(W / 2, H / 2, 76, 0, Math.PI * 2);
        tool.stroke();
        for (let pearl = 0; pearl < 36; pearl++) {
          const angle = (pearl / 36) * Math.PI * 2;
          tool.beginPath();
          tool.arc(W / 2 + Math.cos(angle) * 81, H / 2 + Math.sin(angle) * 81, 1.6, 0, Math.PI * 2);
          tool.fill();
        }
        tool.font = `italic 700 64px ${DIDOT}`;
        tool.textAlign = 'center';
        tool.textBaseline = 'alphabetic';
        tool.fillText(messages().rareBooks.centerEarth.monogram, W / 2, H / 2 + 22);
      },
      1.2,
    );
    context.restore();
  });

/** Le dos : filets, le titre en pièce noire à l'horizontale, l'auteur, le phare sur la mer, l'éditeur. */
export const centerEarthSpine = (thickness: number): THREE.CanvasTexture =>
  board(RED[0], RED[1], (context) => {
    const { spine, spineAuthor, spinePublisher } = messages().rareBooks.centerEarth;
    // Dessiné sans déformation, à l'échelle de la maquette : `w` est la largeur visible du dos.
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const scale = HEIGHT / H;
    const w = WIDTH / stretch / scale;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch * scale, scale);
    context.translate(-w / 2, 0);
    cloth(context, w, H, '#a52221', '#5e0e0f', 12);
    const fill = gold(context, w, 0);
    gilt(
      context,
      (tool) => {
        for (const y of [26, 32, 768, 774]) {
          tool.lineWidth = y % 2 ? 1 : 2.5;
          tool.beginPath();
          tool.moveTo(6, y);
          tool.lineTo(w - 6, y);
          tool.stroke();
        }
      },
      fill,
    );
    context.fillStyle = 'rgba(15,8,6,0.88)';
    context.fillRect(8, 70, w - 16, 150);
    // Les mots du titre, chacun à sa taille de la maquette (rapetissés s'ils dépassent la pièce).
    const sizes = [15, 13, 13, 17];
    const spacings = [1, 0.5, 1, 1];
    gilt(
      context,
      (tool) => {
        tool.lineWidth = 1.2;
        tool.strokeRect(11, 73, w - 22, 144);
        (spine as string[]).forEach((word, row) => {
          const size = fit(tool, word, (px) => `900 ${px}px ${DIDOT}`, sizes[row], w - 30, spacings[row]);
          print(tool, word, w / 2, [108, 136, 162, 192][row], `900 ${size}px ${DIDOT}`, fill, spacings[row]);
        });
        print(tool, spineAuthor, w / 2, 256, `700 9.5px ${DIDOT}`, fill, 1);
      },
      fill,
    );
    gilt(
      context,
      (tool) => {
        const [cx, base] = [w / 2, 640];
        tool.beginPath();
        tool.moveTo(cx - 16, base);
        tool.lineTo(cx - 9, base - 190);
        tool.lineTo(cx + 9, base - 190);
        tool.lineTo(cx + 16, base);
        tool.closePath();
        tool.fill();
        tool.fillRect(cx - 14, base - 200, 28, 8);
        tool.fillRect(cx - 8, base - 226, 16, 24);
        tool.beginPath();
        tool.moveTo(cx - 11, base - 226);
        tool.lineTo(cx, base - 244);
        tool.lineTo(cx + 11, base - 226);
        tool.fill();
        tool.lineWidth = 1.2;
        for (const slope of [-0.5, -0.25, 0, 0.25, 0.5])
          for (const side of [-1, 1]) {
            tool.beginPath();
            tool.moveTo(cx + side * 12, base - 214);
            tool.lineTo(cx + side * 50, base - 214 + slope * 60);
            tool.stroke();
          }
        for (const y of [base + 10, base + 20, base + 30]) {
          tool.beginPath();
          for (let x = 8; x < w - 8; x += 2) tool.lineTo(x, y + Math.sin(x / 6) * 2.5);
          tool.stroke();
        }
        print(tool, spinePublisher, w / 2, 740, `700 10px ${DIDOT}`, fill, 1);
      },
      fill,
    );
    context.restore();
  });
