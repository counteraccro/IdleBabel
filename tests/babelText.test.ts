import { describe, expect, it } from 'vitest';
import { createPage, randomBabelText } from '../src/systems/babelText';

describe('texte de Babel', () => {
  it("n'utilise que les 25 symboles de la Bibliothèque", () => {
    const text = randomBabelText(2_000);
    expect(text).toMatch(/^[abcdefghijlmnopqrstuvxz ,.]+$/);
  });

  it('ne contient pas de doubles espaces', () => {
    expect(randomBabelText(2_000)).not.toMatch(/ {2}/);
  });
});

describe('page avec fragment', () => {
  it('insère la phrase sensée au milieu du charabia', () => {
    const page = createPage(400, 'une porte en fer');
    expect(page.fragment).toBe('une porte en fer');
    expect(page.before.length).toBeGreaterThan(0);
    expect(page.after.length).toBeGreaterThan(0);
  });

  it('sans fragment, la page est entièrement du charabia', () => {
    const page = createPage(400);
    expect(page.fragment).toBeUndefined();
    expect(page.before).toMatch(/^[abcdefghijlmnopqrstuvxz ,.]+$/);
  });
});
