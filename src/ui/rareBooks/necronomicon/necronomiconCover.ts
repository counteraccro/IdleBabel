import { HEIGHT, WIDTH, board } from '../draw';
import type * as THREE from 'three';

/**
 * La couverture du Necronomicon (maquette .ai/maquette-necronomicon.html, piste A « Al Azif, Damas ») :
 * l'original arabe, avant toute traduction. Maroquin brun-rouge, médaillon en amande poussé à l'or et ses
 * écoinçons ; l'entrelacs, de près, est fait de signes qui ne se lisent pas. Pas de titre. On dessine dans
 * les mesures de la maquette (plats 640 × 800, dos 130 × 800), mises à l'échelle des textures.
 */

export const LEATHER = '#6a2a1c';
const LEATHER_EDGE = '#2a0e08';
const [W, H, SPINE_W] = [640, 800, 130];
/** Le dos de la maquette à ses vraies proportions (le dos d'un livre fait 1,4 fois son épaisseur). */
export const THICKNESS = SPINE_W / H / 1.4;

/** Hasard reproductible (Park-Miller), le même que la maquette : mêmes signes aux mêmes places. */
const rng = (seed: number) => (): number => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
type Random = () => number;
type Draw = (context: CanvasRenderingContext2D) => void;

const gold = (context: CanvasRenderingContext2D, y0: number, y1: number): CanvasGradient => {
  const gradient = context.createLinearGradient(0, y0, 0, y1);
  gradient.addColorStop(0, '#8a6a2c');
  gradient.addColorStop(0.35, '#f2d68e');
  gradient.addColorStop(0.55, '#c9a24f');
  gradient.addColorStop(0.8, '#f0d48a');
  gradient.addColorStop(1, '#7a5a22');
  return gradient;
};

/** Le maroquin : teinte, grain, taches, éraflures, usure aux bords. */
const leather = (context: CanvasRenderingContext2D, w: number, h: number, color: string, dark: string, seed: number): void => {
  const shade = context.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.1, w / 2, h / 2, Math.max(w, h) * 0.75);
  shade.addColorStop(0, color);
  shade.addColorStop(1, dark);
  context.fillStyle = shade;
  context.fillRect(0, 0, w, h);
  const random = rng(seed * 7919 + 3);
  for (let i = 0; i < (w * h) / 50; i++) {
    context.fillStyle = random() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,230,190,0.035)';
    context.fillRect(random() * w, random() * h, 1 + random() * 3, 1 + random());
  }
  for (let i = 0; i < (w * h) / 16000; i++) {
    context.fillStyle = `rgba(10,5,0,${0.05 + random() * 0.1})`;
    context.beginPath();
    context.ellipse(random() * w, random() * h, 6 + random() * 40, 4 + random() * 22, random() * 3, 0, Math.PI * 2);
    context.fill();
  }
  for (let i = 0; i < (w * h) / 14000; i++) {
    context.strokeStyle = 'rgba(225,195,150,0.10)';
    context.lineWidth = 1;
    const [x, y] = [random() * w, random() * h];
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 60, y + (random() - 0.5) * 20);
    context.stroke();
  }
  const rubbed = (x0: number, y0: number, x1: number, y1: number, alpha: number): CanvasGradient => {
    const gradient = context.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, `rgba(225,195,150,${alpha})`);
    gradient.addColorStop(1, 'rgba(225,195,150,0)');
    return gradient;
  };
  context.fillStyle = rubbed(0, 0, 0, 26, 0.16);
  context.fillRect(0, 0, w, 26);
  context.fillStyle = rubbed(0, h, 0, h - 26, 0.16);
  context.fillRect(0, h - 26, w, 26);
  context.fillStyle = rubbed(w, 0, w - 20, 0, 0.12);
  context.fillRect(w - 20, 0, 20, h);
};

/** Gaufrage à froid : le dessin s'enfonce dans le cuir. */
const blind = (context: CanvasRenderingContext2D, draw: Draw): void => {
  context.save();
  context.translate(0, 1.2);
  context.strokeStyle = context.fillStyle = 'rgba(255,225,180,0.10)';
  draw(context);
  context.translate(0, -2.4);
  context.strokeStyle = context.fillStyle = 'rgba(0,0,0,0.55)';
  draw(context);
  context.translate(0, 1.2);
  context.strokeStyle = context.fillStyle = 'rgba(0,0,0,0.30)';
  draw(context);
  context.restore();
};

/** Doré au fer : l'ombre dans le cuir, puis l'or (dégradé de `y0` à `y1`). */
const gilt = (context: CanvasRenderingContext2D, draw: Draw, y0 = 0, y1 = H): void => {
  context.save();
  context.translate(0.8, 1.2);
  context.strokeStyle = context.fillStyle = 'rgba(0,0,0,0.6)';
  draw(context);
  context.translate(-0.8, -1.2);
  context.strokeStyle = context.fillStyle = gold(context, y0, y1);
  draw(context);
  context.restore();
};

/** Un signe qui ne se lit pas : trait, crochet ou boucle tiré au hasard, parfois un point (ni arabe, ni latin). */
const glyph = (context: CanvasRenderingContext2D, random: Random, x: number, y: number, s: number): void => {
  context.beginPath();
  const kind = Math.floor(random() * 5);
  if (kind === 0) {
    context.moveTo(x - s, y);
    context.quadraticCurveTo(x, y - s * 1.4, x + s, y);
  }
  if (kind === 1) {
    context.moveTo(x - s * 0.6, y - s);
    context.lineTo(x, y);
    context.lineTo(x + s * 0.6, y - s);
  }
  if (kind === 2) context.arc(x, y - s * 0.4, s * 0.5, 0.3, Math.PI * 1.7);
  if (kind === 3) {
    context.moveTo(x - s, y - s * 0.2);
    context.lineTo(x + s, y - s * 0.2);
    context.moveTo(x, y - s);
    context.lineTo(x, y + s * 0.3);
  }
  if (kind === 4) {
    context.moveTo(x - s, y);
    context.bezierCurveTo(x - s * 0.3, y - s * 1.2, x + s * 0.3, y + s * 0.6, x + s, y - s * 0.6);
  }
  context.stroke();
  if (random() < 0.5) {
    context.beginPath();
    context.arc(x + (random() - 0.5) * s, y - s * (1.1 + random() * 0.4), s * 0.12, 0, Math.PI * 2);
    context.fill();
  }
};

/** Le médaillon en amande (shamsa). */
const almond = (context: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void => {
  context.beginPath();
  context.moveTo(cx, cy - ry);
  context.bezierCurveTo(cx + rx * 0.9, cy - ry * 0.55, cx + rx * 0.9, cy + ry * 0.55, cx, cy + ry);
  context.bezierCurveTo(cx - rx * 0.9, cy + ry * 0.55, cx - rx * 0.9, cy - ry * 0.55, cx, cy - ry);
};

/** Le cadre : deux filets dorés, une frise de petits signes à froid entre eux. */
const frame = (context: CanvasRenderingContext2D): void => {
  gilt(context, (c) => {
    c.lineWidth = 2.5;
    c.strokeRect(34, 34, W - 68, H - 68);
    c.lineWidth = 1.2;
    c.strokeRect(62, 62, W - 124, H - 124);
  });
  blind(context, (c) => {
    c.lineWidth = 1.6;
    const random = rng(7);
    for (let x = 52; x < W - 40; x += 22) {
      glyph(c, random, x, 54, 6);
      glyph(c, random, x, H - 42, 6);
    }
    for (let y = 80; y < H - 60; y += 22) {
      glyph(c, random, 48, y, 6);
      glyph(c, random, W - 48, y, 6);
    }
  });
};

/** Le plat d'un côté ou de l'autre, dessiné aux mesures de la maquette. */
const plate = (draw: Draw): THREE.CanvasTexture =>
  board(LEATHER, LEATHER_EDGE, (context) => {
    context.scale(WIDTH / W, HEIGHT / H);
    draw(context);
  });

/** Le plat : le cadre, le médaillon et ses deux pendants, rempli de signes, les quatre écoinçons. */
export const necronomiconFront = (): THREE.CanvasTexture =>
  plate((context) => {
    leather(context, W, H, LEATHER, LEATHER_EDGE, 11);
    const [cx, cy] = [W / 2, H / 2];
    frame(context);
    gilt(
      context,
      (c) => {
        c.lineWidth = 3;
        almond(c, cx, cy, 150, 190);
        c.stroke();
        c.lineWidth = 1.2;
        almond(c, cx, cy, 136, 172);
        c.stroke();
        for (const side of [-1, 1]) {
          c.beginPath();
          c.moveTo(cx, cy + side * 190);
          c.lineTo(cx, cy + side * 222);
          c.stroke();
          c.beginPath();
          c.arc(cx, cy + side * 236, 14, 0, Math.PI * 2);
          c.stroke();
        }
      },
      cy - 240,
      cy + 240,
    );
    // Dans le médaillon : des signes en rinceau, poussés à l'or, qui ne se lisent pas.
    context.save();
    almond(context, cx, cy, 130, 166);
    context.clip();
    gilt(
      context,
      (c) => {
        c.lineWidth = 1.8;
        c.lineCap = 'round';
        const random = rng(730);
        for (let y = cy - 150; y < cy + 160; y += 26)
          for (let x = cx - 120; x < cx + 130; x += 24) glyph(c, random, x + ((y / 26) % 2) * 12, y, 8);
      },
      cy - 170,
      cy + 170,
    );
    context.restore();
    // Les écoinçons : deux arcs aux coins du cadre intérieur, quelques signes entre eux.
    gilt(context, (c) => {
      c.lineWidth = 2;
      for (const [x, y, sx, sy] of [
        [62, 62, 1, 1],
        [W - 62, 62, -1, 1],
        [62, H - 62, 1, -1],
        [W - 62, H - 62, -1, -1],
      ]) {
        c.beginPath();
        c.moveTo(x + sx * 110, y);
        c.quadraticCurveTo(x + sx * 70, y + sy * 70, x, y + sy * 110);
        c.stroke();
        c.beginPath();
        c.moveTo(x + sx * 80, y);
        c.quadraticCurveTo(x + sx * 50, y + sy * 50, x, y + sy * 80);
        c.stroke();
        const random = rng(x + y);
        c.lineWidth = 1.4;
        for (let i = 0; i < 4; i++) glyph(c, random, x + sx * (22 + i * 12), y + sy * (30 + (3 - i) * 10), 5);
        c.lineWidth = 2;
      }
    });
  });

/** Le plat arrière (absent de la maquette) : le même cadre, un petit médaillon sans pendants. */
export const necronomiconBack = (): THREE.CanvasTexture =>
  plate((context) => {
    leather(context, W, H, LEATHER, LEATHER_EDGE, 13);
    frame(context);
    gilt(
      context,
      (c) => {
        c.lineWidth = 2;
        almond(c, W / 2, H / 2, 70, 96);
        c.stroke();
      },
      H / 2 - 100,
      H / 2 + 100,
    );
  });

/** Le dos lisse, sans titre : de simples filets à l'or, des signes à froid. */
export const necronomiconSpine = (): THREE.CanvasTexture =>
  board(LEATHER, LEATHER_EDGE, (context) => {
    context.scale(WIDTH / SPINE_W, HEIGHT / H);
    leather(context, SPINE_W, H, '#5a2216', '#240a06', 12);
    gilt(context, (c) => {
      c.lineWidth = 1.5;
      for (const y of [40, 46, H - 46, H - 40]) {
        c.beginPath();
        c.moveTo(14, y);
        c.lineTo(SPINE_W - 14, y);
        c.stroke();
      }
    });
    blind(context, (c) => {
      c.lineWidth = 1.6;
      const random = rng(3);
      for (let y = 90; y < H - 70; y += 30) glyph(c, random, SPINE_W / 2, y, 9);
    });
  });

/** Les contre-plats : le maroquin, plus sombre, nu. */
export const necronomiconInside = (): THREE.CanvasTexture => board('#4a1a10', LEATHER_EDGE);
