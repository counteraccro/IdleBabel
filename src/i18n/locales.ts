import frUi from './fr/ui.json';
import frTools from './fr/tools.json';
import frWhiteBook from './fr/whiteBook.json';
import frCovers from './fr/covers.json';
import frStrangeBook from './fr/strangeBook.json';
import frNotebook from './fr/notebook.json';
import frLore from './fr/lore.json';
import frNumbers from './fr/numbers.json';
import frRareBooks from './fr/rareBooks.json';
import frFinalBook from './fr/finalBook.json';
import frEtherium from './fr/etherium.json';
import enUi from './en/ui.json';
import enTools from './en/tools.json';
import enWhiteBook from './en/whiteBook.json';
import enCovers from './en/covers.json';
import enStrangeBook from './en/strangeBook.json';
import enNotebook from './en/notebook.json';
import enLore from './en/lore.json';
import enNumbers from './en/numbers.json';
import enRareBooks from './en/rareBooks.json';
import enFinalBook from './en/finalBook.json';
import enEtherium from './en/etherium.json';

/**
 * Langues disponibles. Pour en ajouter une :
 * copier le dossier fr/, traduire les fichiers, puis déclarer la langue ici.
 * Le français est la référence : le type Messages impose les mêmes clés partout.
 */
/** Espaces insécables de la typographie française : « » et : ; ? ! % ne restent jamais seuls en bout de ligne. */
const unbreakable = <T>(node: T): T => {
  if (typeof node === 'string') return node.replace(/« /g, '«\u00a0').replace(/ ([»:;?!%])/g, '\u00a0$1') as T;
  if (Array.isArray(node)) return node.map(unbreakable) as T;
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, unbreakable(value)])) as T;
  }
  return node;
};

const fr = unbreakable({
  ui: frUi,
  tools: frTools,
  whiteBook: frWhiteBook,
  covers: frCovers,
  strangeBook: frStrangeBook,
  notebook: frNotebook,
  lore: frLore,
  numbers: frNumbers,
  rareBooks: frRareBooks,
  finalBook: frFinalBook,
  etherium: frEtherium,
});
export type Messages = typeof fr;

const en: Messages = {
  ui: enUi,
  tools: enTools,
  whiteBook: enWhiteBook,
  covers: enCovers,
  strangeBook: enStrangeBook,
  notebook: enNotebook,
  lore: enLore,
  numbers: enNumbers,
  rareBooks: enRareBooks,
  finalBook: enFinalBook,
  etherium: enEtherium,
};

export const LOCALES = { fr, en } satisfies Record<string, Messages>;
export const REFERENCE_LOCALE = 'fr';
