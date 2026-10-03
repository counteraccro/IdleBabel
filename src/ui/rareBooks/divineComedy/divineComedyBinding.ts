import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/eb-garamond/500.css';
import { messages } from '../../../i18n';
import { HEIGHT, TITLE, WIDTH, board } from '../draw';
import { rng } from '../arabianNights/arabianNightsOrnaments';
import type { Drawing } from '../slowDrawing';

/**
 * La reliure des trois royaumes, piste C de .ai/maquette-divine-comedie.html (validée), une reliure de
 * bibliophile inventée : maroquin bleu nuit, et poussé à l'or tout l'univers du poème (la Terre creusée par
 * l'entonnoir de l'Enfer, la montagne du Purgatoire, les neuf ciels, l'Empyrée). Dessinée dans les unités de
 * la maquette (plat 640 × 800, dos 110 × 800) mises à l'échelle, avec le même hasard : même grain.
 */
export const NIGHT = ['#24345a', '#0a1022'] as const;
export const GARAMOND = "'EB Garamond', Georgia, serif";
/** Le reflet du maroquin bleu (et de ses bords frottés). */
const SHINE = '170,190,255';
const [W, H] = [640, 800];
/** Les plats sont dessinés à l'échelle de la maquette (640 de large). */
const K = WIDTH / W;

export const loadDivineComedyFonts = (): Promise<unknown> =>
  Promise.all(
    [`40px ${GARAMOND}`, `italic 40px ${GARAMOND}`, `500 40px ${GARAMOND}`, `600 40px ${TITLE}`].map((font) => document.fonts.load(font)),
  );

/** Du texte posé par sa ligne de base, centré. */
const print = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string | CanvasGradient,
  spacing = 0,
): void => {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${spacing}px`;
  context.fillText(text, x, y);
  context.letterSpacing = '0px';
};

/** Du texte poussé à l'or : un creux sombre décalé, puis l'or. */
const gilt = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  gold: CanvasGradient,
  spacing = 0,
): void => {
  print(context, text, x + 1, y + 1.5, font, 'rgba(0,0,0,0.45)', spacing);
  print(context, text, x, y, font, gold, spacing);
};

/** L'or, en biais sur toute la pièce (comme sur la maquette). */
const goldOver = (context: CanvasRenderingContext2D, width: number, height: number): CanvasGradient => {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#8a6a2c');
  gradient.addColorStop(0.35, '#f2d68e');
  gradient.addColorStop(0.55, '#c9a24f');
  gradient.addColorStop(0.8, '#f2d68e');
  gradient.addColorStop(1, '#8a6a2c');
  return gradient;
};

/** Un dessin poussé à l'or : l'empreinte (ombre), l'or, un reflet sur les traits. */
const tooled = (context: CanvasRenderingContext2D, draw: (context: CanvasRenderingContext2D) => void, gold: CanvasGradient): void => {
  context.save();
  context.translate(0.9, 1.2);
  context.strokeStyle = context.fillStyle = 'rgba(0,0,0,0.5)';
  draw(context);
  context.restore();
  context.save();
  context.strokeStyle = context.fillStyle = gold;
  draw(context);
  context.restore();
  context.save();
  context.translate(-0.5, -0.6);
  context.globalAlpha = 0.22;
  context.strokeStyle = '#fff3cf';
  context.fillStyle = 'rgba(0,0,0,0)';
  draw(context);
  context.restore();
};

/** Grains du maroquin dessinés d'un morceau (moins d'une milliseconde). */
const GRAINS_PER_STEP = 400;

/** Le maroquin : dégradé, grain fin en petits cailloux (ombre et reflet), bords frottés. */
function* morocco(context: CanvasRenderingContext2D, width: number, height: number, seed: number): Generator<void> {
  const shade = context.createRadialGradient(
    width / 2,
    height * 0.45,
    Math.min(width, height) * 0.1,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75,
  );
  shade.addColorStop(0, NIGHT[0]);
  shade.addColorStop(1, NIGHT[1]);
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);
  const random = rng(seed * 4241);
  for (let grain = 0; grain < (width * height) / 16; grain++) {
    const [x, y] = [random() * width, random() * height];
    const [rx, ry, angle] = [0.8 + random() * 1.6, 0.6 + random() * 1.1, random() * Math.PI];
    context.fillStyle = `rgba(0,0,0,${0.08 + random() * 0.12})`;
    context.beginPath();
    context.ellipse(x + 0.6, y + 0.6, rx, ry, angle, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = `rgba(${SHINE},${random() * 0.05})`;
    context.beginPath();
    context.ellipse(x - 0.4, y - 0.4, rx * 0.7, ry * 0.7, angle, 0, Math.PI * 2);
    context.fill();
    if (grain % GRAINS_PER_STEP === GRAINS_PER_STEP - 1) yield;
  }
  const rubbed = (x0: number, y0: number, x1: number, y1: number): CanvasGradient => {
    const gradient = context.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, `rgba(${SHINE},0.18)`);
    gradient.addColorStop(1, `rgba(${SHINE},0)`);
    return gradient;
  };
  context.fillStyle = rubbed(0, 0, 0, 16);
  context.fillRect(0, 0, width, 16);
  context.fillStyle = rubbed(0, height, 0, height - 16);
  context.fillRect(0, height - 16, width, 16);
  context.fillStyle = rubbed(width, 0, width - 12, 0);
  context.fillRect(width - 12, 0, 12, height);
}

/** Une petite étoile pleine à `points` branches. */
const star = (context: CanvasRenderingContext2D, cx: number, cy: number, radius: number, points = 5, inner = 0.45): void => {
  context.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const reach = i % 2 ? radius * inner : radius;
    context.lineTo(cx + Math.cos(angle) * reach, cy + Math.sin(angle) * reach);
  }
  context.closePath();
  context.fill();
};

const line = (context: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number): void => {
  context.beginPath();
  context.moveTo(x0, y0);
  context.lineTo(x1, y1);
  context.stroke();
};

const circle = (context: CanvasRenderingContext2D, cx: number, cy: number, radius: number, fill = false): void => {
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  if (fill) context.fill();
  else context.stroke();
};

/** L'Enfer : un entonnoir à neuf gradins, ouvert sous la croûte de la Terre (une corde), jusqu'au centre. */
const inferno = (context: CanvasRenderingContext2D, cx: number, cy: number): void => {
  const [steps, top, half] = [9, cy - 50, 44];
  const depth = (step: number): number => top + 6 + (step * (cy - top - 6)) / steps;
  context.lineWidth = 1.1;
  context.beginPath();
  context.moveTo(cx - half, top + 6);
  for (let step = 0; step < steps; step++) {
    const x = half * (1 - (step + 1) / steps);
    context.lineTo(cx - x - 3, depth(step) + 1);
    context.lineTo(cx - x, depth(step + 1));
  }
  context.lineTo(cx, cy);
  for (let step = steps - 1; step >= 0; step--) {
    const x = half * (1 - (step + 1) / steps);
    context.lineTo(cx + x, depth(step + 1));
    context.lineTo(cx + x + 3, depth(step) + 1);
  }
  context.lineTo(cx + half, top + 6);
  context.stroke();
  for (let step = 1; step < steps; step++) {
    const x = half * (1 - step / steps);
    line(context, cx - x, depth(step), cx + x, depth(step));
  }
};

/** Le Purgatoire : la montagne qui sort de la Terre aux antipodes, ses sept corniches, l'Éden au sommet. */
const purgatory = (context: CanvasRenderingContext2D, cx: number, base: number): void => {
  const peak = base + 34;
  context.beginPath();
  context.moveTo(cx - 22, base);
  context.lineTo(cx - 5, peak);
  context.lineTo(cx + 5, peak);
  context.lineTo(cx + 22, base);
  context.closePath();
  context.fill();
  context.save();
  context.strokeStyle = 'rgba(10,16,34,0.9)';
  context.lineWidth = 1;
  for (let terrace = 1; terrace <= 7; terrace++) {
    const y = base + (terrace * (peak - base)) / 8.5;
    const x = 22 - ((22 - 5) * terrace) / 8.5;
    line(context, cx - x, y, cx + x, y);
  }
  context.restore();
  circle(context, cx, peak + 4, 3, true);
};

/** Les neuf ciels (la Lune, Mercure, Vénus, le Soleil, Mars, Jupiter, Saturne, les étoiles fixes, le premier mobile). */
const SKIES = [96, 112, 128, 144, 160, 176, 192, 210, 228];
/** Où est l'astre de chacun des sept premiers ciels. */
const PLANETS = [-2.4, -0.5, 0.9, -1.5, 2.6, -2.9, 0.2];

/** Les ciels, et sur chacun son astre ; les étoiles fixes ; l'Empyrée en couronne de rayons. */
const heavens = (context: CanvasRenderingContext2D, cx: number, cy: number): void => {
  context.lineWidth = 0.9;
  for (const [sky, radius] of SKIES.entries()) {
    circle(context, cx, cy, radius);
    if (sky >= PLANETS.length) continue;
    const [x, y] = [cx + Math.cos(PLANETS[sky]) * radius, cy + Math.sin(PLANETS[sky]) * radius];
    if (sky === 0) {
      // La Lune, en croissant.
      context.beginPath();
      context.arc(x, y, 5, Math.PI * 0.3, Math.PI * 1.7);
      context.arc(x + 3, y, 4, Math.PI * 1.6, Math.PI * 0.4, true);
      context.fill();
    } else if (sky === 3) {
      // Le Soleil et ses rayons.
      circle(context, x, y, 5, true);
      for (let ray = 0; ray < 12; ray++) {
        const angle = (ray / 12) * Math.PI * 2;
        line(context, x + Math.cos(angle) * 7, y + Math.sin(angle) * 7, x + Math.cos(angle) * 11, y + Math.sin(angle) * 11);
      }
    } else circle(context, x, y, 3.2, true);
  }
  const random = rng(21);
  for (let fixed = 0; fixed < 46; fixed++) {
    const [angle, radius] = [random() * Math.PI * 2, 194 + random() * 14];
    star(context, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, 2 + random() * 1.6, 5);
  }
  context.lineWidth = 1;
  for (let ray = 0; ray < 96; ray++) {
    const [angle, outer] = [(ray / 96) * Math.PI * 2, ray % 2 ? 244 : 252];
    line(context, cx + Math.cos(angle) * 234, cy + Math.sin(angle) * 234, cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
  }
};

/**
 * Le plan du monde de Dante : la Terre au centre (l'entonnoir de l'Enfer sous Jérusalem, la montagne du
 * Purgatoire aux antipodes), les neuf ciels autour, l'Empyrée au-delà.
 */
const cosmos = (context: CanvasRenderingContext2D, cx: number, cy: number): void => {
  const earth = 66;
  context.lineWidth = 1.6;
  circle(context, cx, cy, earth);
  inferno(context, cx, cy);
  // Jérusalem : une petite croix au bord de la Terre.
  const crust = cy - earth;
  context.lineWidth = 1.4;
  line(context, cx, crust - 14, cx, crust - 2);
  line(context, cx - 5, crust - 10, cx + 5, crust - 10);
  purgatory(context, cx, cy + earth - 2);
  heavens(context, cx, cy);
};

/** Le double filet doré, une étoile à huit branches à chaque angle. */
const frames = (context: CanvasRenderingContext2D): void => {
  context.lineWidth = 2;
  context.strokeRect(24, 24, W - 48, H - 48);
  context.lineWidth = 0.8;
  context.strokeRect(31, 31, W - 62, H - 62);
  for (const [x, y] of [
    [31, 31],
    [W - 31, 31],
    [31, H - 31],
    [W - 31, H - 31],
  ])
    star(context, x, y, 7, 8, 0.4);
};

/** Trois cercles qui s'emboîtent, un point au centre : les trois royaumes (le dos, le plat arrière). */
const realms = (context: CanvasRenderingContext2D, cx: number, cy: number, radii: number[]): void => {
  context.lineWidth = 1.2;
  for (const radius of radii) circle(context, cx, cy, radius);
  circle(context, cx, cy, 3, true);
};

/** Une pièce de la reliure : `draw` y dessine par morceaux (yield : une pause possible). */
function* piece(draw: (context: CanvasRenderingContext2D) => Generator<void>): Drawing {
  const canvas = board(NIGHT[0], NIGHT[1]).image as HTMLCanvasElement;
  yield* draw(canvas.getContext('2d')!);
  return canvas;
}

/** Le plat : les filets, le titre, l'univers du poème, l'auteur. */
export const divineComedyFront = (): Drawing =>
  piece(function* (context) {
    context.save();
    context.scale(K, K);
    yield* morocco(context, W, H, 7);
    const gold = goldOver(context, W, H);
    tooled(
      context,
      (tool) => {
        frames(tool);
        cosmos(tool, W / 2, 414);
      },
      gold,
    );
    const { title, author } = messages().rareBooks.divineComedy.front;
    gilt(context, title, W / 2, 112, `600 38px ${TITLE}`, gold, 3);
    gilt(context, author, W / 2, 726, `600 26px ${TITLE}`, gold, 10);
    context.restore();
  });

/**
 * Le plat arrière (pas sur la maquette) : les mêmes filets, et au centre les trois royaumes du dos, en grand,
 * dans la couronne des neuf ciels. Vu retourné : sa tranche est à gauche, ses bords frottés aussi.
 */
export const divineComedyBack = (): Drawing =>
  piece(function* (context) {
    context.save();
    context.translate(WIDTH, 0);
    context.scale(-K, K);
    yield* morocco(context, W, H, 8);
    context.restore();
    context.save();
    context.scale(K, K);
    const gold = goldOver(context, W, H);
    tooled(
      context,
      (tool) => {
        frames(tool);
        realms(tool, W / 2, H / 2, [30, 54, 78]);
        for (let sky = 0; sky < 9; sky++) {
          const angle = (sky / 9) * Math.PI * 2 - Math.PI / 2;
          star(tool, W / 2 + Math.cos(angle) * 108, H / 2 + Math.sin(angle) * 108, 6, 8, 0.4);
        }
      },
      gold,
    );
    context.restore();
  });

/** Le dos : quatre nerfs, des étoiles, le titre en long, les trois royaumes. */
export const divineComedySpine = (thickness: number): Drawing =>
  piece(function* (context) {
    // Dessiné sans déformation, à l'échelle de la maquette : `width` est la largeur visible du dos.
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const scale = HEIGHT / H;
    const width = WIDTH / stretch / scale;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch * scale, scale);
    context.translate(-width / 2, 0);
    yield* morocco(context, width, H, 13);
    // L'arrondi du dos : plus sombre sur les bords.
    const round = context.createLinearGradient(0, 0, width, 0);
    round.addColorStop(0, 'rgba(0,0,0,0.45)');
    round.addColorStop(0.3, 'rgba(0,0,0,0)');
    round.addColorStop(0.7, 'rgba(0,0,0,0)');
    round.addColorStop(1, 'rgba(0,0,0,0.45)');
    context.fillStyle = round;
    context.fillRect(0, 0, width, H);
    const gold = goldOver(context, width, 0);
    const bands = [96, 210, 590, 700];
    // Les nerfs : un bourrelet, ombre dessous, reflet dessus.
    for (const y of bands) {
      const band = context.createLinearGradient(0, y - 7, 0, y + 7);
      band.addColorStop(0, 'rgba(0,0,0,0.35)');
      band.addColorStop(0.35, 'rgba(255,220,190,0.14)');
      band.addColorStop(0.65, 'rgba(0,0,0,0.05)');
      band.addColorStop(1, 'rgba(0,0,0,0.45)');
      context.fillStyle = band;
      context.fillRect(0, y - 7, width, 14);
    }
    tooled(
      context,
      (tool) => {
        tool.lineWidth = 0.8;
        for (const y of bands) {
          line(tool, 6, y - 10, width - 6, y - 10);
          line(tool, 6, y + 10, width - 6, y + 10);
        }
        star(tool, width / 2, 50, 8, 8, 0.4);
        star(tool, width / 2, 152, 6, 8, 0.4);
        realms(tool, width / 2, 645, [10, 18, 26]);
        star(tool, width / 2, 750, 6, 8, 0.4);
      },
      gold,
    );
    context.save();
    context.translate(width / 2, 400);
    context.rotate(-Math.PI / 2);
    gilt(context, messages().rareBooks.divineComedy.front.title, 0, 9, `600 24px ${TITLE}`, gold, 2);
    context.restore();
    context.restore();
  });
