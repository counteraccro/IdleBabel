/**
 * Mode débogage : s'ouvre en ajoutant ?debug à l'adresse (en local comme en ligne).
 * Outil de développement : textes en français, hors du système de traduction.
 */
export const isDebugEnabled = (): boolean => new URLSearchParams(window.location.search).has('debug');

/** Adresse du livre de débogage. */
export const DEBUG_BOOK_HASH = '#debogage';

/** Adresse d'un livre rare ouvert en grand (#rare:deathBook), en attendant la bibliothèque. */
export const RARE_BOOK_HASH = '#rare:';
