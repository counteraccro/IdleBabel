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

/** Une page : du charabia, et parfois une phrase sensée trouvée au milieu. */
export interface PageContent {
  before: string;
  fragment?: string;
  after: string;
}

export const createPage = (length: number, fragment?: string, random: () => number = Math.random): PageContent => {
  if (!fragment) return { before: randomBabelText(length, random), after: '' };
  const noise = Math.max(0, length - fragment.length);
  const split = Math.floor(noise * (0.2 + random() * 0.6));
  return {
    before: `${randomBabelText(split, random)} `,
    fragment,
    after: ` ${randomBabelText(noise - split, random)}`,
  };
};
