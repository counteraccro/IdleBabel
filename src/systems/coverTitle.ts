import { messages } from '../i18n';
import type { CoverDesign } from './coverDesign';
import { statsRevealed } from './strangeBook';

/**
 * Titre affiché d'un livre : les symboles de Babel de la couverture, où se glisse parfois
 * un vrai mot, ou un vrai titre entier (lignes déjà découpées dans les traductions).
 */
export type TitleOverride = 'none' | 'word' | 'title' | undefined;

/** Débogage : impose un type de titre à tous les livres. */
let forced: TitleOverride;
export const forceTitles = (kind: TitleOverride): void => {
  forced = kind;
};

/** Le titre du livre étrange se lit-il ? Réglé au démarrage (main.ts) : il suit le déchiffrage du sommaire. */
let strangeTitleReadable = (): boolean => false;
export const readStrangeTitleWith = (readable: () => boolean): void => {
  strangeTitleReadable = readable;
};

const pickFrom = <T>(list: readonly T[], pick: number): T => list[Math.floor(pick * list.length)];

export const hasMeaningfulTitle = (design: CoverDesign): boolean => (forced ?? design.sense.kind) === 'title';

export const coverTitle = (design: CoverDesign): string[] => {
  const { slot, pick } = design.sense;
  const { words, titles } = messages().covers;
  // Déchiffré (ou débogage « statistiques visibles ») : le livre étrange porte son titre en clair.
  if (design.strange && (statsRevealed() || strangeTitleReadable())) return [messages().strangeBook.title];
  // Un livre rare : son vrai titre, ligne par ligne.
  if (design.rare) return [...((messages().rareBooks as Record<string, { cover: string[] }>)[design.rare]?.cover ?? [])];
  switch (forced ?? design.sense.kind) {
    case 'title':
      return [...pickFrom(titles, pick)];
    case 'word':
      return design.title.map((word, index) => (index === slot ? pickFrom(words, pick) : word));
    default:
      return design.title;
  }
};
