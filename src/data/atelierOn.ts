/**
 * L'atelier des curiosités (.ai/plan-curiosites.md), première version en mode débogage seulement (l'auteur, 27/10 : « Comme
 * je ne suis pas sûr à 100 % de l'interface j'aimerais que pour cette première version, elle ne soit accessible qu'avec le
 * mode débug » ; « oui je confirme, tout caché hors debug »). Le Livre d'or le remplace et prend le Sud de la Rose des vents
 * (l'auteur, 02/11) : l'atelier n'existe plus qu'avec l'adresse ?atelier, en attendant de décider s'il est supprimé
 * (data/goldBookOn.ts). Sans elle, aucune curiosité n'arrive, la clé ne devient pas un trousseau, la planche de ses sceaux
 * n'existe pas. Lu une fois, au chargement (l'adresse ne change pas sans recharger) ; les tests le règlent avant d'importer le
 * jeu (location.search).
 */
export const ATELIER_ON: boolean = new URLSearchParams(globalThis.location?.search ?? '').has('atelier');
