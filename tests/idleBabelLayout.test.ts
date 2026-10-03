import { describe, expect, it } from 'vitest';
import { setLocale } from '../src/i18n';
import { PAGES_PER_BOOK } from '../src/systems/books';
import { CONTENTS_PAGE, FOREWORD_PAGE, layoutIdleBabel, words, type PlateArt } from '../src/ui/rareBooks/idleBabel/idleBabelLayout';
import { BOOK_DRAFTS, DRAFT_GROUPS, PLATE_BOOKS, STORY } from '../src/ui/rareBooks/idleBabel/idleBabelStory';

/** Un contexte qui mesure le texte au nombre de lettres (la mise en page n'a besoin que de mesurer). */
const measuring = () => ({
  font: '',
  letterSpacing: '',
  save() {},
  restore() {},
  measureText: (text: string) => ({ width: text.length * 9 }),
});

/** Les planches posées, comptées par ce qu'elles montrent. */
const plates = () => {
  const drawn: string[] = [];
  const art: PlateArt = {
    plate: (_, book) => drawn.push(`plate:${book}`),
    drafts: (_, files) => drawn.push(`drafts:${files[0]}`),
    name: (book) => book,
  };
  return { art, drawn };
};

describe('livre « Idle Babel »', () => {
  for (const locale of ['fr', 'en'] as const)
    it(`${locale} : chapitres sur une page de droite, sommaire juste, planches toutes posées`, () => {
      setLocale(locale);
      const { art, drawn } = plates();
      const { pages, contents } = layoutIdleBabel(measuring() as unknown as CanvasRenderingContext2D, art);
      for (const page of [1, FOREWORD_PAGE, CONTENTS_PAGE, PAGES_PER_BOOK]) expect(pages.has(page)).toBe(true);

      const chapters = contents.filter((entry) => !entry.part && entry.page !== FOREWORD_PAGE);
      expect(chapters).toHaveLength(STORY.length);
      for (const { page } of chapters) expect(page % 2).toBe(1);
      for (const { page } of contents) expect(pages.has(page)).toBe(true);
      expect(contents.map((entry) => entry.page)).toEqual([...contents.map((entry) => entry.page)].sort((a, b) => a - b));

      // Après le sommaire, pas de trou : seule la page de gauche avant un chapitre peut rester blanche.
      const written = [...pages.keys()].filter((page) => page > CONTENTS_PAGE && page < PAGES_PER_BOOK).sort((a, b) => a - b);
      for (let page = written[0]; page <= written[written.length - 1]; page++)
        if (!pages.has(page)) expect(chapters.some((chapter) => chapter.page === page + 1)).toBe(true);

      // Toutes les pages dessinées sur un contexte qui mesure et ignore le reste.
      const base = measuring() as Record<string, unknown>;
      const drawing = new Proxy(base, { get: (target, key: string) => (key in target ? target[key] : () => undefined), set: () => true });
      for (let page = 1; page <= PAGES_PER_BOOK; page++) pages.get(page)?.(drawing as unknown as CanvasRenderingContext2D);
      const groups = STORY.flatMap((chapter) => chapter.sections ?? []).flatMap((section) => section.drafts ?? []);
      expect(drawn.filter((entry) => entry.startsWith('plate:'))).toEqual(PLATE_BOOKS.map((book) => `plate:${book}`));
      expect(drawn.filter((entry) => entry.startsWith('drafts:'))).toHaveLength(
        PLATE_BOOKS.filter((book) => BOOK_DRAFTS[book]).length + groups.length,
      );
      expect(groups.every((group) => DRAFT_GROUPS[group].length > 0)).toBe(true);
    });

  it('la ponctuation haute et les guillemets ne quittent pas leur mot', () => {
    expect(words('Un idle : la fin ? « Nulle part »')).toEqual(['Un', 'idle :', 'la', 'fin ?', '« Nulle', 'part »']);
  });
});
