import { messages } from '../i18n';
import type { CoverDesign } from './coverDesign';

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

const pickFrom = <T>(list: readonly T[], pick: number): T => list[Math.floor(pick * list.length)];

export const hasMeaningfulTitle = (design: CoverDesign): boolean => (forced ?? design.sense.kind) === 'title';

export const coverTitle = (design: CoverDesign): string[] => {
  const { slot, pick } = design.sense;
  const { words, titles } = messages().covers;
  switch (forced ?? design.sense.kind) {
    case 'title':
      return [...pickFrom(titles, pick)];
    case 'word':
      return design.title.map((word, index) => (index === slot ? pickFrom(words, pick) : word));
    default:
      return design.title;
  }
};
