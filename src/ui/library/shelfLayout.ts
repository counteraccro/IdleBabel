import { hashText, seeded } from '../../core/random';

/** Un livre de la vitrine : son épaisseur (son dos). */
export interface ShelfBook {
  id: string;
  thickness: number;
}

/** Debout (le dos vers le lecteur), ou couché sur le plat (le dos vers le lecteur aussi). */
export type Pose = 'stand' | 'lie';
/**
 * Une place dans une case : couché (sur le fond, ou sur la pile), debout (contre la paroi de droite, ou
 * sur la pile), ou debout penché sur ses voisins (toujours le dernier arrivé de sa case).
 */
export type Slot = Pose | 'lean';

/** Une case, telle que le rangement la voit : sa largeur, et ses places dans l'ordre où elles se remplissent. */
export interface ShelfCell {
  width: number;
  slots: Slot[];
}

/** La place d'un livre dans sa case. */
export interface ShelfPlace {
  id: string;
  cell: number;
  pose: Pose;
  /** Debout : bord gauche de sa place ; couché : son milieu. Depuis le milieu du fond de la case. */
  x: number;
  /** Hauteur où il pose (sur le fond, ou sur les livres couchés dessous). */
  y: number;
  /** Largeur de sa place (debout : son dos ; couché : sa longueur). */
  width: number;
  /** Enfoncé de tant vers le fond. */
  depth: number;
  /** Un rien de biais (radians, autour de la verticale) : une pile n'est jamais droite. */
  yaw: number;
  /** Debout : penché vers la droite de tant (radians), sur son coin bas-droit, son haut sur son voisin. */
  lean: number;
}

/** Longueur d'un livre couché, hauteur d'un livre debout. */
const BOOK_LENGTH = 1;
/** Air autour du dos (dos arrondi, plats qui débordent). */
const SPINE_SLACK = 0.008;
/** Jour entre deux livres debout voisins : au moins, et en plus au hasard. */
const GAP = 0.004;
const GAP_SPREAD = 0.01;
/** Enfoncé au plus ; une pile part de travers d'autant au plus (radians) et glisse d'autant de côté. */
const DEPTH = 0.05;
const STACK_YAW = 0.04;
const STACK_SHIFT = 0.02;
/** Où commencent les livres debout sur une pile (depuis son milieu), au plus à droite d'autant en plus. */
const STACK_START = -0.3;
const STACK_START_SPREAD = 0.15;
/** Air laissé contre la paroi. */
const WALL_GAP = 0.006;
/** Écart, au pied, d'un livre penché sur ses voisins : il penche jusqu'à ce que son haut les touche. */
const LEAN_FOOT = 0.1;
const LEAN_FOOT_SPREAD = 0.06;

/**
 * Les places, dans l'ordre où les livres trouvés les prennent : les cases de `order` à tour de rôle,
 * chacune dans l'ordre de ses places. La vitrine se garnit un peu partout à la fois.
 */
const slotOrder = (cells: ShelfCell[], order: number[]): number[] => {
  const used = order.map(() => 0);
  const result: number[] = [];
  for (let round = true; round;) {
    round = false;
    order.forEach((cell, index) => {
      if (used[index] >= cells[cell].slots.length) return;
      used[index] += 1;
      result.push(cell);
      round = true;
    });
  }
  return result;
};

/**
 * Range les livres rares trouvés dans les cases de la vitrine, dans l'ordre où ils ont été trouvés : du
 * bazar organisé. Dans chaque case, les couchés en pile un peu de travers ; les debout serrés contre la
 * paroi de droite (sur le fond), ou droits au milieu de la pile ; les debout sur une pile partent de la gauche ; le dernier arrivé parfois penché, son
 * haut appuyé sur ses voisins. Rien ne tient par magie. Un livre garde sa place quand d'autres arrivent ;
 * ses irrégularités sont tirées de son nom.
 */
export const layoutBookcase = (books: ShelfBook[], cells: ShelfCell[], order: number[]): ShelfPlace[] => {
  const slots = slotOrder(cells, order);
  const byCell = new Map<number, ShelfBook[]>();
  books.slice(0, slots.length).forEach((book, index) => byCell.set(slots[index], [...(byCell.get(slots[index]) ?? []), book]));
  const places: ShelfPlace[] = [];
  for (const [cell, group] of byCell) {
    const { width: cellWidth, slots: kinds } = cells[cell];
    const random = (book: ShelfBook): (() => number) => seeded(hashText(`shelf:${book.id}`));
    let height = 0;
    // Les couchés, empilés, chacun un peu de travers.
    group.forEach((book, index) => {
      if (kinds[index] !== 'lie') return;
      const draw = random(book);
      places.push({
        id: book.id,
        cell,
        pose: 'lie',
        x: (draw() - 0.5) * 2 * STACK_SHIFT,
        y: height,
        width: BOOK_LENGTH,
        depth: draw() * DEPTH,
        yaw: (draw() - 0.5) * 2 * STACK_YAW,
        lean: 0,
      });
      height += book.thickness;
    });
    const standing = group.filter((_, index) => kinds[index] !== 'lie');
    if (standing.length === 0) continue;
    const width = (book: ShelfBook): number => book.thickness + SPINE_SLACK;
    const gap = (book: ShelfBook): number => GAP + random(book)() * GAP_SPREAD;
    if (height > 0) {
      // Sur une pile : droits, serrés, de gauche à droite à partir d'un point de la pile tiré de la case (les
      // suivants s'ajoutent à droite, sans pousser les premiers).
      let x = STACK_START + seeded(hashText(`stack:${cell}`))() * STACK_START_SPREAD;
      standing.forEach((book, index) => {
        if (index > 0) x += gap(book);
        places.push({ id: book.id, cell, pose: 'stand', x, y: height, width: width(book), depth: random(book)() * DEPTH, yaw: 0, lean: 0 });
        x += width(book);
      });
      continue;
    }
    // Sur le fond : serrés contre la paroi de droite, les premiers à droite ; le penché à leur gauche, un
    // peu écarté du pied, son haut posé sur eux.
    let right = cellWidth / 2 - WALL_GAP;
    standing.forEach((book, index) => {
      const draw = random(book);
      const leaning = kinds[group.indexOf(book)] === 'lean';
      const foot = leaning ? LEAN_FOOT + draw() * LEAN_FOOT_SPREAD : index > 0 ? gap(book) : 0;
      right -= foot;
      places.push({
        id: book.id,
        cell,
        pose: 'stand',
        x: right - width(book),
        y: 0,
        width: width(book),
        depth: draw() * DEPTH,
        yaw: 0,
        lean: leaning ? Math.asin(Math.min(foot / BOOK_LENGTH, 0.5)) : 0,
      });
      right -= width(book);
    });
  }
  return places;
};
