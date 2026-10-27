/**
 * L'atelier des curiosités (.ai/plan-curiosites.md), première version en mode débogage seulement (l'auteur, 27/10 : « Comme
 * je ne suis pas sûr à 100 % de l'interface j'aimerais que pour cette première version, elle ne soit accessible qu'avec le
 * mode débug » ; « oui je confirme, tout caché hors debug ») : hors ?debug, le Sud de la Rose des vents reste « plus tard »,
 * aucune curiosité n'arrive, la clé ne devient pas un trousseau, la planche de ses sceaux n'existe pas. Le jour venu, mettre
 * true ici suffit. Lu une fois, au chargement (l'adresse ne change pas sans recharger) ; les tests le règlent avant d'importer
 * le jeu (location.search).
 */
export const ATELIER_ON: boolean = new URLSearchParams(globalThis.location?.search ?? '').has('debug');
