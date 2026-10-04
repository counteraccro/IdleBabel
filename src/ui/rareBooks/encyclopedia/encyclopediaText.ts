import { CANON, FELL, FELL_SC } from './encyclopediaFonts';

/**
 * Le texte de l'Encyclopédie tel que dans l'édition : de l'italique (les désignations « (Hist. sacr. ant.) »,
 * les mots cités) et des petites capitales (les renvois « Voyez Volume », les sous-articles), marqués dans
 * public/texts/encyclopedia.fr.json par <i>…</i> et <sc>…</sc>. Un mot peut changer de style en son milieu
 * (« <i>Littér</i>. ») : c'est une suite de morceaux.
 */
export interface Run {
  text: string;
  italic: boolean;
  caps: boolean;
}
export type Word = Run[];

/** Les mots d'un paragraphe, avec leur style. */
export const parseWords = (para: string): Word[] => {
  const words: Word[] = [];
  let word: Word = [];
  let [italic, caps] = [0, 0];
  for (const piece of para.split(/(<\/?(?:i|sc)>)/)) {
    if (piece === '<i>') italic++;
    else if (piece === '</i>') italic = Math.max(0, italic - 1);
    else if (piece === '<sc>') caps++;
    else if (piece === '</sc>') caps = Math.max(0, caps - 1);
    else
      for (const [index, part] of piece.split(' ').entries()) {
        if (index > 0 && word.length) {
          words.push(word);
          word = [];
        }
        if (part) word.push({ text: part, italic: italic > 0, caps: caps > 0 });
      }
  }
  if (word.length) words.push(word);
  return words;
};

/** La police d'un morceau, à la taille `size` (les petites capitales n'ont pas d'italique : l'italique l'emporte). */
export const runFont = ({ italic, caps }: Run, size: number): string =>
  italic ? `italic ${size}px ${FELL}` : caps ? `${size}px ${FELL_SC}` : `${size}px ${FELL}`;

/** Les titres (Canon) à la taille `size`. */
export const canonFont = (size: number, italic = false): string => `${italic ? 'italic ' : ''}${size}px ${CANON}`;

/** Les largeurs déjà mesurées : le livre a 160 000 mots, beaucoup reviennent. */
const widths = new Map<string, number>();

/** Oublie les largeurs mesurées (le livre n'est plus gardé) : elles se remesurent à la demande. */
export const forgetWidths = (): void => widths.clear();

/** La largeur d'un mot à la taille `size`. */
export const wordWidth = (context: CanvasRenderingContext2D, word: Word, size: number): number => {
  let total = 0;
  for (const run of word) {
    const font = runFont(run, size);
    const key = `${font}|${run.text}`;
    let width = widths.get(key);
    if (width === undefined) {
      context.font = font;
      width = context.measureText(run.text).width;
      widths.set(key, width);
    }
    total += width;
  }
  return total;
};

/** La largeur d'une espace à la taille `size`. */
export const spaceWidth = (context: CanvasRenderingContext2D, size: number): number =>
  wordWidth(context, [{ text: ' ', italic: false, caps: false }], size);

/** Un nombre en chiffres romains à l'ancienne, en minuscules, le dernier i en j (« ij », « vj ») : les pages du Discours. */
export const oldRoman = (value: number): string => {
  let out = '';
  for (const [size, letters] of [
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ] as const)
    while (value >= size) {
      out += letters;
      value -= size;
    }
  return out.replace(/i$/, 'j');
};
