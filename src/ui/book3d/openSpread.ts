/**
 * Où est, à l'écran, la double page du grand livre ouvert et posé (book3dPage.ts) : de quoi poser par-dessus un
 * élément de la page web qui a l'air d'être sur le papier (le Lapin blanc du « Lapin de garenne »). null : pas de
 * grand livre, ou pas ouvert et posé (fermé, une page qui tourne, la page quittée).
 */

type Where = () => DOMRect | null;

let where: Where | null = null;

/** Le grand livre affiché dit où le trouver ; `null` en partant (seulement s'il était encore celui qui répondait). */
export const setOpenSpread = (provider: Where | null, previous?: Where): void => {
  if (provider || where === previous) where = provider;
};

export const openSpreadRect = (): DOMRect | null => where?.() ?? null;
