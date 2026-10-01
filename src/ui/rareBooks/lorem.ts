/** Lorem ipsum : le remplissage des vrais livres (des phrases, des virgules, des points). */
const WORDS = (
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna ' +
  'aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute ' +
  'irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non ' +
  'proident sunt culpa qui officia deserunt mollit anim id est laborum'
).split(' ');

/** Environ `length` caractères de lorem ipsum, en phrases (toujours les mêmes pour le même `random`). */
export const loremText = (length: number, random: () => number): string => {
  const sentences: string[] = [];
  let size = 0;
  while (size < length) {
    const words = Array.from({ length: 6 + Math.floor(random() * 12) }, () => WORDS[Math.floor(random() * WORDS.length)]);
    if (words.length > 8 && random() < 0.5) words[3 + Math.floor(random() * 4)] += ',';
    const sentence = `${words.join(' ')}.`;
    sentences.push(sentence.charAt(0).toUpperCase() + sentence.slice(1));
    size += sentence.length + 1;
  }
  return sentences.join(' ');
};
