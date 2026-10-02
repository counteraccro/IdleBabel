import { describe, expect, it } from 'vitest';
import { PAGES_PER_BOOK } from '../src/systems/books';
import { CONTENTS_PAGE, CONTENTS_ROWS, layoutClassic, type ClassicStyle } from '../src/ui/rareBooks/classic/classicLayout';
import type { ClassicText } from '../src/ui/rareBooks/classic/classicText';

/** Un faux contexte de dessin : chaque lettre fait 10 de large, l'ascendante 15. */
const context = {
  font: '',
  measureText: (text: string) => ({ width: text.length * 10, fontBoundingBoxAscent: 15 }),
} as unknown as CanvasRenderingContext2D;

const STYLE: ClassicStyle = { body: 'serif', size: 17, line: 26, ink: '#000', accent: '#000', heading: 'serif', chaptersOnRight: false };

/** Un paragraphe d'environ `lines` lignes (des mots de 9 lettres). */
const para = (lines: number): string => Array.from({ length: lines * 5 }, () => 'abcdefghi').join(' ');

const book = (chapters: string[][]): ClassicText => ({
  chapters: chapters.map((paras, index) => ({ label: `CHAPTER ${index + 1}`, title: `Titre ${index + 1}`, paras })),
});

describe('mise en page des classiques', () => {
  it('commence après la table des matières, chaque chapitre à la suite', async () => {
    const layout = await layoutClassic(context, book([[para(3)], [para(3)], [para(3)]]), STYLE);
    expect(layout.contentsPages).toBe(1);
    expect(layout.starts).toEqual([CONTENTS_PAGE + 1, CONTENTS_PAGE + 2, CONTENTS_PAGE + 3]);
    for (const start of layout.starts) expect(layout.pages.get(start)?.opening).toBe(true);
  });

  it('une page de table des matières par tranche de chapitres', async () => {
    const layout = await layoutClassic(context, book(Array.from({ length: CONTENTS_ROWS + 1 }, () => [para(1)])), STYLE);
    expect(layout.contentsPages).toBe(2);
    expect(layout.starts[0]).toBe(CONTENTS_PAGE + 2);
  });

  it('chaque chapitre sur une page de droite, si le style le veut', async () => {
    const layout = await layoutClassic(context, book([[para(3)], [para(3)], [para(3)]]), { ...STYLE, chaptersOnRight: true });
    for (const start of layout.starts) expect(start % 2).toBe(1);
  });

  it("un chapitre trop long s'arrête au dernier paragraphe entier qui tient dans ses pages", async () => {
    // 40 paragraphes de 10 lignes : bien plus que 2 pages.
    const layout = await layoutClassic(context, book([Array.from({ length: 40 }, () => para(10)), [para(1)]]), {
      ...STYLE,
      chapterPages: 2,
    });
    const [first, second] = layout.starts;
    expect(second).toBe(first + 2);
    // Pas de paragraphe coupé : ses deux pages portent un nombre entier de paragraphes.
    const alone = await layoutClassic(context, book([[para(10)]]), STYLE);
    const perPara = alone.pages.get(alone.starts[0])!.lines.length;
    const kept = layout.pages.get(first)!.lines.length + layout.pages.get(first + 1)!.lines.length;
    expect(kept % perPara).toBe(0);
    expect(kept).toBeGreaterThan(perPara);
  });

  it('ne dépasse jamais la dernière page du livre (le reste du texte est coupé)', async () => {
    const layout = await layoutClassic(context, book(Array.from({ length: 300 }, () => [para(30)])), STYLE);
    expect(Math.max(...layout.pages.keys())).toBeLessThanOrEqual(PAGES_PER_BOOK);
    expect(Math.max(...layout.starts)).toBeLessThanOrEqual(PAGES_PER_BOOK);
  });

  it('une lettrine au premier paragraphe, si le style en a une', async () => {
    const layout = await layoutClassic(context, book([[para(3), para(3)]]), { ...STYLE, dropCap: 'serif' });
    expect(layout.pages.get(layout.starts[0])?.dropCap?.letter).toBe('a');
  });

  it('les strophes : un vers par ligne, en retrait', async () => {
    const layout = await layoutClassic(context, book([['Premier vers\nSecond vers']]), STYLE);
    const lines = layout.pages.get(layout.starts[0])!.lines;
    expect(lines.map((line) => line.text)).toEqual(['Premier vers', 'Second vers']);
    expect(lines[0].x).toBe(lines[1].x);
  });
});
