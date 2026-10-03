import { describe, expect, it } from 'vitest';
import { PAGES_PER_BOOK } from '../src/systems/books';
import { ARTICLES, DISCOURS_PAGE, layoutEncyclopedia } from '../src/ui/rareBooks/encyclopedia/encyclopediaLayout';
import { oldRoman, parseWords } from '../src/ui/rareBooks/encyclopedia/encyclopediaText';
import type { ClassicText } from '../src/ui/rareBooks/classic/classicText';

/** Un faux contexte de dessin : chaque lettre fait 7 de large. */
const context = {
  font: '',
  measureText: (text: string) => ({ width: text.length * 7, fontBoundingBoxAscent: 15 }),
} as unknown as CanvasRenderingContext2D;

/** Un paragraphe de `words` mots de 6 lettres. */
const para = (words: number): string => Array.from({ length: words }, () => 'abcdef').join(' ');

const book = (discours: string[], articles: [string, string[]][]): ClassicText => ({
  chapters: [
    { label: 'DISCOURS', title: 'Discours préliminaire des Editeurs', paras: discours },
    ...articles.map(([title, paras]) => ({ label: '', title, paras })),
  ],
});

describe("l'Encyclopédie : le texte", () => {
  it('garde le style de chaque morceau, même au milieu d’un mot', () => {
    expect(parseWords('LIVRE, (<i>Littér</i>.) <sc>Voyez <i>Volume</i></sc>')).toEqual([
      [{ text: 'LIVRE,', italic: false, caps: false }],
      [
        { text: '(', italic: false, caps: false },
        { text: 'Littér', italic: true, caps: false },
        { text: '.)', italic: false, caps: false },
      ],
      [{ text: 'Voyez', italic: false, caps: true }],
      [{ text: 'Volume', italic: true, caps: true }],
    ]);
  });

  it('numérote les pages du Discours à l’ancienne', () => {
    expect([1, 2, 3, 4, 6, 9, 12, 45].map(oldRoman)).toEqual(['j', 'ij', 'iij', 'iv', 'vj', 'ix', 'xij', 'xlv']);
  });
});

describe("l'Encyclopédie : la mise en page", () => {
  it('ouvre le Discours avec sa lettrine, puis les articles sur une page de droite', async () => {
    const layout = await layoutEncyclopedia(context, book([para(400), para(400)], [['BABEL', [para(50)]]]));
    const opening = layout.pages.get(DISCOURS_PAGE)!;
    expect(opening).toMatchObject({ part: 'discours', opening: true, dropCap: { letter: 'a' } });
    const articles = [...layout.pages].find(([, page]) => page.part === 'articles')!;
    expect(articles[0] % 2).toBe(1);
    expect(articles[1].opening).toBe(true);
    expect(layout.entries.map(({ title, at }) => [title, at])).toEqual([
      ['Discours préliminaire des Editeurs', 'j'],
      ['BABEL', '1'],
    ]);
  });

  it('remplit la colonne de gauche, puis celle de droite, et numérote les colonnes', async () => {
    const layout = await layoutEncyclopedia(context, book([para(10)], [['ALPHABET', Array.from({ length: 60 }, () => para(40))]]));
    const pages = [...layout.pages.values()].filter((page) => page.part === 'articles');
    expect(pages.length).toBeGreaterThan(2);
    pages.forEach((page, index) => expect(page.folio).toBe(2 * index + 1));
    const [left, right] = ARTICLES.columns;
    for (const page of pages.slice(0, -1)) {
      expect(page.lines.some((line) => line.x >= right[0])).toBe(true);
      for (const line of page.lines) {
        expect(line.y).toBeLessThanOrEqual(ARTICLES.bottom);
        expect(line.x).toBeGreaterThanOrEqual(left[0]);
      }
      expect(page.guides[0]).toBe('ALP');
    }
  });

  it('en tête de page, le premier article à gauche et le dernier à droite', async () => {
    const layout = await layoutEncyclopedia(
      context,
      book(
        [para(10)],
        [
          ['ALPHABET', Array.from({ length: 6 }, () => para(40))],
          ['BABEL', Array.from({ length: 30 }, () => para(40))],
        ],
      ),
    );
    const page = [...layout.pages.values()].find((candidate) => candidate.guides[0] === 'ALP' && candidate.guides[1] === 'BAB');
    expect(page).toBeDefined();
  });

  it('coupe une formule plus large que la colonne', async () => {
    const formula = '<i>' + Array.from({ length: 12 }, () => '(q−1)/2×').join('') + 'q</i>';
    const layout = await layoutEncyclopedia(context, book([para(10)], [['COMBINAISON', [formula]]]));
    const width = ARTICLES.columns[0][1] - ARTICLES.columns[0][0];
    const lines = [...layout.pages.values()].filter((page) => page.part === 'articles').flatMap((page) => page.lines);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      const text = line.words.map((word) => word.map((run) => run.text).join('')).join(' ');
      expect(text.length * 7).toBeLessThanOrEqual(width);
    }
  });

  it("s'arrête à la dernière page du livre", async () => {
    const layout = await layoutEncyclopedia(context, book([para(10)], [['LIVRE', Array.from({ length: 4000 }, () => para(60))]]));
    expect(Math.max(...layout.pages.keys())).toBe(PAGES_PER_BOOK);
  });
});
