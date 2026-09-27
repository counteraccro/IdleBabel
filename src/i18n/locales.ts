import frUi from './fr/ui.json';
import frTools from './fr/tools.json';
import frFragments from './fr/fragments.json';
import frCovers from './fr/covers.json';
import frStrangeBook from './fr/strangeBook.json';
import enUi from './en/ui.json';
import enTools from './en/tools.json';
import enFragments from './en/fragments.json';
import enCovers from './en/covers.json';
import enStrangeBook from './en/strangeBook.json';

/**
 * Langues disponibles. Pour en ajouter une :
 * copier le dossier fr/, traduire les fichiers, puis déclarer la langue ici.
 * Le français est la référence : le type Messages impose les mêmes clés partout.
 */
const fr = { ui: frUi, tools: frTools, fragments: frFragments, covers: frCovers, strangeBook: frStrangeBook };
export type Messages = typeof fr;

const en: Messages = { ui: enUi, tools: enTools, fragments: enFragments, covers: enCovers, strangeBook: enStrangeBook };

export const LOCALES = { fr, en } satisfies Record<string, Messages>;
export const REFERENCE_LOCALE = 'fr';
