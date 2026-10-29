import { describe, expect, it } from 'vitest';
import { LOCALES } from '../src/i18n/locales';
import { RELICS } from '../src/data/relics';
import { STORY } from '../src/ui/rareBooks/idleBabel/idleBabelStory';

/** Regarder une relique (ui/relics/relicLook.ts, piste B validée le 25/10). */
describe('Regarder les reliques', () => {
  it('chaque relique dit d’où elle vient, et son récit se lit dans la vue, en français comme en anglais', () => {
    for (const messages of Object.values(LOCALES)) {
      for (const relic of RELICS) {
        expect(messages.ui.relics.from[relic.id]).toBeTruthy();
        expect(messages.lore[relic.lore].text.length).toBeGreaterThan(0);
      }
    }
  });

  it('la légende de la vitrine invite à la regarder, plus à la poser', () => {
    expect(LOCALES.fr.ui.relics.look).toBe('la regarder');
    expect('choose' in LOCALES.fr.ui.relics).toBe(false);
  });

  it('le livre « Idle Babel » le raconte, avant sa dernière partie', () => {
    const sections = STORY.flatMap((chapter) => chapter.sections ?? []).map((section) => section.key);
    expect(sections.indexOf('relicLook')).toBeLessThan(sections.indexOf('thisBook'));
    expect(sections.indexOf('relicLook')).toBeGreaterThan(-1);
  });
});
