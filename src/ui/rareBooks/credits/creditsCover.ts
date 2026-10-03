import { messages } from '../../../i18n';
import { HEIGHT, TITLE, WIDTH, board } from '../draw';
import type * as THREE from 'three';

/**
 * La couverture du livre des crédits (maquette .ai/maquette-credits.html, piste C, « le générique ») : le
 * générique de fin d'un film imprimé sur un livre moderne. Toile bleu nuit, le titre en argent, et sous lui
 * les vrais crédits qui montent et s'effacent dans le noir. Mesures de la maquette (plat 800 × 1000 : celles
 * de la texture ; dos 140 × 1000, élargi à la texture).
 */

/** Bleu nuit de la toile (haut, bas), et ses bords. */
export const NIGHT = '#152246';
export const NIGHT_EDGE = '#060a16';
export const SILVER = '#b8c0cc';
export const SILVER_DARK = '#9aa4b6';
/** Le dos de la maquette : 140 de large pour 1000 de haut (un livre de 0.1 d'épaisseur). */
const SPINE_WIDTH = 140;

export const loadCreditsFonts = (): Promise<unknown> =>
  Promise.all([`500 40px ${TITLE}`, `600 40px ${TITLE}`].map((font) => document.fonts.load(font)));

/** Le hasard de la maquette (Park-Miller) : les mêmes fils de toile. */
const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

export interface Style {
  font: string;
  color: string | CanvasGradient;
  spacing?: number;
  align?: CanvasTextAlign;
  alpha?: number;
}

/** Texte posé sur sa ligne de base, comme dans la maquette (centré : l'espacement final compensé). */
export const write = (context: CanvasRenderingContext2D, text: string, x: number, y: number, style: Style): void => {
  const { font, color, spacing = 0, align = 'center', alpha = 1 } = style;
  context.save();
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${spacing}px`;
  context.globalAlpha = alpha;
  context.fillText(text, x + (align === 'center' ? spacing / 2 : 0), y);
  context.restore();
};

export const hexagon = (context: CanvasRenderingContext2D, x: number, y: number, radius: number): void => {
  context.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    context.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
  }
  context.closePath();
};

/** La toile : bleu nuit qui descend vers le noir, ses fils en travers, les bords assombris. */
export const cloth = (context: CanvasRenderingContext2D, width: number, seed: number): void => {
  const night = context.createLinearGradient(0, 0, 0, HEIGHT);
  night.addColorStop(0, NIGHT);
  night.addColorStop(1, NIGHT_EDGE);
  context.fillStyle = night;
  context.fillRect(0, 0, width, HEIGHT);
  const random = rng(seed);
  for (let y = 0; y < HEIGHT; y += 3) {
    context.fillStyle = `rgba(0,0,0,${0.05 + random() * 0.06})`;
    context.fillRect(0, y, width, 1);
  }
  const shade = context.createRadialGradient(width / 2, HEIGHT / 2, Math.min(width, HEIGHT) * 0.3, width / 2, HEIGHT / 2, Math.max(width, HEIGHT) * 0.75);
  shade.addColorStop(0, 'rgba(0,0,0,0)');
  shade.addColorStop(1, 'rgba(0,0,0,0.5)');
  context.fillStyle = shade;
  context.fillRect(0, 0, width, HEIGHT);
};

/** Le générique monte de tant de pixels de texture par seconde ; une ligne tous les ROW. */
const SPEED = 15;
const ROW = 50;
/** Il apparaît en bas (BOTTOM) et s'efface sous le titre (TOP), sur FADE_TOP et FADE_BOTTOM pixels. */
const TOP = 330;
const BOTTOM = 990;
const FADE_TOP = 240;
const FADE_BOTTOM = 90;
/** Le blanc entre deux passages du générique. */
const GAP = 250;

/** Une ligne du générique : le rôle à gauche du milieu, le nom à droite. */
const rollRow = (context: CanvasRenderingContext2D, role: string, name: string, y: number, alpha: number): void => {
  write(context, role, WIDTH / 2 - 18, y, { font: `500 15px ${TITLE}`, color: SILVER_DARK, spacing: 2, align: 'right', alpha });
  write(context, name, WIDTH / 2 + 18, y, { font: `600 19px ${TITLE}`, color: '#e9edf4', spacing: 3, align: 'left', alpha });
};

export interface CreditsFront {
  texture: THREE.CanvasTexture;
  /** Fait monter le générique (à chaque image) : true si le plat a changé. */
  tick: (now: number) => boolean;
}

/**
 * Le plat : le nom du jeu, « CRÉDITS » en argent, un petit hexagone, puis le générique qui monte lentement,
 * comme à la fin d'un film : il naît en bas, s'efface sous le titre, et revient après un blanc. Mouvement
 * réduit : immobile, comme dans la maquette (net en bas, effacé en haut).
 */
export const creditsFront = (): CreditsFront => {
  const text = messages().rareBooks.credits;
  const rows = text.roll;
  // La toile et le titre ne bougent pas : dessinés une fois, recopiés sous le générique.
  const still = board(NIGHT, NIGHT_EDGE, (context) => {
    cloth(context, WIDTH, 31);
    const silver = context.createLinearGradient(0, 120, 0, 260);
    silver.addColorStop(0, '#f4f6fa');
    silver.addColorStop(0.6, SILVER);
    silver.addColorStop(1, '#7d8696');
    write(context, text.game, WIDTH / 2, 140, { font: `500 30px ${TITLE}`, color: SILVER, spacing: 12 });
    write(context, text.title.toLocaleUpperCase(), WIDTH / 2, 250, { font: `600 96px ${TITLE}`, color: silver, spacing: 10 });
    context.fillStyle = SILVER;
    hexagon(context, WIDTH / 2, 300, 7);
    context.fill();
  }).image as HTMLCanvasElement;
  const texture = board(NIGHT, NIGHT_EDGE);
  const context = (texture.image as HTMLCanvasElement).getContext('2d')!;
  const cycle = rows.length * ROW + GAP;

  /** Le générique monté de `offset` pixels ; null : immobile, comme la maquette. */
  const paint = (offset: number | null): void => {
    context.drawImage(still, 0, 0);
    rows.forEach(([role, name], i) => {
      const placed = 380 + i * ROW;
      if (offset === null) {
        // Immobile, le générique s'arrête au bas du plat.
        if (placed > BOTTOM - FADE_BOTTOM) return;
        rollRow(context, role, name, placed, Math.min(1, 0.15 + (i / (rows.length - 1)) * 0.9));
        return;
      }
      const y = TOP + ((((placed - offset - TOP) % cycle) + cycle) % cycle);
      const alpha = Math.min(1, (y - TOP) / FADE_TOP, (BOTTOM - y) / FADE_BOTTOM);
      if (alpha > 0) rollRow(context, role, name, y, alpha);
    });
  };

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  paint(reduced ? null : 0);
  let shown = 0;
  return {
    texture,
    tick: (now) => {
      if (reduced) return false;
      // Un pixel de texture à la fois : le plat n'est redessiné que quand le générique a bougé.
      const offset = Math.floor((now / 1000) * SPEED) % cycle;
      if (offset === shown) return false;
      shown = offset;
      paint(offset);
      texture.needsUpdate = true;
      return true;
    },
  };
};

/** Le dos : bleu bombé, deux filets d'argent, le titre en long, le nom du jeu plus bas. */
export const creditsSpine = (): THREE.CanvasTexture =>
  board(NIGHT, NIGHT_EDGE, (context) => {
    const text = messages().rareBooks.credits;
    context.scale(WIDTH / SPINE_WIDTH, 1);
    const round = context.createLinearGradient(0, 0, SPINE_WIDTH, 0);
    round.addColorStop(0, '#0a1124');
    round.addColorStop(0.5, '#18264c');
    round.addColorStop(1, '#070c1a');
    context.fillStyle = round;
    context.fillRect(0, 0, SPINE_WIDTH, HEIGHT);
    context.fillStyle = SILVER;
    context.fillRect(18, 70, SPINE_WIDTH - 36, 2);
    context.fillRect(18, HEIGHT - 72, SPINE_WIDTH - 36, 2);
    const along = (label: string, y: number, style: Style): void => {
      context.save();
      context.translate(SPINE_WIDTH / 2, y);
      context.rotate(Math.PI / 2);
      // Centré sur la hauteur des capitales (et non posé sur sa ligne de base au milieu du dos).
      context.font = style.font;
      write(context, label, 0, context.measureText(label).actualBoundingBoxAscent / 2, style);
      context.restore();
    };
    along(text.title.toLocaleUpperCase(), 400, { font: `600 44px ${TITLE}`, color: '#e6eaf2', spacing: 8 });
    along(text.game, 760, { font: `500 24px ${TITLE}`, color: SILVER_DARK, spacing: 6 });
  });

/** Les contre-plats : la toile, sans rien. */
export const creditsInside = (): THREE.CanvasTexture => board(NIGHT, NIGHT_EDGE, (context) => cloth(context, WIDTH, 41));
