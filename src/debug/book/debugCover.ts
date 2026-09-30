import type * as THREE from 'three';
import { canvasTexture } from '../../ui/book3d/textures';
import { HEIGHT, WIDTH } from '../../ui/book3d/leatherCover';
import { hash } from '../../ui/strangeBook/pageItems';

/**
 * Couverture du livre de débogage (maquette E, choisie par l'auteur) : ce n'est pas un livre ordinaire.
 * Une plaque d'obsidienne ; au centre, des hexagones qui s'enfoncent sans fin jusqu'à un cœur doré (la
 * profondeur infinie des possibilités) ; tout autour, un cadre de symboles gravés dont quelques-uns,
 * par moments, s'allument en lettres claires (il sait tout). Le titre dit « Débogage » en clair.
 */

/** Unité de la maquette (240 × 300) dans la texture (800 × 1000). */
const U = WIDTH / 240;
const GOLD = '#d9b56a';
const ENGRAVED = '#57537a';
const LIT = '#ffe3a0';
/** Mots qui s'écrivent dans le cadre, l'un après l'autre. */
const WORDS = ['DEBUG', 'ÉCRIRE', 'TOUT', '410', 'VOIR'];
/** Un mot toutes les tant de ms ; ses lettres s'allument une à une, puis s'éteignent. */
const WORD_EVERY = 3200;
const LETTER_STEP = 140;
const LETTER_HOLD = 2600;

/** Places du cadre, dans l'ordre du tour (haut, droite, bas, gauche), en unités de la maquette. */
const RING: [number, number][] = [
  ...Array.from({ length: 13 }, (_, i): [number, number] => [24 + i * 16, 22]),
  ...Array.from({ length: 13 }, (_, i): [number, number] => [216, 38 + i * 16]),
  ...Array.from({ length: 13 }, (_, i): [number, number] => [216 - i * 16, 254]),
  ...Array.from({ length: 13 }, (_, i): [number, number] => [24, 238 - i * 16]),
];

/**
 * Un symbole gravé : un trait continu qui erre sur une grille 3 × 3 (de proche en proche, diagonales
 * comprises), tiré de sa graine. Dessiné, pas écrit : aucune police n'est nécessaire, et chaque symbole
 * reste le même d'une image à l'autre.
 */
const drawGlyph = (context: CanvasRenderingContext2D, seed: number, x: number, y: number): void => {
  const half = 4.2 * U;
  let [col, row] = [hash(seed, 1) % 3, hash(seed, 2) % 3];
  context.beginPath();
  context.moveTo(x + (col - 1) * half, y + (row - 1) * half * 1.3);
  const steps = 3 + (hash(seed, 3) % 2);
  for (let k = 0; k < steps; k++) {
    // Un pas vers une case voisine (jamais sur place), en restant dans la grille.
    const moves = [-1, 0, 1]
      .flatMap((dc) => [-1, 0, 1].map((dr): [number, number] => [dc, dr]))
      .filter(([dc, dr]) => (dc || dr) && col + dc >= 0 && col + dc <= 2 && row + dr >= 0 && row + dr <= 2);
    const [dc, dr] = moves[hash(seed, 10 + k) % moves.length];
    [col, row] = [col + dc, row + dr];
    context.lineTo(x + (col - 1) * half, y + (row - 1) * half * 1.3);
  }
  context.stroke();
};

const hexagon = (context: CanvasRenderingContext2D, radius: number, rotation: number): void => {
  const [cx, cy] = [120 * U, 125 * U];
  context.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 6 + (i * Math.PI) / 3 + rotation;
    const [x, y] = [cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)];
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
};

/** La plaque et sa profondeur : tout ce qui ne bouge pas. */
const paintSlab = (context: CanvasRenderingContext2D, front: boolean): void => {
  const stone = context.createRadialGradient(120 * U, 125 * U, 0, 120 * U, 125 * U, 190 * U);
  stone.addColorStop(0, '#1c1a2a');
  stone.addColorStop(1, '#07060b');
  context.fillStyle = stone;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  if (!front) return;
  context.strokeStyle = GOLD;
  for (let i = 0; i < 12; i++) {
    context.globalAlpha = 0.15 + i * 0.06;
    context.lineWidth = (1.3 - i * 0.08) * U;
    hexagon(context, 78 * 0.78 ** i * U, (i * 4 * Math.PI) / 180);
    context.stroke();
  }
  context.globalAlpha = 1;
  const core = context.createRadialGradient(120 * U, 125 * U, 0, 120 * U, 125 * U, 30 * U);
  core.addColorStop(0, '#fff3c8');
  core.addColorStop(0.4, 'rgba(224, 169, 74, 0.6)');
  core.addColorStop(1, 'rgba(224, 169, 74, 0)');
  context.fillStyle = core;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  // Le titre : capitales gravées, dorées.
  context.font = `700 ${19 * U}px Cinzel, Georgia, serif`;
  context.letterSpacing = `${0.32 * 19 * U}px`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const gold = context.createLinearGradient(0, 262 * U, 0, 284 * U);
  gold.addColorStop(0, '#fff6d8');
  gold.addColorStop(0.55, '#d9a94e');
  gold.addColorStop(1, '#8a5f22');
  context.shadowColor = 'rgba(240, 200, 110, 0.5)';
  context.shadowBlur = 6 * U;
  context.fillStyle = gold;
  context.fillText('DÉBOGAGE', 120 * U + 0.16 * 19 * U, 273 * U);
  context.shadowBlur = 0;
  context.letterSpacing = '0px';
};

/** Reflet de la pierre polie, en travers. */
const paintSheen = (context: CanvasRenderingContext2D): void => {
  const sheen = context.createLinearGradient(0, 0, WIDTH, HEIGHT * 0.6);
  sheen.addColorStop(0.3, 'rgba(255, 255, 255, 0)');
  sheen.addColorStop(0.45, 'rgba(255, 255, 255, 0.07)');
  sheen.addColorStop(0.55, 'rgba(255, 255, 255, 0)');
  context.fillStyle = sheen;
  context.fillRect(0, 0, WIDTH, HEIGHT);
};

/**
 * Le dos : toute la texture s'étire sur sa largeur (le dos bombé, d'un plat à l'autre), à peine un
 * sixième de sa hauteur. Le titre est donc écrit à part, dans ces proportions, puis tourné pour se lire
 * de haut en bas (le haut des lettres vers la couverture) et élargi à toute la texture.
 */
const SPINE_ACROSS = 150;

const paintSpine = (context: CanvasRenderingContext2D): void => {
  paintSlab(context, false);
  const line = document.createElement('canvas');
  line.width = HEIGHT;
  line.height = SPINE_ACROSS;
  const ink = line.getContext('2d')!;
  const size = 64;
  ink.font = `700 ${size}px Cinzel, Georgia, serif`;
  ink.letterSpacing = `${size * 0.3}px`;
  ink.textAlign = 'center';
  ink.textBaseline = 'middle';
  const gold = ink.createLinearGradient(0, SPINE_ACROSS / 2 - size / 2, 0, SPINE_ACROSS / 2 + size / 2);
  gold.addColorStop(0, '#fff6d8');
  gold.addColorStop(0.55, '#d9a94e');
  gold.addColorStop(1, '#8a5f22');
  ink.shadowColor = 'rgba(240, 200, 110, 0.5)';
  ink.shadowBlur = 8;
  ink.fillStyle = gold;
  ink.fillText('DÉBOGAGE', HEIGHT / 2 + size * 0.15, SPINE_ACROSS / 2 + 4);
  ink.shadowBlur = 0;
  // Deux filets dorés en travers du dos, en tête et en queue, un losange au milieu de chacun.
  ink.strokeStyle = GOLD;
  ink.lineWidth = 3;
  for (const x of [90, HEIGHT - 90]) {
    ink.beginPath();
    ink.moveTo(x, 22);
    ink.lineTo(x, SPINE_ACROSS - 22);
    ink.stroke();
    ink.save();
    ink.translate(x + (x < HEIGHT / 2 ? 34 : -34), SPINE_ACROSS / 2);
    ink.rotate(Math.PI / 4);
    ink.strokeRect(-9, -9, 18, 18);
    ink.restore();
  }
  context.save();
  context.translate(WIDTH, 0);
  context.rotate(Math.PI / 2);
  context.drawImage(line, 0, 0, HEIGHT, WIDTH);
  context.restore();
};

/**
 * Le plat arrière : l'envers de la couverture. Le même cadre de symboles, immobile ; au centre, au lieu
 * de la profondeur, le sceau de Babel fermé (celui du titre du jeu), en or pâle ; en bas, la devise.
 */
const paintBack = (context: CanvasRenderingContext2D): void => {
  paintSlab(context, false);
  context.lineWidth = 1.2 * U;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.strokeStyle = ENGRAVED;
  RING.forEach(([x, y], i) => drawGlyph(context, hash(i, 104), x * U, y * U));
  const gold = context.createLinearGradient(0, 80 * U, 0, 170 * U);
  gold.addColorStop(0, '#f7e2a6');
  gold.addColorStop(0.5, '#d9a94e');
  gold.addColorStop(1, '#a8762c');
  context.strokeStyle = gold;
  context.globalAlpha = 0.55;
  context.lineWidth = 3.4 * U;
  hexagon(context, 44 * U, 0);
  context.stroke();
  context.lineWidth = 2.4 * U;
  hexagon(context, 28 * U, 0);
  context.stroke();
  context.fillStyle = '#e8c776';
  context.beginPath();
  context.arc(120 * U, 125 * U, 3.2 * U, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 0.7;
  context.font = `600 ${7.5 * U}px Cinzel, Georgia, serif`;
  context.letterSpacing = `${0.2 * 7.5 * U}px`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = '#d9b56a';
  context.fillText('TOUT CE QUI EST', 120 * U, 214 * U);
  context.fillText('TOUT CE QUI PEUT ÊTRE', 120 * U, 229 * U);
  context.globalAlpha = 1;
  context.letterSpacing = '0px';
  paintSheen(context);
};

export interface DebugCover {
  front: THREE.CanvasTexture;
  back: THREE.CanvasTexture;
  plain: THREE.CanvasTexture;
  /** Le dos, titré. */
  spine: THREE.CanvasTexture;
  /** Fait vivre le cadre (à chaque image) : true si la couverture a changé. */
  tick: (now: number) => boolean;
}

export const debugCover = async (): Promise<DebugCover> => {
  await document.fonts.load(`700 40px Cinzel`);
  const make = (): [HTMLCanvasElement, CanvasRenderingContext2D] => {
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    return [canvas, canvas.getContext('2d')!];
  };
  // La plaque se dessine une fois ; le cadre, par-dessus, à chaque lettre qui change.
  const [slab, slabContext] = make();
  paintSlab(slabContext, true);
  const [front, context] = make();
  /** Lettres allumées dans le cadre : place → lettre. */
  const lit = new Map<number, string>();
  /** Graine de chaque symbole ; elle change quand la lettre s'éteint (un autre symbole revient). */
  const seeds = RING.map((_, i) => hash(i, 410));

  const paintFront = (): void => {
    context.drawImage(slab, 0, 0);
    context.lineWidth = 1.2 * U;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = ENGRAVED;
    RING.forEach(([x, y], i) => {
      if (!lit.has(i)) drawGlyph(context, seeds[i], x * U, y * U);
    });
    context.font = `600 ${12 * U}px Cinzel, Georgia, serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = LIT;
    context.shadowColor = '#e8b050';
    context.shadowBlur = 4 * U;
    for (const [i, letter] of lit) context.fillText(letter, RING[i][0] * U, RING[i][1] * U);
    context.shadowBlur = 0;
    paintSheen(context);
  };
  paintFront();

  const [back, backContext] = make();
  paintBack(backContext);
  const [plain, plainContext] = make();
  paintSlab(plainContext, false);
  const [spine, spineContext] = make();
  paintSpine(spineContext);

  const frontTexture = canvasTexture(front);
  // Changements prévus : à tel instant, telle place s'allume (lettre) ou s'éteint (null).
  const events: { at: number; place: number; letter: string | null }[] = [];
  let word = 0;
  let nextWord = 0;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    front: frontTexture,
    back: canvasTexture(back),
    plain: canvasTexture(plain),
    spine: canvasTexture(spine),
    tick: (now) => {
      if (still) return false;
      if (now >= nextWord) {
        nextWord = now + WORD_EVERY;
        const text = [...WORDS[word++ % WORDS.length]];
        // Un mot ne passe pas un coin du cadre : il tient sur un seul côté.
        const side = Math.floor(Math.random() * 4);
        const start = side * 13 + Math.floor(Math.random() * (13 - text.length));
        // Le tour du cadre remonte le bas et la gauche : là, le mot est posé à rebours pour se lire de
        // gauche à droite et de haut en bas.
        const reversed = side >= 2;
        text.forEach((letter, i) => {
          const place = reversed ? start + text.length - 1 - i : start + i;
          events.push({ at: now + i * LETTER_STEP, place, letter });
          events.push({ at: now + i * LETTER_STEP + LETTER_HOLD, place, letter: null });
        });
      }
      let changed = false;
      for (let i = events.length - 1; i >= 0; i--) {
        const event = events[i];
        if (event.at > now) continue;
        events.splice(i, 1);
        if (event.letter === null) {
          lit.delete(event.place);
          seeds[event.place] = hash(event.place, Math.floor(now));
        } else lit.set(event.place, event.letter);
        changed = true;
      }
      if (!changed) return false;
      paintFront();
      frontTexture.needsUpdate = true;
      return true;
    },
  };
};
