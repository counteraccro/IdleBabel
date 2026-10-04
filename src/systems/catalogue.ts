import { PAGES_PER_BOOK } from './books';
import { drawRareBook } from './rareBooks';
import { sealEvent } from './seals';
import { rareChance } from './technologies';
import type { GameState } from '../core/state';

/**
 * Le Catalogue des catalogues est vrai : son registre recense, dans l'ordre, les livres que le joueur prendra
 * après lui, à partir du livre où il l'a trouvé. Chaque ligne vient de la couverture du livre à ce numéro
 * (même graine, même tirage). Les livres rares y sont à leur place : on les tire à la suite, comme le jeu le
 * fera, à partir de ceux déjà trouvés ce jour-là ; la liste ne change donc pas quand on le relit plus tard.
 * Décidé avec l'auteur le 04/10/2026 (maquette .ai/maquette-catalogue-pages.html).
 */

export const CATALOGUE_ID = 'catalogue';
/** La première page du registre : sa première ligne est le Catalogue lui-même. */
export const REGISTER_PAGE = 3;
/** Livres par page du registre. */
export const ROWS = 20;
/** Page 205 : le catalogue qui ne sait pas s'il doit s'écrire prend la place de neuf livres. */
export const RUSSELL_PAGE = 205;
export const RUSSELL_ROWS = 9;
/** Avant la ligne de Russell, six livres ; après, cinq. */
export const RUSSELL_AFTER = 6;
/** La dernière page : neuf livres, puis la fin du registre. */
export const LAST_ROWS = 9;

/** Le numéro du livre où le Catalogue a été trouvé (relu sans l'avoir trouvé, en débogage : le livre en cours). */
export const catalogueIndex = (state: GameState): number => state.rareBooks[CATALOGUE_ID] ?? state.booksFinished;

/** Combien de livres sur la page `page` du registre (page 3 : le Catalogue compris). */
export const rowsOn = (page: number): number => (page === PAGES_PER_BOOK ? LAST_ROWS : page === RUSSELL_PAGE ? ROWS - RUSSELL_ROWS : ROWS);

/** Le numéro du premier livre de la page `page` (page 3 : le Catalogue lui-même). */
export const firstOn = (found: number, page: number): number =>
  page === REGISTER_PAGE ? found : found + ROWS + (page - REGISTER_PAGE - 1) * ROWS - (page > RUSSELL_PAGE ? RUSSELL_ROWS : 0);

/** Le dernier livre recensé. */
const lastListed = (found: number): number => firstOn(found, PAGES_PER_BOOK) + LAST_ROWS - 1;

/** Les livres rares recensés (numéro → livre), tirés une fois par graine et par Catalogue. */
let cached: { key: string; rares: Map<number, string> } | null = null;

export const catalogueRares = (state: GameState): Map<number, string> => {
  const found = catalogueIndex(state);
  // Ceux qu'on avait le jour où on l'a trouvé (lui compris) : la suite en découle.
  const had = Object.keys(state.rareBooks).filter((id) => state.rareBooks[id] <= found);
  const chance = rareChance(state);
  const key = `${state.seed}:${found}:${chance}:${had.sort().join(',')}`;
  if (cached?.key === key) return cached.rares;
  const taken = new Set([...had, CATALOGUE_ID]);
  const rares = new Map<number, string>();
  for (let index = found + 1; index <= lastListed(found); index++) {
    const id = drawRareBook(index, (rare) => taken.has(rare), chance);
    if (!id) continue;
    rares.set(index, id);
    taken.add(id);
  }
  cached = { key, rares };
  return rares;
};

/** Les livres rares écrits sur la page `page` du registre. */
export const raresOn = (state: GameState, page: number): string[] => {
  if (page < REGISTER_PAGE) return [];
  const rares = catalogueRares(state);
  const first = firstOn(catalogueIndex(state), page);
  const ids: string[] = [];
  for (let index = first; index < first + rowsOn(page); index++) {
    const id = rares.get(index);
    if (id) ids.push(id);
  }
  return ids;
};

/** Pages du Catalogue à lire dans la bibliothèque pour le sceau secret (choix de l'auteur, 05/10/2026). */
export const CATALOGUE_PAGES = 20;

/**
 * Le joueur a vu la page `page` dans la bibliothèque. Au bout de vingt pages différentes, comme un enfant qui
 * feuillette le catalogue de jouets en décembre, un sceau secret (le nom d'avant, trueCatalogue, est gardé).
 */
export const readCatalogue = (state: GameState, page: number): void => {
  if (page < 1 || state.catalogueRead.includes(page)) return;
  state.catalogueRead.push(page);
  if (state.catalogueRead.length >= CATALOGUE_PAGES) sealEvent(state, 'trueCatalogue');
};
