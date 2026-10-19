import { describe, expect, it } from 'vitest';
import { waitText } from '../src/ui/letter/duration';

describe('le temps qu’il faut encore (la Patience)', () => {
  it('s’écrit en ses deux plus grandes unités', () => {
    expect(waitText(12)).toBe('12 s');
    expect(waitText(1000)).toBe('16 min 40 s');
    expect(waitText(3600 * 3 + 60 * 12 + 5)).toBe('3 h 12 min');
    expect(waitText(86_400 + 3 * 3600 + 59)).toBe('1 j 3 h');
    expect(waitText(2 * 86_400 + 30)).toBe('2 j');
    expect(waitText(0.2)).toBe('1 s');
  });
});
