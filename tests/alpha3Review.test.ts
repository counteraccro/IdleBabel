import { describe, expect, it } from 'vitest';
import { AGES, QUANTUM_AGE, TOOLS, agePart } from '../src/data/tools';
import { ETHERIUM_GROUPS, NEEDS_AGE } from '../src/data/etheriumStars';

describe('revue de l’Alpha 3 (24/10)', () => {
  it('chaque Âge, et celui de chaque méthode, a sa sous-partie', () => {
    for (const age of AGES) expect(agePart(age)).toMatch(/Age$/);
    for (const tool of TOOLS) expect(agePart(tool.age), tool.id).toMatch(/Age$/);
    expect(() => agePart('ages.dim')).toThrow();
  });

  it('chaque groupe de l’Etherium s’écrit sur une page du sommaire, sans page vide', () => {
    const pages = new Set(ETHERIUM_GROUPS.map((group) => group.contents));
    expect([...pages].sort()).toEqual([...Array(pages.size).keys()]);
  });

  it('seule la dent du Rouage d’un Âge d’après le Numérique attend son Âge', () => {
    const gear = [...NEEDS_AGE].filter(([id]) => id.startsWith('gear.'));
    expect(gear).toEqual([['gear.a4', QUANTUM_AGE]]);
  });
});
