import { describe, expect, it } from 'vitest';
import { layoutBookcase } from '../src/ui/library/shelfLayout';
import { OTHER_COLUMNS, OTHER_FILL_ORDER } from '../src/ui/library/otherBookcase';

const cells = OTHER_COLUMNS.flatMap((column) => column.cells.map(([, slots]) => ({ width: column.width, slots })));
const books = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `book${index}`, thickness: 0.12 }));

describe('l’autre bibliothèque', () => {
  it('se garnit dans toutes ses cases qui ont des places, chacune une fois', () => {
    const filled = cells.flatMap((cell, index) => (cell.slots.length > 0 ? [index] : []));
    expect([...OTHER_FILL_ORDER].sort((a, b) => a - b)).toEqual(filled);
  });

  it('a 35 places, et un livre arrivé ne bouge plus', () => {
    expect(layoutBookcase(books(50), cells, OTHER_FILL_ORDER)).toHaveLength(35);
    const before = layoutBookcase(books(5), cells, OTHER_FILL_ORDER);
    const after = layoutBookcase(books(20), cells, OTHER_FILL_ORDER);
    for (const place of before) expect(after.find((other) => other.id === place.id)).toEqual(place);
  });
});
