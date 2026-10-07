import { describe, expect, it } from 'vitest';
import { EFFECT, ETHERIUM_PAGES, KEEPS, NEEDS_AGE, S, STARS, starById } from '../src/data/etheriumStars';
import { getLocale, setLocale, t } from '../src/i18n';

describe('Les étoiles de l’Etherium', () => {
  it('chaque étoile a une seule étoile d’avant, sur sa page et plus haut dans la liste', () => {
    STARS.forEach((star, index) => {
      if (!star.after) return;
      const before = STARS.findIndex((other) => other.id === star.after);
      expect(before, star.id).toBeGreaterThanOrEqual(0);
      expect(before, star.id).toBeLessThan(index);
      expect(STARS[before].page).toBe(star.page);
    });
    expect(new Set(STARS.map((star) => star.id)).size).toBe(STARS.length);
  });

  it('une seule étoile de départ par page', () => {
    for (const page of ETHERIUM_PAGES) expect(STARS.filter((star) => star.page === page && !star.after)).toHaveLength(1);
  });

  it('les effets et les étoiles nommées désignent des étoiles qui existent', () => {
    const ids = [
      ...Object.values(EFFECT).flatMap((effect) => Object.keys(effect)),
      ...Object.values(S),
      ...Object.values(KEEPS),
      ...NEEDS_AGE,
    ];
    for (const id of ids) expect(starById(id), id).toBeDefined();
  });

  it('chaque page et chaque étoile a ses textes, en français et en anglais', () => {
    const before = getLocale();
    for (const locale of ['fr', 'en'] as const) {
      setLocale(locale);
      for (const page of ETHERIUM_PAGES) expect(t(`etherium.pages.${page}.name`)).not.toBe(`etherium.pages.${page}.name`);
      for (const star of STARS) {
        const [page, id] = star.id.split('.');
        if (page === 'memory' && Object.values(KEEPS).slice(0, 5).includes(star.id)) continue;
        expect(t(`etherium.stars.${page}.${id}.name`), star.id).not.toBe(`etherium.stars.${page}.${id}.name`);
      }
    }
    setLocale(before);
  });
});
