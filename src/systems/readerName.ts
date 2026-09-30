import { seeded, hashText } from '../core/random';
import { LETTERS } from './babelText';

/**
 * Le nom du joueur dans les phrases du livre blanc (« Je sais comment tu t'appelles… ») : `{name}`,
 * et `{babel}`, son « vrai nom » en lettres de Babel, tiré de son nom (toujours le même pour lui).
 */
let read: () => string = () => '';

/** Branché au démarrage sur la partie (comme readStrangeTitleWith). */
export const readReaderNameWith = (reader: () => string): void => {
  read = reader;
};

/** Vrai nom en lettres de Babel : un seul mot de 6 à 9 lettres. */
export const trueName = (name: string): string => {
  const random = seeded(hashText(`trueName:${name.toLocaleLowerCase()}`));
  const size = 6 + Math.floor(random() * 4);
  return Array.from({ length: size }, () => LETTERS[Math.floor(random() * LETTERS.length)]).join('');
};

/** Remplace `{name}` et `{babel}` dans un texte de phrase. */
export const withReaderName = (text: string): string => {
  const name = read() || '…';
  return text.replaceAll('{name}', name).replaceAll('{babel}', trueName(name));
};
