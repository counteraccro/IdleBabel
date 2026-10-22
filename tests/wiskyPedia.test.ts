import { describe, expect, it } from 'vitest';
import fr from '../src/i18n/fr/rareBooks.json';
import en from '../src/i18n/en/rareBooks.json';
import { SEALS } from '../src/data/seals';
import {
  CHAPTER_PAGES,
  FIRST_FICHE_PAGE,
  FIXED,
  LAST_FICHE_PAGE,
  drunkenness,
  ficheAt,
  sipOf,
  stageOf,
} from '../src/ui/rareBooks/wiskyPedia/wiskyPlan';

describe('WiskyPedia', () => {
  it('a autant de fiches écrites à la main en français, en anglais et dans le plan, chacune à sa place', () => {
    expect(fr.wiskyPedia.fixed).toHaveLength(FIXED.length);
    expect(en.wiskyPedia.fixed).toHaveLength(FIXED.length);
    const places = FIXED.map(({ page, slot }) => `${page}:${slot}`);
    expect(new Set(places).size).toBe(places.length);
    expect(fr.wiskyPedia.names).toHaveLength(CHAPTER_PAGES.length);
  });

  it('remplit ses 792 fiches dans les deux langues, de la première gorgée à la dernière', () => {
    for (const texts of [fr.wiskyPedia, en.wiskyPedia]) {
      for (let page = FIRST_FICHE_PAGE; page <= LAST_FICHE_PAGE; page++) {
        for (const slot of [0, 1]) {
          const fiche = ficheAt(texts, page, slot);
          expect(fiche.title.length).toBeGreaterThan(0);
          expect(fiche.text.length).toBeGreaterThan(0);
          expect(fiche.notes.every((note) => note.length > 0)).toBe(true);
          expect(fiche.text).not.toContain('{');
        }
      }
    }
    expect(sipOf(FIRST_FICHE_PAGE, 0)).toBe(1);
    expect(sipOf(LAST_FICHE_PAGE, 1)).toBe(792);
    expect(ficheAt(fr.wiskyPedia, FIRST_FICHE_PAGE, 0).time).toBe('20 h 01');
  });

  it('est sobre au début, puis de plus en plus ivre jusqu’à la fin', () => {
    expect(stageOf(drunkenness(20))).toBe(0);
    expect(stageOf(drunkenness(150))).toBe(1);
    expect(stageOf(drunkenness(300))).toBe(2);
    expect(stageOf(drunkenness(400))).toBe(3);
    for (let page = FIRST_FICHE_PAGE; page < LAST_FICHE_PAGE; page++)
      expect(drunkenness(page + 1)).toBeGreaterThanOrEqual(drunkenness(page));
  });

  it('a son sceau, comme les autres livres rares', () => {
    expect(SEALS.some((seal) => seal.id === 'rare-wiskyPedia')).toBe(true);
  });
});
