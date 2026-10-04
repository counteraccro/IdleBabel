/**
 * Les livres dont la mise en page est gardée : les derniers ouverts seulement. Un classique mis en page pèse
 * quelques Mo (tout son texte, ligne à ligne) ; gardés tous, les livres lus dans une partie finiraient par en
 * peser des centaines. Un livre oublié se remet en page à sa prochaine ouverture (~200 ms, par morceaux).
 * Trois : le livre en main, le suivant qui arrive, et un de rechange.
 */
const KEEP = 3;

/** De quoi oublier chaque mise en page gardée, de la dernière ouverte à la plus ancienne. */
const kept: (() => void)[] = [];

/** Le livre qui sait s'oublier avec `forget` vient d'être ouvert : il passe en tête, le plus ancien au-delà de KEEP est oublié. */
export const keepLayout = (forget: () => void): void => {
  const index = kept.indexOf(forget);
  if (index >= 0) kept.splice(index, 1);
  kept.unshift(forget);
  while (kept.length > KEEP) kept.pop()!();
};
