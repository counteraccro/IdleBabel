/**
 * Les lignes des planches, sur la page d'introduction des sceaux : la première en LINE_TOP, toujours 40 d'écart, texte
 * en 22. Ce qui ne tient pas au-dessus du folio continue sur une page de suite, sous le titre répété, comme le relevé
 * d'un chapitre (l'auteur, 16/10 : la liste se resserrait à chaque planche ajoutée, la Loterie l'aurait trop tassée).
 */
export const LINE_TOP = 400;
/** Sur une page de suite, la liste commence sous le titre. */
export const MORE_TOP = 180;
export const LINE_BOTTOM = 690;
export const LINE_STEP = 40;
export const LINE_SIZE = 22;

/** Lignes qui tiennent de `top` à LINE_BOTTOM. */
const linesFrom = (top: number): number => Math.floor((LINE_BOTTOM - top) / LINE_STEP) + 1;

/** Les lignes de chaque page, pour `count` planches : celles de l'introduction, puis des pages de suite. */
export const plateListPages = (count: number): number[] => {
  const pages = [Math.min(count, linesFrom(LINE_TOP))];
  for (let left = count - pages[0]; left > 0; left -= pages[pages.length - 1]) pages.push(Math.min(left, linesFrom(MORE_TOP)));
  return pages;
};
