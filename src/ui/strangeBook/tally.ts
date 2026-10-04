/**
 * Bâtons au crayon, comptés par cinq (quatre debout, le cinquième en travers) : ce que le chercheur
 * compte en attendant (la méthode d'avant, avant de trouver la suivante : ui/whiteBook/pages.ts).
 * Tracés à la main : chaque trait penche un peu, toujours de la même façon.
 */
export interface TallyItem {
  kind: 'tally';
  /** Centre du compte, en haut des traits (repère de la page, 640 × 800). */
  x: number;
  y: number;
  /** Traits en tout ; `done` : ceux déjà tracés (les autres, à peine visibles). */
  count: number;
  done: number;
}

export interface TallyStroke {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  done: boolean;
}

const HEIGHT = 15;
const STEP = 5;
const GAP = 10;

/** Petit écart fixe d'un trait (-1 à 1), tiré de son rang. */
const wobble = (index: number, salt: number): number => ((Math.imul(index * 31 + salt, 0x9e3779b1) >>> 0) / 0xffffffff) * 2 - 1;

const groupWidth = 3 * STEP;

export const tallyWidth = (count: number): number => {
  const groups = Math.ceil(count / 5);
  return groups * groupWidth + (groups - 1) * GAP;
};

/** Les traits du compte, dans l'ordre où on les trace. */
export const tallyStrokes = (item: TallyItem): TallyStroke[] => {
  const left = item.x - tallyWidth(item.count) / 2;
  return Array.from({ length: item.count }, (_, index): TallyStroke => {
    const group = Math.floor(index / 5);
    const rank = index % 5;
    const x0 = left + group * (groupWidth + GAP);
    const done = index < item.done;
    if (rank === 4)
      // Le cinquième barre les quatre, de bas en haut.
      return { x1: x0 - 3, y1: item.y + HEIGHT - 2 + wobble(index, 1), x2: x0 + groupWidth + 3, y2: item.y + 3 + wobble(index, 2), done };
    const x = x0 + rank * STEP;
    return {
      x1: x + wobble(index, 3),
      y1: item.y + wobble(index, 4),
      x2: x + wobble(index, 5) * 1.5,
      y2: item.y + HEIGHT + wobble(index, 6),
      done,
    };
  });
};
