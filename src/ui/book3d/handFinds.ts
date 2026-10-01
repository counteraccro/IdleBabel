import { findText, gainFind, rollFind } from '../../systems/knowledge';
import type { Find } from '../../data/knowledge';
import type { GameState } from '../../core/state';

/** Trouvaille cachée dans une page. */
interface Hidden {
  find: Find;
  /** Déjà lue : elle reste surlignée sur sa page, mais ne rapporte plus rien. */
  gained?: boolean;
}

/**
 * Trouvailles du livre 3D en main (mots, morceaux de phrase, phrases entières) : chaque page a sa chance
 * d'en cacher une, tirée la première fois qu'on la dessine (le livre prépare ses pages un peu d'avance),
 * surlignée sur elle, et gagnée quand la feuille qui découvre sa double page se pose. Les pages se
 * redessinent à l'identique : le tirage est gardé.
 */
export const createHandFinds = (state: GameState) => {
  /** Page → sa trouvaille (null : rien), pour le livre `book`. */
  const rolled = new Map<number, Hidden | null>();
  let book = -1;
  const roll = (page: number): Hidden | null => {
    if (!rolled.has(page)) {
      const find = rollFind(state);
      rolled.set(page, find ? { find } : null);
    }
    return rolled.get(page)!;
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
      const hidden = roll(page);
      return hidden ? findText(hidden.find) : undefined;
    },
    /** La feuille s'est posée sur la double page `spread` : les trouvailles de ses deux pages sont lues. */
    gain: (spread: number): void => {
      for (const page of [2 * spread, 2 * spread + 1]) {
        const hidden = rolled.get(page);
        if (!hidden || hidden.gained) continue;
        hidden.gained = true;
        gainFind(state, hidden.find);
      }
    },
  };
};

export type HandFinds = ReturnType<typeof createHandFinds>;
