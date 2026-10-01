import { describe, expect, it } from 'vitest';
import { layoutBookcase, type ShelfCell } from '../src/ui/library/shelfLayout';

const books = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `book${index}`, thickness: 0.12 }));
const CELLS: ShelfCell[] = [
  { width: 1.12, slots: ['lie', 'lie'] },
  { width: 1.12, slots: ['stand', 'stand', 'lean'] },
  { width: 0.7, slots: [] },
  { width: 1.12, slots: ['lie', 'stand', 'stand'] },
];
const ORDER = [1, 0, 3, 2];

describe('vitrine de la bibliothèque', () => {
  it('range les livres trouvés à tour de rôle dans les cases, sans dépasser les places', () => {
    expect(layoutBookcase(books(0), CELLS, ORDER)).toEqual([]);
    expect(layoutBookcase(books(3), CELLS, ORDER).map((place) => place.cell)).toEqual([1, 0, 3]);
    const all = layoutBookcase(books(20), CELLS, ORDER);
    expect(all).toHaveLength(8);
    expect(all.some((place) => place.cell === 2)).toBe(false);
  });

  it('un livre arrivé ne bouge plus quand d’autres arrivent', () => {
    // Six livres : la case 3 a déjà sa pile et un livre debout dessus ; le huitième s’y ajoute.
    const before = layoutBookcase(books(6), CELLS, ORDER);
    const after = layoutBookcase(books(8), CELLS, ORDER);
    for (const place of before) expect(after.find((other) => other.id === place.id)).toEqual(place);
  });

  it('rien ne tient par magie : pile sur le fond, debout sur la pile, le penché appuyé sur son voisin', () => {
    const all = layoutBookcase(books(8), CELLS, ORDER);
    const pile = all.filter((place) => place.cell === 0);
    expect(pile.map((place) => place.y)).toEqual([0, 0.12]);
    const onStack = all.filter((place) => place.cell === 3 && place.pose === 'stand');
    for (const place of onStack) expect(place.y).toBeCloseTo(0.12);
    const [first, second, leaning] = all.filter((place) => place.cell === 1);
    expect(first.x + first.width).toBeLessThanOrEqual(1.12 / 2);
    expect(second.x + second.width).toBeLessThan(first.x);
    // Son haut avance de sin(pente) : il touche juste le livre à sa droite.
    expect(leaning.x + leaning.width + Math.sin(leaning.lean)).toBeCloseTo(second.x);
  });
});
