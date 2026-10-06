import '@fontsource/cormorant-garamond/600.css';
import '@fontsource/cormorant-garamond/600-italic.css';
import '@fontsource/cormorant-garamond/700.css';
import type * as THREE from 'three';
import { canvasTexture } from '../book3d/textures';
import { plainBoard } from '../rareBooks/draw';
import { babelTextWidth, drawBabelText, hasBabelDigits } from '../babelDigits';
import { formatNumber } from '../../core/format';
import { getLocale, t } from '../../i18n';
import { hiveCells, hiveRings, hiveView, type HiveView } from './etheriumHive';
import type { GameState } from '../../core/state';

/**
 * La couverture de l'Etherium, d'après la maquette validée (.ai/maquette-etherium.html, B2 « Lumière seule ») :
 * un cuir violet sans rien ; à 1 million de pages lues à vie, des filets dorés, son nom, et une ruche (etheriumHive.ts)
 * qui dit l'Éther que l'ouverture rapporterait, ce nombre écrit dessous dans la notation du joueur. Les mesures sont
 * celles de la maquette (640 × 800), mises à l'échelle de la texture (800 × 1000).
 */
const WIDTH = 800;
const HEIGHT = 1000;
const K = WIDTH / 640;
/** La maquette du dos : 130 × 800, étirée sur toute la texture (elle couvre le dos, d'un mors à l'autre). */
const SPINE_W = 130;
const SPINE_H = 800;
const GARA = "'Cormorant Garamond', Georgia, serif";
const GOLD = '#d9b56a';
export const ETHERIUM_LEATHER = { light: '#4a2370', dark: '#1c0b2c' };
/** La couverture vivante se regarde au plus une fois par seconde, et ne se redessine que si ce qu'elle montre change. */
const LOOK_EVERY = 1000;

type Context = CanvasRenderingContext2D;

export const loadEtheriumFonts = (): Promise<unknown> =>
  Promise.all([`600 60px ${GARA}`, `italic 600 30px ${GARA}`, `700 70px ${GARA}`].map((font) => document.fonts.load(font)));

/** Hasard reproductible (Park-Miller), comme dans la maquette. */
const rng = (seed: number) => (): number => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const canvas = (width = WIDTH, height = HEIGHT): [HTMLCanvasElement, Context] => {
  const node = document.createElement('canvas');
  node.width = width;
  node.height = height;
  return [node, node.getContext('2d')!];
};

const gold = (context: Context, y0: number, y1: number): CanvasGradient => {
  const gradient = context.createLinearGradient(0, y0, 0, y1);
  gradient.addColorStop(0, '#f3dc96');
  gradient.addColorStop(0.5, '#c9a052');
  gradient.addColorStop(1, '#8a6a2e');
  return gradient;
};

const text = (context: Context, value: string, x: number, y: number, font: string, color: string | CanvasGradient, spacing = 0): void => {
  context.save();
  context.font = font;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${spacing}px`;
  context.fillText(value, x + spacing / 2, y);
  context.restore();
};

/** Le cuir violet, son grain et ses griffures (repère de la maquette, `width` × `height`). */
const leather = (context: Context, width: number, height: number, seed: number): void => {
  const glow = context.createRadialGradient(width / 2, height / 2, width * 0.1, width / 2, height / 2, Math.max(width, height) * 0.75);
  glow.addColorStop(0, ETHERIUM_LEATHER.light);
  glow.addColorStop(1, ETHERIUM_LEATHER.dark);
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);
  const random = rng(seed);
  for (let i = 0; i < (width * height) / 90; i++) {
    context.fillStyle = random() < 0.5 ? 'rgba(230,200,255,0.03)' : 'rgba(0,0,0,0.12)';
    context.fillRect(random() * width, random() * height, 1 + random() * 2, 1 + random() * 2);
  }
  context.lineWidth = 1;
  for (let i = 0; i < (width * height) / 9000; i++) {
    context.strokeStyle = 'rgba(220,190,255,0.05)';
    context.beginPath();
    const [x, y] = [random() * width, random() * height];
    context.moveTo(x, y);
    context.lineTo(x + (random() - 0.5) * 50, y + (random() - 0.5) * 18);
    context.stroke();
  }
};

/** Le cuir du plat, dessiné une fois : chaque nouvelle image de la couverture repart de lui. */
let plate: HTMLCanvasElement | null = null;
const leatherPlate = (): HTMLCanvasElement => {
  if (plate) return plate;
  const [node, context] = canvas();
  context.scale(K, K);
  leather(context, 640, 800, 7);
  plate = node;
  return node;
};

/** Filets : à froid avant le nom, dorés ensuite. */
const frame = (context: Context, gilt: boolean): void => {
  context.save();
  if (gilt) {
    context.strokeStyle = GOLD;
    context.globalAlpha = 0.85;
  } else context.strokeStyle = 'rgba(0,0,0,0.35)';
  context.lineWidth = 4;
  context.strokeRect(29, 29, 640 - 58, 800 - 58);
  context.lineWidth = 1.6;
  context.strokeRect(51, 51, 640 - 102, 800 - 102);
  context.restore();
};

/** Une alvéole, la pointe en haut. */
const hexagon = (context: Context, x: number, y: number, size: number): void => {
  context.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const [px, py] = [x + size * Math.cos(angle), y + size * Math.sin(angle)];
    if (i === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  }
  context.closePath();
};

const PALE_EDGE = 'rgba(214,180,255,0.75)';

const percent = (value: number): string => new Intl.NumberFormat(getLocale(), { style: 'percent' }).format(value / 100);

/** Une alvéole allumée : un violet qui luit, son contour pâle, un reflet. `glow` : pour la lumière propre, sans halo. */
const litCell = (context: Context, x: number, y: number, inner: number, glow: boolean): void => {
  context.save();
  if (!glow) {
    context.shadowColor = '#b27cff';
    context.shadowBlur = Math.max(8, inner * 0.45) * K;
  }
  hexagon(context, x, y, inner);
  const fill = context.createRadialGradient(x, y - inner * 0.3, inner * 0.1, x, y, inner);
  fill.addColorStop(0, '#8655d6');
  fill.addColorStop(1, '#43197e');
  context.fillStyle = fill;
  context.fill();
  context.restore();
  if (glow) return;
  hexagon(context, x, y, inner);
  context.strokeStyle = PALE_EDGE;
  context.lineWidth = Math.max(1.3, inner * 0.045);
  context.stroke();
  context.save();
  hexagon(context, x, y, inner);
  context.clip();
  const sheen = context.createLinearGradient(x - inner, y - inner, x + inner * 0.2, y + inner * 0.2);
  sheen.addColorStop(0, 'rgba(255,245,255,0.28)');
  sheen.addColorStop(0.5, 'rgba(255,245,255,0)');
  context.fillStyle = sheen;
  context.fillRect(x - inner, y - inner, inner * 2, inner * 2);
  context.restore();
};

/** L'alvéole suivante : un liquide violet jusqu'à `level`, et le pourcentage du premier Éther tant qu'il n'y en a pas. */
const nextCell = (context: Context, x: number, y: number, inner: number, view: HiveView, glow: boolean): void => {
  context.save();
  hexagon(context, x, y, inner);
  context.clip();
  if (!glow) {
    context.fillStyle = 'rgba(0,0,0,0.25)';
    context.fillRect(x - inner, y - inner, inner * 2, inner * 2);
  }
  const top = y + inner - view.level * inner * 2;
  const liquid = context.createLinearGradient(0, top, 0, y + inner);
  liquid.addColorStop(0, 'rgba(190,140,255,0.95)');
  liquid.addColorStop(1, 'rgba(110,60,190,0.95)');
  if (!glow) {
    context.shadowColor = '#b27cff';
    context.shadowBlur = 14 * K;
  }
  context.fillStyle = liquid;
  context.beginPath();
  context.moveTo(x - inner, top);
  for (let k = 0; k <= 12; k++) context.lineTo(x - inner + (k * inner) / 6, top + inner * 0.03 * Math.sin(k * 1.3));
  context.lineTo(x + inner, y + inner);
  context.lineTo(x - inner, y + inner);
  context.closePath();
  context.fill();
  context.restore();
  if (glow) return;
  hexagon(context, x, y, inner);
  context.strokeStyle = PALE_EDGE;
  context.lineWidth = Math.max(1.2, inner * 0.04);
  context.stroke();
  if (view.gain >= 1) return;
  const size = inner * 0.5;
  context.save();
  context.shadowColor = 'rgba(0,0,0,0.8)';
  context.shadowBlur = 6 * K;
  text(context, percent(view.percent), x, y + size * 0.35, `italic 600 ${size}px ${GARA}`, '#f3e6ff');
  context.restore();
};

/** Une alvéole encore éteinte : gravée à froid. */
const coldCell = (context: Context, x: number, y: number, inner: number): void => {
  hexagon(context, x, y, inner);
  context.strokeStyle = 'rgba(0,0,0,0.4)';
  context.lineWidth = Math.max(1.2, inner * 0.05);
  context.stroke();
  hexagon(context, x + 1, y + 1.5, inner);
  context.strokeStyle = 'rgba(220,190,255,0.06)';
  context.lineWidth = 1.2;
  context.stroke();
};

/** La ruche, centrée en (320, 420), dans 440 × 400 ; `glow` : seulement ce qui luit, pour la lumière propre. */
const hive = (context: Context, view: HiveView, glow: boolean): void => {
  const rings = hiveRings(view.lit + 1);
  const size = Math.min(440 / ((2 * rings + 1) * Math.sqrt(3)), 400 / (3 * rings + 2));
  const inner = size * 0.88;
  hiveCells(rings).forEach(([q, r], index) => {
    const [x, y] = [320 + size * Math.sqrt(3) * (q + r / 2), 420 + size * 1.5 * r];
    if (index < view.lit) litCell(context, x, y, inner, glow);
    else if (index === view.lit) nextCell(context, x, y, inner, view, glow);
    else if (!glow) coldCell(context, x, y, inner);
  });
};

/** L'Éther à l'ouverture, en or et dans la notation du joueur ; dessous, le prochain Éther tant qu'il compte. */
/** Un nombre doré au halo violet, centré, sur la ligne `y` ; plus petit s'il ne tient pas en 500 de large. */
const goldNumber = (context: Context, value: string, y: number, largest: number): void => {
  const babel = hasBabelDigits(value);
  let size = largest;
  const width = (): number => {
    context.font = `700 ${size}px ${GARA}`;
    return babel ? babelTextWidth(context, value, size * 0.8) : context.measureText(value).width;
  };
  while (width() > 500) size -= 2;
  context.save();
  context.shadowColor = '#c99cff';
  context.shadowBlur = size * 0.5 * K;
  if (babel) {
    context.font = `700 ${size}px ${GARA}`;
    context.fillStyle = gold(context, y - size * 0.75, y);
    const glyphs = size * 0.8;
    drawBabelText(context, value, 320 - width() / 2, y - glyphs * 0.95, glyphs, y);
  } else text(context, value, 320, y, `700 ${size}px ${GARA}`, gold(context, y - size * 0.75, y));
  context.restore();
};

const gainLine = (context: Context, view: HiveView, label: string): void => {
  goldNumber(context, `+${label}`, view.gain < 10 ? 690 : 718, 78);
  if (view.gain < 10)
    text(
      context,
      t('etherium.cover.next').replace('{n}', percent(view.percent)),
      320,
      738,
      `italic 600 32px ${GARA}`,
      'rgba(225,200,255,0.85)',
    );
};

const paintFront = (context: Context, view: HiveView, label: string): void => {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.drawImage(leatherPlate(), 0, 0);
  context.scale(K, K);
  frame(context, view.named);
  if (!view.named) return;
  text(context, t('etherium.cover.title'), 320, 150, `600 60px ${GARA}`, gold(context, 105, 150), 10.2);
  context.fillStyle = gold(context, 174, 178);
  context.fillRect(320 - 60, 176, 120, 1.5);
  hive(context, view, false);
  if (view.gain >= 1) gainLine(context, view, label);
};

/** La lumière propre du plat (bookMesh : coverGlow) : les alvéoles allumées et le liquide, sur du noir. */
const paintGlow = (context: Context, view: HiveView): void => {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = '#000';
  context.fillRect(0, 0, WIDTH, HEIGHT);
  if (!view.named) return;
  context.scale(K, K);
  context.globalAlpha = 0.5;
  hive(context, view, true);
  context.globalAlpha = 1;
};

/**
 * Le plat arrière (inventé, pas dans la maquette) : une alvéole allumée, et l'Éther en réserve (à dépenser au prochain
 * réveil) en or dessous.
 */
const paintBack = (context: Context, named: boolean, reserve: string): void => {
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.drawImage(leatherPlate(), 0, 0);
  context.scale(K, K);
  frame(context, named);
  if (!named) return;
  litCell(context, 320, 290, 62, false);
  goldNumber(context, reserve, 470, 72);
  text(context, t('etherium.cover.reserve'), 320, 520, `italic 600 30px ${GARA}`, 'rgba(225,200,255,0.85)');
};

/** La tranche de la maquette (130 × 800) : filets, le nom de haut en bas, trois alvéoles dont celle du milieu luit. */
const paintSpine = (context: Context, named: boolean): void => {
  const [node, spine] = canvas(SPINE_W, SPINE_H);
  leather(spine, SPINE_W, SPINE_H, 21);
  if (named) {
    for (const y of [40, 47, SPINE_H - 47, SPINE_H - 40]) {
      spine.fillStyle = gold(spine, y, y + 2);
      spine.fillRect(12, y, SPINE_W - 24, 2);
    }
    // Le nom, de haut en bas, centré en travers de la tranche (ses capitales mesurées) et entre le filet du haut et
    // les alvéoles. Tourné d'un quart de tour, le haut des lettres regarde +x.
    const title = t('etherium.cover.title');
    spine.font = `600 34px ${GARA}`;
    const { actualBoundingBoxAscent: ascent, actualBoundingBoxDescent: descent } = spine.measureText(title);
    spine.save();
    spine.translate(SPINE_W / 2 - (ascent - descent) / 2, (47 + SPINE_H - 140 - 34 - 17) / 2);
    spine.rotate(Math.PI / 2);
    text(spine, title, 0, 0, `600 34px ${GARA}`, gold(spine, -26, 4), 6);
    spine.restore();
    for (const [dy, full] of [
      [-34, false],
      [0, true],
      [34, false],
    ] as const) {
      const y = SPINE_H - 140 + dy;
      if (full) {
        spine.save();
        spine.shadowColor = '#c99cff';
        spine.shadowBlur = 14;
        hexagon(spine, SPINE_W / 2, y, 17);
        spine.fillStyle = '#c8a4ff';
        spine.fill();
        spine.restore();
      }
      hexagon(spine, SPINE_W / 2, y, 17);
      spine.strokeStyle = gold(spine, y - 17, y + 17);
      spine.lineWidth = 2;
      spine.stroke();
    }
  }
  const rub = spine.createLinearGradient(0, 0, SPINE_W, 0);
  rub.addColorStop(0, 'rgba(0,0,0,0.4)');
  rub.addColorStop(0.5, 'rgba(220,190,255,0.07)');
  rub.addColorStop(1, 'rgba(0,0,0,0.4)');
  spine.fillStyle = rub;
  spine.fillRect(0, 0, SPINE_W, SPINE_H);
  context.drawImage(node, 0, 0, WIDTH, HEIGHT);
};

export interface EtheriumCover {
  front: THREE.CanvasTexture;
  glow: THREE.CanvasTexture;
  back: THREE.CanvasTexture;
  spine: THREE.CanvasTexture;
  plain: THREE.CanvasTexture;
  /** Regarde l'état (au plus une fois par seconde) ; vrai si la couverture a été redessinée. */
  tick: (now: number) => boolean;
}

export const etheriumCover = (state: GameState): EtheriumCover => {
  const [front, frontContext] = canvas();
  const [glow, glowContext] = canvas();
  const [back, backContext] = canvas();
  const [spine, spineContext] = canvas();
  const textures = { front: canvasTexture(front), glow: canvasTexture(glow), back: canvasTexture(back), spine: canvasTexture(spine) };
  let shown = '';
  let shownBack = '';
  let named: boolean | null = null;
  let lastLook = -Infinity;
  /** Redessine ce qui a changé : la ruche et le nombre, ou tout le livre quand le nom paraît. */
  const paint = (): boolean => {
    const view = hiveView(state);
    const label = view.gain >= 1 ? formatNumber(view.gain, getLocale()) : '';
    const key = [view.named, view.lit, Math.floor(view.level * 100), view.gain < 10 ? view.percent : -1, label, getLocale()].join('|');
    const reserve = formatNumber(state.ether, getLocale());
    const backKey = [view.named, reserve, getLocale()].join('|');
    if (key === shown && backKey === shownBack) return false;
    if (key !== shown) {
      shown = key;
      paintFront(frontContext, view, label);
      paintGlow(glowContext, view);
      textures.front.needsUpdate = true;
      textures.glow.needsUpdate = true;
    }
    if (backKey !== shownBack) {
      shownBack = backKey;
      paintBack(backContext, view.named, reserve);
      textures.back.needsUpdate = true;
    }
    if (view.named !== named) {
      named = view.named;
      paintSpine(spineContext, named);
      textures.spine.needsUpdate = true;
    }
    return true;
  };
  paint();
  return {
    ...textures,
    plain: plainBoard(ETHERIUM_LEATHER.light, ETHERIUM_LEATHER.dark),
    tick: (now) => {
      if (now - lastLook < LOOK_EVERY) return false;
      lastLook = now;
      return paint();
    },
  };
};
