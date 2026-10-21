import { describe, expect, it } from 'vitest';
import { createNewsStar } from '../src/ui/newsStar';

describe("étoile des nouveautés de l'en-tête", () => {
  it('sursaute une seule fois, à l’arrivée, puis reste allumée', () => {
    const star = createNewsStar();
    expect(star.update(false)).toBe(false);
    expect(star.lit).toBe(false);
    expect(star.update(true)).toBe(true);
    expect(star.lit).toBe(true);
    expect(star.update(true)).toBe(false);
    expect(star.lit).toBe(true);
  });

  it('s’éteint à l’ouverture du livre, même si la nouveauté attend encore', () => {
    const star = createNewsStar();
    star.update(true);
    star.seen();
    expect(star.lit).toBe(false);
    expect(star.update(true)).toBe(false);
    expect(star.lit).toBe(false);
  });

  it('revient avec une nouveauté suivante', () => {
    const star = createNewsStar();
    star.update(true);
    star.seen();
    star.update(false);
    expect(star.update(true)).toBe(true);
    expect(star.lit).toBe(true);
  });

  it('ouvrir sans nouveauté ne cache pas la prochaine', () => {
    const star = createNewsStar();
    star.seen();
    expect(star.update(true)).toBe(true);
    expect(star.lit).toBe(true);
  });
});
