import { el } from '../dom';
import { t } from '../../i18n';
import { openModal } from '../modal/modal';

/**
 * La trace d'une erreur qui n'a aucun sens pour le joueur (et c'est voulu) : le livre de débogage ne s'ouvre
 * qu'en mode ?debug. Du code, pas une phrase : la même dans toutes les langues. Clins d'œil à Babel : 410
 * pages, 25 symboles, 1 312 000 signes par livre, des galeries sans fin.
 */
const TRACE = [
  'Uncaught BabelError: E_SHELF_RECURSION (0x0B4BE1)',
  '    at Librarian.open (hexagon.c:410)',
  '    at Shelf.take (hexagon.c:25)',
  '    at Gallery.walk (gallery.c:∞)',
  '    at Reader.<anonymous> (<unknown>)',
  '  caused by: BookNotFound — catalogue[1 / 25^1312000]',
  '  segment 0x00000000: read-only',
  '[core dumped]',
].join('\n');

/** On tente d'ouvrir le livre de débogage hors du mode ?debug : une erreur obscure, et il reste fermé. */
export const showDebugBookError = (): void => {
  const trace = el('pre', 'library-error', TRACE);
  openModal({
    title: t('ui.debugBookError'),
    variant: 'danger',
    body: [trace],
    dismissible: true,
    actions: [{ label: t('ui.debugBookErrorClose'), kind: 'primary' }],
  });
};
