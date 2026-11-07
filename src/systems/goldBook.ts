import { DUST_DIVISOR, GOLD_BOOK_STAR, READ_DIVISOR, READS_PER_DAY, TOME_SCORE, TREE, TREE_ROOT, type TreeEffects } from '../data/goldBook';
import { GOLD_BOOK_ON } from '../data/goldBookOn';
import { dayOf } from './dailyTasks';
import { creditMethods, gainPages, pagesPerSecond } from './production';
import { giveTome, nextTome } from './endings';
import type { GameState } from '../core/state';
import type { Run } from './goldBookRun';

/**
 * Le Livre d'or, ce qui reste d'une partie à l'autre (.ai/plan-livre-dor.md) : la poussière d'or, l'arbre, le record, les
 * lectures du jour. Une partie elle-même : systems/goldBookRun.ts. Pas de limite de parties, mais trois lectures par jour
 * (l'auteur, 02/11 : « rien de plus frustrant »).
 */

/** Le Sud de la Rose des vents est allumé : le livre s'ouvre (en débogage seulement pour l'instant, data/goldBookOn.ts). */
export const goldBookOpen = (state: GameState): boolean => GOLD_BOOK_ON && state.etherium.includes(GOLD_BOOK_STAR);

/** La case est achetée. */
export const caseGot = (state: GameState, id: string): boolean => state.goldBook.got.includes(id);

/** La case mère de chaque case de l'arbre. */
const PARENT: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(TREE).flatMap(([id, node]) => (node.kids ?? []).map((kid) => [kid, id])),
);

/** La case a paru : la première toujours, les autres quand leur mère est achetée. */
export const caseShown = (state: GameState, id: string): boolean => id === TREE_ROOT || caseGot(state, PARENT[id]);

export const canBuyCase = (state: GameState, id: string): boolean =>
  id in TREE && !caseGot(state, id) && caseShown(state, id) && state.goldBook.dust >= TREE[id].cost;

/** Achetée : sa poussière d'or dépensée, ses pousses paraissent. Renvoie false si elle ne pouvait pas l'être. */
export const buyCase = (state: GameState, id: string): boolean => {
  if (!canBuyCase(state, id)) return false;
  state.goldBook.dust -= TREE[id].cost;
  state.goldBook.got.push(id);
  return true;
};

/** Les effets des cases achetées qui s'ajoutent. */
export const treeSum = (state: GameState, key: keyof TreeEffects): number =>
  state.goldBook.got.reduce((sum, id) => sum + (TREE[id]?.fx[key] ?? 0), 0);

/** Ceux qui se multiplient (BABEL plus souvent, BABEL qui vaut plus). */
export const treeProduct = (state: GameState, key: 'word' | 'babel'): number =>
  state.goldBook.got.reduce((product, id) => product * (TREE[id]?.fx[key] ?? 1), 1);

/** Les lectures permises par jour. */
export const readsPerDay = (): number => READS_PER_DAY;

/** Les lectures qui restent aujourd'hui (remises à minuit, heure du joueur). */
export const readsLeft = (state: GameState, now = Date.now()): number =>
  readsPerDay() - (state.goldBook.readDay === dayOf(now) ? state.goldBook.reads : 0);

/** Les minutes de lecture d'un score : √score ÷ 4, plus ce qu'ajoute le Lecteur ; une au moins. */
export const readMinutes = (state: GameState, score: number): number =>
  Math.max(1, Math.round((Math.sqrt(score) / READ_DIVISOR) * (1 + treeSum(state, 'read'))));

/** La poussière d'or d'un score. */
export const dustFor = (score: number): number => Math.floor(score / DUST_DIVISOR);

/**
 * Une partie finie : comptée, le record, les mots écrits ; assez de points, le tome suivant de « L'histoire de Babel ».
 * Renvoie si c'est un record, et le tome gagné.
 */
export const endRun = (state: GameState, run: Run): { record: boolean; tome?: number } => {
  const book = state.goldBook;
  const record = run.score > book.best;
  book.games += 1;
  book.words += run.words;
  book.best = Math.max(book.best, run.score);
  const tome = run.score >= TOME_SCORE ? nextTome(state) : undefined;
  if (tome !== undefined) giveTome(state, tome, 'goldBook');
  return { record, ...(tome !== undefined ? { tome } : {}) };
};

/** « Le lire » : les minutes de lecture du score, d'un coup, au rythme du moment. Renvoie false s'il ne reste plus de lecture. */
export const readRun = (state: GameState, score: number, now = Date.now()): boolean => {
  if (score <= 0 || readsLeft(state, now) <= 0) return false;
  const seconds = readMinutes(state, score) * 60;
  gainPages(state, pagesPerSecond(state) * seconds);
  creditMethods(state, seconds);
  const book = state.goldBook;
  const today = dayOf(now);
  book.reads = (book.readDay === today ? book.reads : 0) + 1;
  book.readDay = today;
  return true;
};

/** « Nourrir l'arbre » : la poussière d'or du score. */
export const feedRun = (state: GameState, score: number): number => {
  const dust = dustFor(score);
  state.goldBook.dust += dust;
  return dust;
};
