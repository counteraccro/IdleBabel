import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInitialState } from '../src/core/state';
import { ATELIER_SEALS, SEALS } from '../src/data/seals';
import { revealStats } from '../src/systems/strangeBook';
import { setLocale } from '../src/i18n';
import fr from '../src/i18n/fr/strangeBook.json';

vi.stubGlobal('window', new EventTarget());
vi.stubGlobal('document', {});
const { sealLegend, sealTitle } = await import('../src/ui/strangeBook/plates');

/** Les planches et les sceaux sans titre : leur nom ou leur phrase en tient lieu (l'auteur, 21/10). */
const UNTITLED_PLATES = ['methods', 'rare', 'secrets', 'relics', 'mods'];

describe('les titres des sceaux (21/10)', () => {
  afterEach(() => revealStats(false));

  it('chaque titre est celui d’un vrai sceau', () => {
    // L'atelier, seulement en débogage (data/atelierOn.ts) : ses sceaux n'y sont pas, leurs titres si.
    const ids = new Set([...SEALS, ...ATELIER_SEALS].map((seal) => seal.id));
    for (const id of Object.keys(fr.sealTitles)) expect(ids.has(id), id).toBe(true);
  });

  it('un titre là où la légende est une consigne, jamais sur les méthodes, livres rares, secrets, reliques ni séries à phrases', () => {
    setLocale('fr');
    for (const seal of SEALS) {
      const untitled = UNTITLED_PLATES.includes(seal.plate) || seal.phrases || seal.tool !== undefined;
      expect(sealTitle(seal) === null, seal.id).toBe(untitled);
    }
  });

  it('obtenu, le titre en grand, ce qu’il récompense devant la date ; pas obtenu, la consigne comme avant', () => {
    setLocale('fr');
    revealStats(true);
    const state = createInitialState('fr');
    expect(sealLegend(state, 'booksFinished-1')).toEqual({ name: 'Referme un volume', text: '…' });
    state.seals['booksFinished-1'] = Date.UTC(2026, 9, 21, 12);
    const legend = sealLegend(state, 'booksFinished-1');
    expect(legend.name).toBe('Premier livre refermé');
    expect(legend.text.startsWith('Referme un volume — ')).toBe(true);
  });
});
