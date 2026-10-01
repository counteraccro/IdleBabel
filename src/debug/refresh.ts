import { BIG_BOOK_REWRITE } from '../ui/book3d/book3dBook';
import { DEBUG_BOOK_EVENT, DEBUG_LIBRARY_EVENT } from './events';

/** Ce que les réglages de débogage doivent redessiner après avoir changé la partie. */

/** Un grand livre est ouvert (étrange, blanc, débogage). */
export const bigBookOpen = (): boolean => document.querySelector('.book3d-page') !== null;

/** Grand livre ouvert : il se réécrit à la même page (chapitres ou légendes qui changent). */
export const rewriteBigBook = (): void => {
  if (bigBookOpen()) window.dispatchEvent(new Event(BIG_BOOK_REWRITE));
};

/** Le livre en main a changé (page, numéro, titres) : il se redessine. */
export const refreshBook = (): void => {
  window.dispatchEvent(new Event(DEBUG_BOOK_EVENT));
};

/** Les livres de la bibliothèque ont changé : la vitrine à l'écran se refait. */
export const refreshLibrary = (): void => {
  window.dispatchEvent(new Event(DEBUG_LIBRARY_EVENT));
};

/** L'écran est reconstruit (un livre devient accessible, ou ne l'est plus). */
export const rebuildScreen = (): void => {
  window.dispatchEvent(new HashChangeEvent('hashchange'));
};
