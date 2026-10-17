import { describe, expect, it, vi } from 'vitest';
import type { ContentsEntry } from '../src/ui/whiteBook/contents';

// Les pages chargent leurs polices au chargement du module : sans navigateur, il n'y en a pas.
vi.stubGlobal('window', new EventTarget());
vi.stubGlobal('document', {});
const { contentsFit, splitContents } = await import('../src/ui/whiteBook/contents');

const part = (page: number): ContentsEntry => ({ title: () => `partie ${page}`, page });
const sub = (page: number): ContentsEntry => ({ title: () => `sous-partie ${page}`, page, sub: true });

describe('Le sommaire du livre blanc', () => {
  it('tient sur une page tant qu’il ne se tasse pas', () => {
    expect(contentsFit([part(3), sub(4), part(9)])).toBe(true);
  });

  it('passe sur deux pages, sans séparer une partie de ses sous-parties', () => {
    const entries = [
      part(3),
      sub(4),
      sub(10),
      sub(16),
      part(21),
      sub(22),
      sub(30),
      sub(36),
      part(41),
      sub(42),
      sub(50),
      part(61),
      part(81),
    ];
    expect(contentsFit(entries)).toBe(false);
    const [left, right] = splitContents(entries);
    expect([...left, ...right]).toEqual(entries);
    expect(right[0].sub).toBeUndefined();
    expect(contentsFit(left)).toBe(true);
  });
});
