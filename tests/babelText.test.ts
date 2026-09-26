import { describe, expect, it } from 'vitest';
import { randomBabelText } from '../src/systems/babelText';

describe('texte de Babel', () => {
  it("n'utilise que les 25 symboles de la Bibliothèque", () => {
    const text = randomBabelText(2_000);
    expect(text).toMatch(/^[abcdefghijlmnopqrstuvxz ,.]+$/);
  });

  it('ne contient pas de doubles espaces', () => {
    expect(randomBabelText(2_000)).not.toMatch(/ {2}/);
  });
});
