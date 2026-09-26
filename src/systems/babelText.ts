/**
 * Texte de Babel : les 25 symboles de la nouvelle de Borges (22 lettres, l'espace, la virgule, le point).
 * Chaque page est une suite aléatoire de ces symboles — presque toujours dénuée de sens.
 */
const LETTERS = 'abcdefghijlmnopqrstuvxz';
const SYMBOLS = `${LETTERS}${' '.repeat(6)},.`;

export const randomBabelText = (length: number, random: () => number = Math.random): string => {
  let text = '';
  for (let i = 0; i < length; i++) {
    text += SYMBOLS[Math.floor(random() * SYMBOLS.length)];
  }
  return text.replace(/ {2,}/g, ' ').trim();
};
