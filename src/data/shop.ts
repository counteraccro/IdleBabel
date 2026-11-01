import type { BoonId } from './letter';

/**
 * Le guichet (l'auteur, 30/10 : « ok pour les six rayons », « ok pour les prix » ; maquette validée le 31/10,
 * .ai/maquette-guichet.html) : la page d'en face de la carte de lecteur, où se dépensent les tampons des tâches.
 */

/** Réserver un bonus de la lettre déjà appris, lancé tout de suite : son prix (Quatre cent dix n'est pas au tarif). */
export const BOON_PRICES: readonly [BoonId, number][] = [
  ['trance', 30],
  ['flash', 30],
  ['hand', 20],
  ['eye', 15],
  ['mind', 15],
  ['deal', 20],
  ['find', 25],
];

/** Une heure de lecture, ou de Connaissance, au rythme du moment : 10, puis 10 de plus à chaque achat, jusqu'à minuit. */
export const HOUR_PRICE = 10;
export const HOUR_STEP = 10;
export const HOUR_SECONDS = 3600;
