import { gameRandom } from '../core/random';

/** Tranches : nature (le papier), jaspées (mouchetées), teintes, dorées, marbrées. */
export type EdgeKind = 'plain' | 'redSprinkle' | 'blueSprinkle' | 'red' | 'yellow' | 'gilt' | 'marbled';

/** Livres modernes d'une sorte à part : l'autobiographie, la bande dessinée. */
export type ModernKind = 'none' | 'autobiography' | 'comic';

/**
 * Détails d'une reliure ordinaire (maquette .ai/maquette-livres-ordinaires.html), tirés d'un hasard à part
 * de celui de la couverture : un livre déjà vu garde son titre, son cuir, son fleuron d'avant.
 */
export interface CoverDetails {
  /** Fleuron du plat : un des huit (les quatre d'avant, puis lys, hexagone, laurier, soleil). */
  ornament: number;
  /** Fers d'angle (4 modèles), roulette autour du cadre (4 frises), cartouche du titre (0 : aucun, 2 modèles). */
  corner: number;
  roll: number;
  cartouche: number;
  /** Demi-reliure : cuir au dos et aux coins, papier marbré sur les plats, le titre sur une étiquette. */
  half: boolean;
  /** Papier marbré (gardes, plats des demi-reliures) : palette (4) et sorte (0 caillouté, 1 peigné). */
  marble: number;
  marbleKind: number;
  /** Dos : 4 ou 5 nerfs, couleur de la pièce de titre (4), un caisson de tomaison. */
  nerfs: number;
  piece: number;
  tome: boolean;
  edge: EdgeKind;
  /** Livre moderne : bandeau d'éditeur, tranche teinte de la couleur de la couverture. */
  band: boolean;
  sprayed: boolean;
  kind: ModernKind;
  /** Bande dessinée : numéro de l'album (1 à 12), couleur de la série (4). */
  album: number;
  comicColor: number;
  /** Graine des tirages du dessin (grain, or usé, marbrure, portrait…). */
  seed: number;
}

export const DETAIL_ORNAMENTS = 8;
export const CORNER_COUNT = 4;
export const ROLL_COUNT = 4;
export const CARTOUCHE_COUNT = 3;
export const MARBLE_COUNT = 4;
export const PIECE_COUNT = 4;
export const COMIC_COLORS = 4;
export const ALBUMS = 12;
export const HALF_CHANCE = 1 / 4;
/** Autobiographies et bandes dessinées : environ un livre sur trente chacune (décision de l'auteur, 04/10). */
export const KIND_CHANCE = 1 / 30;

const EDGES: readonly [number, EdgeKind][] = [
  [35, 'plain'],
  [20, 'redSprinkle'],
  [10, 'blueSprinkle'],
  [10, 'red'],
  [10, 'yellow'],
  [10, 'gilt'],
  [5, 'marbled'],
];

const weighted = <T>(random: () => number, list: readonly [number, T][]): T => {
  let roll = random() * list.reduce((sum, [weight]) => sum + weight, 0);
  for (const [weight, value] of list) if ((roll -= weight) < 0) return value;
  return list[list.length - 1][1];
};

/**
 * Les détails du livre n° `bookIndex`. `ornament` : son fleuron d'avant (0 à 3), gardé une fois sur deux.
 * `canChangeKind` : faux pour les livres qui ne peuvent pas devenir modernes (le premier livre, le livre étrange).
 */
export const coverDetails = (bookIndex: number, ornament: number, canChangeKind: boolean): CoverDetails => {
  const random = gameRandom(`cover-details:${bookIndex}`);
  const roll = random();
  const kind: ModernKind = !canChangeKind ? 'none' : roll < KIND_CHANCE ? 'autobiography' : roll < 2 * KIND_CHANCE ? 'comic' : 'none';
  return {
    kind,
    ornament: random() < 0.5 ? ornament : 4 + Math.floor(random() * (DETAIL_ORNAMENTS - 4)),
    corner: Math.floor(random() * CORNER_COUNT),
    roll: Math.floor(random() * ROLL_COUNT),
    cartouche: Math.floor(random() * CARTOUCHE_COUNT),
    half: random() < HALF_CHANCE,
    marble: Math.floor(random() * MARBLE_COUNT),
    marbleKind: Math.floor(random() * 2),
    nerfs: random() < 0.5 ? 4 : 5,
    piece: Math.floor(random() * PIECE_COUNT),
    tome: random() < 0.4,
    edge: weighted(random, EDGES),
    band: random() < 1 / 3,
    sprayed: random() < 0.3,
    album: 1 + Math.floor(random() * ALBUMS),
    comicColor: Math.floor(random() * COMIC_COLORS),
    seed: Math.floor(random() * 2 ** 31),
  };
};
