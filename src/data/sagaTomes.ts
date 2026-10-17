import type { SceneId } from '../scene/scenes';
import { TRUE_STORY_BOOK } from './trueStory';

/**
 * Les onze tomes de « L'histoire de Babel » (l'auteur, 17/10, .ai/maquette-couverture-vraie-fin.html) : une seule histoire
 * en bribes, une collection qu'on croit être la vraie fin. De face, des livres anciens ; derrière, des livres modernes : une
 * image de la Bibliothèque à fond perdu, le résumé, un code-barres. Titres et résumés : ui.endings (FR + EN).
 *
 * L'image de chaque tome : une des salles du jeu (public/scenes), cadrée autrement. À changer ici quand les autres Âges
 * auront leurs salles (l'auteur, 17/10).
 */
export interface TomeShot {
  scene: SceneId;
  /** Le centre du cadrage, de 0 à 1 dans l'image. */
  x: number;
  y: number;
  /** La part de la largeur de l'image gardée (1 : toute). */
  zoom: number;
}

export const TOME_SHOTS: readonly TomeShot[] = [
  { scene: 'verriere', x: 0.5, y: 0.55, zoom: 0.62 },
  { scene: 'nuit', x: 0.5, y: 0.5, zoom: 0.7 },
  { scene: 'verriere', x: 0.48, y: 0.55, zoom: 0.32 },
  { scene: 'nuit', x: 0.5, y: 0.45, zoom: 0.9 },
  { scene: 'desert', x: 0.5, y: 0.5, zoom: 0.75 },
  { scene: 'verriere', x: 0.5, y: 0.85, zoom: 0.5 },
  { scene: 'nuit', x: 0.5, y: 0.52, zoom: 0.35 },
  { scene: 'verriere', x: 0.48, y: 0.6, zoom: 0.22 },
  { scene: 'nuit', x: 0.2, y: 0.45, zoom: 0.45 },
  { scene: 'nuit', x: 0.5, y: 0.15, zoom: 0.4 },
  { scene: 'verriere', x: 0.5, y: 0.5, zoom: 0.9 },
];

/**
 * Les onze dos (places fixes, de gauche à droite) : leur épaisseur, et leur bord gauche (depuis le milieu du meuble), comme
 * dans la maquette. Les tomes sont tous de la même hauteur (1, celle d'un livre debout).
 */
const SPINES = [0.15, 0.13, 0.16, 0.12, 0.14, 0.15, 0.12, 0.14, 0.13, 0.16, 0.13];
const GAP = 0.012;
export const ROW = SPINES.reduce((sum, t) => sum + t, 0) + GAP * (SPINES.length - 1);
export const TOMES: { x: number; t: number }[] = SPINES.reduce<{ x: number; t: number }[]>(
  (tomes, t) => [...tomes, { x: tomes.length ? tomes.at(-1)!.x + tomes.at(-1)!.t + GAP : -ROW / 2, t }],
  [],
);
/** Le faux ISBN du tome `index` (0 : le tome 1), imprimé sous son code-barres : 978-2-410-… */
export const tomeIsbn = (index: number): string => {
  const n = String(index + 1).padStart(2, '0');
  return `978-2-410-00${n}4-${(index + 1) % 10}`;
};

/**
 * Le nom de chaque tome dans la bibliothèque : le tome 1 est « Qui j'étais » (trueStory) ; les dix autres, « tome2 » à
 * « tome11 », existent déjà, vides et cachés, en attendant leurs pages et leur façon de paraître (l'auteur, 17/10).
 */
export const SAGA_TOMES: readonly string[] = TOME_SHOTS.map((_, index) => (index === 0 ? TRUE_STORY_BOOK : `tome${index + 1}`));

/** La place du tome `id` dans la saga (0 : le tome 1) ; -1 : pas un tome. */
export const tomeIndex = (id: string): number => SAGA_TOMES.indexOf(id);
