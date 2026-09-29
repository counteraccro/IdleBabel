import frUi from './fr/ui.json';
import frTools from './fr/tools.json';
import frWhiteBook from './fr/whiteBook.json';
import frCovers from './fr/covers.json';
import frStrangeBook from './fr/strangeBook.json';
import frNotebook from './fr/notebook.json';
import frLore from './fr/lore.json';
import enUi from './en/ui.json';
import enTools from './en/tools.json';
import enWhiteBook from './en/whiteBook.json';
import enCovers from './en/covers.json';
import enStrangeBook from './en/strangeBook.json';
import enNotebook from './en/notebook.json';
import enLore from './en/lore.json';

/**
 * Langues disponibles. Pour en ajouter une :
 * copier le dossier fr/, traduire les fichiers, puis déclarer la langue ici.
 * Le français est la référence : le type Messages impose les mêmes clés partout.
 */
const fr = { ui: frUi, tools: frTools, whiteBook: frWhiteBook, covers: frCovers, strangeBook: frStrangeBook, notebook: frNotebook, lore: frLore };
export type Messages = typeof fr;

const en: Messages = { ui: enUi, tools: enTools, whiteBook: enWhiteBook, covers: enCovers, strangeBook: enStrangeBook, notebook: enNotebook, lore: enLore };

export const LOCALES = { fr, en } satisfies Record<string, Messages>;
export const REFERENCE_LOCALE = 'fr';
