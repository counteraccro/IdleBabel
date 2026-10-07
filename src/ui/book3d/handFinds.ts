import { findText, gainFind, rollFinds } from '../../systems/knowledge';
import { gameRandom } from '../../core/random';
import { handFindsMultiplier } from '../../systems/etherium';
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
 * d'en cacher une (plusieurs au-delà de 100 % : la première seule est surlignée, toutes sont gagnées), tirée la première fois qu'on la dessine (le livre prépare ses pages un peu d'avance),
 * surlignée sur elle, et gagnée quand la feuille qui découvre sa double page se pose. Les pages se
 * redessinent à l'identique : le tirage est gardé. Tiré de la graine de la partie, du livre et de la page.
 */
export const createHandFinds = (state: GameState) => {
  /** Page → ses trouvailles (aucune : rien), pour le livre `book`. */
  const rolled = new Map<number, Hidden[]>();
  let book = -1;
  const roll = (page: number): Hidden[] => {
    if (!rolled.has(page))
      rolled.set(
        page,
        rollFinds(state, gameRandom(`find:${book}:${page}`)).map((find) => ({ find })),
      );
    return rolled.get(page)!;
  };
  return {
    /** Nouveau livre en main : ses pages n'ont encore rien caché. */
    open: (index: number): void => {
      if (index === book) return;
      book = index;
      rolled.clear();
    },
    /**
     * Texte surligné sur la page `page` (pages de texte seulement : à partir de 2) : la première de ses
     * trouvailles ; les autres ne s'écrivent pas (à terme, elles ne tiendraient plus dans la page).
     */
    fragment: (page: number): string | undefined => {
      const first = page < 2 ? undefined : roll(page)[0];
      return first ? findText(first.find) : undefined;
    },
    /**
     * La feuille s'est posée sur la double page `spread` : les trouvailles de ses deux pages sont lues. Tournée à
     * la main (`byHand`), avec l'Annulaire de l'Etherium : chaque page tire encore (sa chance doublée), sans surligner.
     */
    gain: (spread: number, byHand = false): void => {
      const extra = byHand ? handFindsMultiplier(state) - 1 : 0;
      for (const page of [2 * spread, 2 * spread + 1]) {
        for (const hidden of rolled.get(page) ?? []) {
          if (hidden.gained) continue;
          hidden.gained = true;
          gainFind(state, hidden.find);
        }
        if (page < 2 || !rolled.has(page)) continue;
        for (let i = 0; i < extra; i++)
          for (const find of rollFinds(state, gameRandom(`find:${book}:${page}:hand${i}`))) gainFind(state, find);
      }
    },
  };
};

export type HandFinds = ReturnType<typeof createHandFinds>;
