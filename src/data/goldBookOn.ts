import { ATELIER_ON } from './atelierOn';

/**
 * Le Livre d'or (.ai/plan-livre-dor.md), à la place de l'atelier (l'auteur, 02/11) : en mode débogage seulement tant qu'il
 * n'est pas fini, comme l'atelier à ses débuts. Jamais avec l'atelier (?atelier) : le Sud de la Rose des vents n'ouvre qu'une
 * chose. Le jour venu, ne garder que `!ATELIER_ON`. Lu une fois, au chargement ; les tests le règlent avant d'importer le jeu.
 */
export const GOLD_BOOK_ON: boolean = !ATELIER_ON && new URLSearchParams(globalThis.location?.search ?? '').has('debug');
