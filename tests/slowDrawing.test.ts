import { describe, expect, it } from 'vitest';
import { slowPieces, type Drawing } from '../src/ui/rareBooks/slowDrawing';

describe('pièces dessinées par morceaux', () => {
  it("ne gardent que celles de la langue du moment : changer de langue oublie l'autre", () => {
    let locale = 'fr';
    let drawn = 0;
    const pieces = slowPieces(
      {
        front: function* (): Drawing {
          yield;
          drawn++;
          return {} as HTMLCanvasElement;
        },
      },
      () => locale,
    );
    const french = pieces.now('front');
    expect(pieces.now('front')).toBe(french);
    expect(drawn).toBe(1);
    locale = 'en';
    pieces.now('front');
    expect(drawn).toBe(2);
    locale = 'fr';
    expect(pieces.now('front')).not.toBe(french);
    expect(drawn).toBe(3);
  });
});
