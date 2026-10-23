/**
 * « Mon histoire vraie », la fausse fin (décidée par l'auteur le 14/10/2026, conception §9.2, .ai/maquette-faux-livre.html),
 * devenue « Qui j'étais », le tome 1 de « L'histoire de Babel » : un livre de charabia où remontent neuf bribes de souvenir,
 * surlignées chacune sur sa page. D'abord une par étoile du Rideau ; depuis le 18/10, toutes à l'achat du Nord-Est de la
 * Rose des vents. Textes : rareBooks.trueStory.bribes, dans le même ordre.
 */
export const BRIBE_PAGES = [7, 31, 58, 102, 164, 233, 271, 317, 410] as const;

/**
 * Les pages des bribes de chaque tome écrit (0 : le tome 1), neuf par tome, la dernière toujours à la page 410 (l'auteur,
 * 18/10 : « 9, comme le tome 1 »). Un tome qui n'est pas ici n'est pas encore écrit : il ne se trouve pas. Textes :
 * rareBooks.trueStory.tomes, un tableau par tome après le premier.
 */
export const TOME_BRIBE_PAGES: readonly (readonly number[])[] = [
  BRIBE_PAGES,
  [9, 44, 81, 127, 176, 219, 268, 330, 410],
  [12, 53, 88, 141, 187, 240, 296, 352, 410],
  [8, 47, 95, 133, 181, 229, 284, 341, 410],
  [11, 49, 92, 138, 190, 236, 279, 337, 410],
];

/** Le livre dans la vitrine (ui/library/libraryPage.ts), et ses textes (rareBooks.trueStory). */
export const TRUE_STORY_BOOK = 'trueStory';
