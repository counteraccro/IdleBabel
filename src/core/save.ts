import { SAVE_VERSION, createInitialState, type GameState } from './state';
import type { Locale } from '../i18n';
import { renameRareBooks } from './renamedRareBooks';
import { dropRemovedMethods } from './removedMethods';
import { refundEtheriumTrees } from './etheriumTrees';
import { PAGES_PER_CLICK } from '../systems/click';

const SAVE_KEY = 'idle-babel-save';

export const loadGame = (defaultLocale: Locale): GameState => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as GameState;
      if (saved.version === SAVE_VERSION) {
        const initial = createInitialState(defaultLocale);
        return refundEtheriumTrees(
          dropRemovedMethods(
            renameRareBooks({
              ...initial,
              ...saved,
              settings: { ...initial.settings, ...saved.settings },
              stats: { ...initial.stats, ...saved.stats },
              tools: { ...initial.tools, ...saved.tools },
              methodPages: { ...saved.methodPages },
              technologies: { ...saved.technologies },
              // Parties d'avant la Réminiscence : le meilleur niveau, c'est celui d'aujourd'hui.
              technologiesBest: { ...saved.technologies, ...saved.technologiesBest },
              reminiscence: { ...initial.reminiscence, ...saved.reminiscence },
              // Les nœuds des anciens arbres, ou les étoiles : core/etheriumTrees.ts.
              etherium: saved.etherium ?? [],
              // Trouvailles d'avant le livre blanc (sans phrase) : oubliées.
              finds: (saved.finds ?? []).filter((find) => typeof find.sentence === 'string'),
              totalPagesRead: saved.totalPagesRead ?? saved.pages,
              // Une partie d'avant ces compteurs part de ce qu'elle sait : les pages de ses méthodes, ses clics.
              pagesByMethods: saved.pagesByMethods ?? Object.values(saved.methodPages ?? {}).reduce((sum, read) => sum + (read ?? 0), 0),
              pagesByHand: saved.pagesByHand ?? (saved.stats?.clicks ?? 0) * PAGES_PER_CLICK,
              // Une partie d'avant les graines garde sa Bibliothèque.
              seed: saved.seed ?? 0,
            }),
          ),
        );
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
