import { afterEach, describe, expect, it, vi } from 'vitest';
import { classicArt, type ClassicBook } from '../src/ui/rareBooks/classic/classicArt';
import type { CoverDesign } from '../src/systems/coverDesign';
import type { GameState } from '../src/core/state';
import type { RareBookLook } from '../src/ui/rareBooks/rareBookArt';

const book = (id = 'test'): ClassicBook => ({
  id,
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

  it('seuls les trois derniers ouverts restent mis en page : un plus ancien se recharge à sa réouverture', async () => {
    const text = { chapters: [{ label: 'CHAPTER 1', title: 'Titre', paras: ['un deux trois'] }] };
    const fetch = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(text) } as Response));
    vi.stubGlobal('fetch', fetch);
    const context = { font: '', measureText: (line: string) => ({ width: line.length * 10, fontBoundingBoxAscent: 15 }) };
    vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
    const [first, second, third, fourth] = ['a', 'b', 'c', 'd'].map((id) => classicArt(book(`kept-${id}`)));
    for (const art of [first, second, third, fourth]) await art.prepare?.();
    expect(fetch).toHaveBeenCalledTimes(4);
    await fourth.prepare?.();
    await second.prepare?.();
    expect(fetch).toHaveBeenCalledTimes(4);
    await first.prepare?.();
    expect(fetch).toHaveBeenCalledTimes(5);
  });
});
