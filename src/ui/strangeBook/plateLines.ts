/**
 * Les lignes des planches, sur la page d'introduction : la première en LINE_TOP, 40 d'écart tant qu'elles tiennent ;
 * au-delà, elles se resserrent (et leur texte rapetisse) pour que la dernière ne passe jamais sous LINE_BOTTOM,
 * au-dessus du folio. Chaque planche ajoutée (Etherium, Mimic…) faisait déborder la liste hors de la page.
 */
export const LINE_TOP = 400;
export const LINE_BOTTOM = 690;
const LINE_STEP = 40;
export const LINE_SIZE = 22;

/** L'écart entre deux lignes et la taille de leur texte, pour `count` planches. */
export const plateLines = (count: number): { step: number; size: number } => {
  const step = Math.min(LINE_STEP, (LINE_BOTTOM - LINE_TOP) / Math.max(1, count - 1));
  return { step, size: Math.min(LINE_SIZE, Math.round(step * 0.72)) };
};
