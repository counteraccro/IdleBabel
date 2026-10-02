import { afterEach, describe, expect, it, vi } from 'vitest';
import { classicArt, type ClassicBook } from '../src/ui/rareBooks/classic/classicArt';
import type { CoverDesign } from '../src/systems/coverDesign';
import type { GameState } from '../src/core/state';
import type { RareBookLook } from '../src/ui/rareBooks/rareBookArt';

const book = (): ClassicBook => ({
  id: 'test',
  style: { body: 'serif', size: 17, line: 26, ink: '#000', accent: '#000', heading: 'serif', chaptersOnRight: false },
  paper: ['#fff', '#eee'] as unknown as ClassicBook['paper'],
  fonts: () => Promise.resolve(),
  cover: () => ({}) as RareBookLook,
  titlePage: () => {},
  contentsHeading: () => 'Table',
});

describe('classiques : le texte', () => {
  afterEach(() => vi.unstubAllGlobals());

  it("la couverture ne le charge pas (la vitrine n'en charge aucun)", async () => {
    const fetch = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetch);
    await classicArt(book()).look({} as GameState, {} as CoverDesign);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('seul le lire le charge, une fois', () => {
    const fetch = vi.fn(() => new Promise<Response>(() => {}));
    vi.stubGlobal('fetch', fetch);
    const art = classicArt(book());
    void art.prepare?.();
    void art.prepare?.();
    return Promise.resolve().then(() => expect(fetch).toHaveBeenCalledTimes(1));
  });
});
