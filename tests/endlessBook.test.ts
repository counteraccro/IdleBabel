import { beforeEach, describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { CHEAT, ENDING, LANDING, LOCK, followParagraph, resetEndlessTrail, seeParagraphs } from '../src/systems/endlessBook';
import { parseWords, type EndlessText } from '../src/ui/rareBooks/endlessBook/endlessBookLayout';
import fr from '../public/texts/endlessBook.fr.json';
import en from '../public/texts/endlessBook.en.json';

const TEXTS = { fr: fr as EndlessText, en: en as EndlessText };

describe('le Livre sans fin : le texte', () => {
  for (const [locale, text] of Object.entries(TEXTS))
    it(`a cent paragraphes, aux mêmes choix dans les deux langues (${locale})`, () => {
      expect(text.paragraphs.map((p) => p.n)).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
      const targets = (t: EndlessText) => t.paragraphs.map((p) => p.parts.filter((part) => part[0] === 'choice').map((part) => part[2]));
      expect(targets(text)).toEqual(targets(TEXTS.fr));
    });

  it("n'envoie jamais au 72 ni au 66, et seul le 72 mène au 100, la seule fin", () => {
    const linksTo = (n: number) =>
      fr.paragraphs.filter((p) => p.parts.some((part) => part[0] === 'choice' && part[2] === n)).map((p) => p.n);
    expect(linksTo(LOCK)).toEqual([]);
    expect(linksTo(CHEAT)).toEqual([]);
    expect(linksTo(ENDING)).toEqual([LOCK]);
    expect(fr.paragraphs.filter((p) => p.parts.some((part) => part[0] === 'fin')).map((p) => p.n)).toEqual([ENDING]);
  });

  it('donne les trois nombres dont la somme ouvre la serrure', () => {
    const figures = fr.paragraphs.flatMap((p) => p.parts.filter((part) => part[0] === 'fig').map((part) => Number(part[1])));
    expect(figures.reduce((a, b) => a + b, 0)).toBe(LOCK);
  });

  it('met le numéro du choix en gras, la ponctuation collée, et l’italique entre étoiles', () => {
    expect(parseWords('rendez-vous au {}.', 47)).toEqual([
      { text: 'rendez-vous', italic: false },
      { text: 'au', italic: false },
      { text: '47', bold: true },
      { text: '.', italic: false, glued: true },
    ]);
    expect(parseWords('le *Livre sans fin*.').map((w) => w.italic)).toEqual([false, true, true, true]);
  });
});

describe('le Livre sans fin : les sceaux', () => {
  beforeEach(resetEndlessTrail);

  it('donne la seule fin par le palier, la serrure ouverte en tournant les pages, puis le lien du 72', () => {
    const state = createInitialState('fr', 0, 1);
    followParagraph(state, 10, LANDING, 40);
    seeParagraphs(state, [LOCK], 33);
    followParagraph(state, LOCK, ENDING, 45);
    expect(state.seals.endlessEnding).toBeDefined();
  });

  it('ne la donne pas sans être passé par le palier, ni si un autre lien a été suivi entre-temps', () => {
    const state = createInitialState('fr', 0, 1);
    seeParagraphs(state, [LOCK], 33);
    followParagraph(state, LOCK, ENDING, 45);
    followParagraph(state, 10, LANDING, 40);
    followParagraph(state, LANDING, 31, 15);
    seeParagraphs(state, [LOCK], 33);
    followParagraph(state, LOCK, ENDING, 45);
    expect(state.seals.endlessEnding).toBeUndefined();
  });

  it('donne le tricheur au 66 trouvé en feuilletant, pas en arrivant par un lien sur sa double page', () => {
    const state = createInitialState('fr', 0, 1);
    followParagraph(state, 64, 65, 30);
    seeParagraphs(state, [65, CHEAT], 30);
    expect(state.seals.endlessCheat).toBeUndefined();
    seeParagraphs(state, [70], 31);
    seeParagraphs(state, [65, CHEAT], 30);
    expect(state.seals.endlessCheat).toBeDefined();
  });
});
