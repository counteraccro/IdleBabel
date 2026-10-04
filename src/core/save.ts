import { SAVE_VERSION, createInitialState, type GameState } from './state';
import type { Locale } from '../i18n';
import { renameRareBooks } from './renamedRareBooks';

const SAVE_KEY = 'idle-babel-save';

export const loadGame = (defaultLocale: Locale): GameState => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as GameState;
      if (saved.version === SAVE_VERSION) {
        const initial = createInitialState(defaultLocale);
        return renameRareBooks({
          ...initial,
          ...saved,
          settings: { ...initial.settings, ...saved.settings },
          stats: { ...initial.stats, ...saved.stats },
          tools: { ...initial.tools, ...saved.tools },
          // Trouvailles d'avant le livre blanc (sans phrase) : oubliées.
          finds: (saved.finds ?? []).filter((find) => typeof find.sentence === 'string'),
          totalPagesRead: saved.totalPagesRead ?? saved.pages,
          // Une partie d'avant les graines garde sa Bibliothèque.
          seed: saved.seed ?? 0,
        });
      }
    }
  } catch {
    // sauvegarde illisible ou stockage bloqué : nouvelle partie
  }
  return createInitialState(defaultLocale);
};

export const saveGame = (state: GameState): void => {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // stockage indisponible (navigation privée) : le jeu continue sans sauvegarde
  }
};

export const deleteSave = (): void => {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // rien à faire
  }
};
