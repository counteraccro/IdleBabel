import { beforeEach, describe, expect, it } from 'vitest';
import { waitText } from '../src/ui/letter/duration';
import { knowledgePace, noteKnowledge, resetKnowledgePace, trackKnowledgePace } from '../src/systems/knowledgePace';

describe('le rythme de la Connaissance (la Patience)', () => {
  beforeEach(resetKnowledgePace);

  it('ne dit rien tant que la mesure est trop courte', () => {
    noteKnowledge(10);
    trackKnowledgePace(3);
    expect(knowledgePace()).toBeUndefined();
  });

  it('compte la Connaissance trouvée par seconde', () => {
    for (let i = 0; i < 10; i++) {
      noteKnowledge(4);
      trackKnowledgePace(1);
    }
    expect(knowledgePace()).toBe(4);
  });

  it('ne garde que la dernière minute', () => {
    for (let i = 0; i < 60; i++) {
      noteKnowledge(100);
      trackKnowledgePace(1);
    }
    for (let i = 0; i < 60; i++) {
      noteKnowledge(2);
      trackKnowledgePace(1);
    }
    expect(knowledgePace()).toBe(2);
  });

  it('range les petits pas de la boucle par seconde', () => {
    for (let i = 0; i < 100; i++) {
      noteKnowledge(1);
      trackKnowledgePace(0.1);
    }
    expect(knowledgePace()).toBeCloseTo(10);
  });
});

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
