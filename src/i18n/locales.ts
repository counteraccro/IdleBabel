import frUi from './fr/ui.json';
import frTools from './fr/tools.json';
import enUi from './en/ui.json';
import enTools from './en/tools.json';

/**
 * Langues disponibles. Pour en ajouter une :
 * copier le dossier fr/, traduire les fichiers, puis déclarer la langue ici.
 * Le français est la référence : le type Messages impose les mêmes clés partout.
 */
const fr = { ui: frUi, tools: frTools };
export type Messages = typeof fr;

const en: Messages = { ui: enUi, tools: enTools };

export const LOCALES = { fr, en } satisfies Record<string, Messages>;
export const REFERENCE_LOCALE = 'fr';
