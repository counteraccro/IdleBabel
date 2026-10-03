import { afterEach, describe, expect, it } from 'vitest';
import { gameRandom, hashText, parseSeed, readGameSeedWith, seedLabel, seeded } from '../src/core/random';
import { createInitialState } from '../src/core/state';
import { coverDesign } from '../src/systems/coverDesign';
import { rareBookAt } from '../src/systems/rareBooks';
import { STRANGE_BOOK_INDEX } from '../src/systems/strangeBook';

const draws = (random: () => number): number[] => Array.from({ length: 5 }, random);
/** Les livres rares des 20 000 premiers livres. */
const rarePlaces = (): string[] => {
  const state = createInitialState('fr');
  return Array.from({ length: 20_000 }, (_, index) => rareBookAt(state, index) ?? '');
};

describe('graine de la partie', () => {
  afterEach(() => readGameSeedWith(() => 0));

  it('graine 0 : les tirages d’avant les graines', () => {
    readGameSeedWith(() => 0);
    expect(draws(gameRandom('rare:812'))).toEqual(draws(seeded(hashText('rare:812'))));
    expect(draws(gameRandom('cover:812', 812))).toEqual(draws(seeded(812)));
  });

  it('même graine, mêmes tirages ; autre graine, autres tirages', () => {
    readGameSeedWith(() => 0x3f2a9c1b);
    const first = coverDesign(812);
    const places = rarePlaces();
    expect(coverDesign(812)).toEqual(first);
    expect(rarePlaces()).toEqual(places);
    readGameSeedWith(() => 0x1234);
    expect(coverDesign(812)).not.toEqual(first);
    expect(rarePlaces()).not.toEqual(places);
  });

  it('le livre étrange garde sa couverture', () => {
    const strange = coverDesign(STRANGE_BOOK_INDEX);
    readGameSeedWith(() => 0x3f2a9c1b);
    expect(coverDesign(STRANGE_BOOK_INDEX)).toEqual(strange);
  });

  it('une nouvelle partie a une graine ; elle s’écrit et se relit', () => {
    const { seed } = createInitialState('fr');
    expect(seed).toBeGreaterThan(0);
    expect(parseSeed(seedLabel(seed))).toBe(seed);
    expect(seedLabel(0x3f2a9c1b)).toBe('3F2A9C1B');
    expect(parseSeed('pas une graine')).toBeNull();
  });
});
