/**
 * « Mon histoire vraie », la fausse fin (décidée par l'auteur le 14/10/2026, conception §9.2, .ai/maquette-faux-livre.html) :
 * un livre de charabia où chaque étoile du Rideau allumée fait remonter une bribe de souvenir, surlignée sur sa page. Les
 * bribes viennent dans l'ordre où les étoiles s'allument, quelle que soit l'étoile ; la dernière (page 410) attend tout le
 * Rideau. Textes : rareBooks.trueStory.bribes, dans le même ordre.
 */
export const BRIBE_PAGES = [7, 31, 58, 102, 164, 233, 271, 317, 410] as const;

/** Le livre dans la vitrine (ui/library/libraryPage.ts), et ses textes (rareBooks.trueStory). */
export const TRUE_STORY_BOOK = 'trueStory';
