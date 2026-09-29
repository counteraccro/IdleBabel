import { findText, gainFind, rollFind } from '../../systems/knowledge';
import type { Find } from '../../data/knowledge';
import type { GameState } from '../../core/state';

/** Trouvaille cachée dans une double page, et la page qui la porte (gauche ou droite). */
interface Hidden {
  find: Find;
  page: number;
  /** Déjà lue : elle reste surlignée sur sa page, mais ne rapporte plus rien. */
  gained?: boolean;
}

/**
 * Trouvailles du livre 3D en main (mots, morceaux de phrase, phrases entières) : chaque double page a sa chance d'en cacher une, tirée la première fois qu'on la dessine
 * (le livre prépare ses pages un peu d'avance), surlignée sur l'une de ses deux pages, et gagnée quand la
 * feuille qui la découvre se pose. Les pages se redessinent à l'identique : le tirage est gardé.
 */
export const createHandFinds = (state: GameState) => {
  /** Double page → sa trouvaille (null : rien), pour le livre `book`. */
  const rolled = new Map<number, Hidden | null>();
  let book = -1;
  const spreadOf = (page: number): number => Math.floor(page / 2);
  const roll = (spread: number): Hidden | null => {
    if (!rolled.has(spread)) {
      const find = rollFind(state);
      rolled.set(spread, find ? { find, page: 2 * spread + (Math.random() < 0.5 ? 0 : 1) } : null);
    }
    return rolled.get(spread)!;
  };
  return {
    /** Nouveau livre en main : ses pages n'ont encore rien caché. */
    open: (index: number): void => {
      if (index === book) return;
      book = index;
      rolled.clear();
    },
    /** Texte surligné sur la page `page` (pages de texte seulement : à partir de 2). */
    fragment: (page: number): string | undefined => {
      if (page < 2) return undefined;
      const hidden = roll(spreadOf(page));
      return hidden?.page === page ? findText(hidden.find) : undefined;
    },
    /** La feuille s'est posée sur la double page `spread` : sa trouvaille est lue. */
    gain: (spread: number): void => {
      const hidden = rolled.get(spread);
      if (!hidden || hidden.gained) return;
      hidden.gained = true;
      gainFind(state, hidden.find);
    },
  };
};

export type HandFinds = ReturnType<typeof createHandFinds>;
