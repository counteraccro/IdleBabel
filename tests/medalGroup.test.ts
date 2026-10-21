import { describe, expect, it } from 'vitest';
import { soonest, type Medal } from '../src/ui/letter/medalGroup';

const medal = (key: string, left: number, endless = false): Medal => ({ key, icon: '', text: key, left, total: 600_000, endless });

describe('médaillons réunis', () => {
  it('montrent l’effet qui finit le premier', () => {
    expect(soonest([medal('trance', 300_000), medal('fourTen', 30_000), medal('eye', 90_000)])?.key).toBe('fourTen');
  });
  it('un effet sans fin (la Mimic) passe après les autres', () => {
    expect(soonest([medal('mimic', 1, true), medal('half', 120_000)])?.key).toBe('half');
    expect(soonest([medal('mimic', 1, true)])?.key).toBe('mimic');
  });
  it('rien en cours : aucun', () => {
    expect(soonest([])).toBeUndefined();
  });
});
