import { describe, expect, it, vi } from 'vitest';
import { animationNow, onResume, pauseAnimations, resumeAnimations } from '../src/ui/animationClock';

describe('horloge des animations', () => {
  it('s’arrête pendant une modale et repart là où elle en était', () => {
    vi.stubGlobal('document', { documentElement: { classList: { add: () => {}, remove: () => {} } } });
    const now = vi.spyOn(performance, 'now');
    const resumed: number[] = [];
    onResume((seconds) => resumed.push(seconds));
    now.mockReturnValue(1000);
    pauseAnimations();
    now.mockReturnValue(4000);
    expect(animationNow()).toBe(1000);
    resumeAnimations();
    expect(resumed).toEqual([3]);
    now.mockReturnValue(4500);
    expect(animationNow()).toBe(1500);
    now.mockRestore();
    vi.unstubAllGlobals();
  });
});
