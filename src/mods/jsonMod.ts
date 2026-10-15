import { registerMod } from './registry';
import { addModSeal, type ModText } from './modSeals';
import type { GameState } from '../core/state';

/** Les compteurs qu'un mod .json peut viser (plan des mods, §4) : tous ne font que monter. */
export const COUNTERS = {
  pagesRead: (state: GameState) => state.totalPagesRead,
  booksRead: (state: GameState) => state.booksFinished,
  clicks: (state: GameState) => state.stats.clicks,
  knowledge: (state: GameState) => state.lifetimeKnowledge,
  ether: (state: GameState) => state.etherReceived,
  playSeconds: (state: GameState) => state.stats.playSeconds,
  prestiges: (state: GameState) => state.exiles,
} satisfies Record<string, (state: GameState) => number>;

export type Counter = keyof typeof COUNTERS;

/** Un sceau d'un mod .json : atteint quand chaque compteur de `when` arrive à sa valeur. */
interface JsonSeal {
  id: string;
  name: ModText;
  text: ModText;
  when: Partial<Record<Counter, number>>;
}

const isCounter = (name: string): name is Counter => name in COUNTERS;

/** La condition d'un sceau : null si elle est vide ou vise un compteur inconnu. */
const condition = (when: unknown): ((state: GameState) => boolean) | null => {
  if (!when || typeof when !== 'object') return null;
  const goals = Object.entries(when as Record<string, unknown>);
  if (goals.length === 0 || goals.some(([name, value]) => !isCounter(name) || typeof value !== 'number')) return null;
  return (state) => goals.every(([name, value]) => COUNTERS[name as Counter](state) >= (value as number));
};

/**
 * Un mod en données, sans code (plan des mods, §1) : son nom, et ses sceaux. Un sceau mal formé est sauté (dit dans la
 * console) ; le mod est refusé (false) sans nom, ou si son nom est déjà pris.
 */
export const readJsonMod = (state: GameState, data: unknown): boolean => {
  const mod = data as { id?: unknown; seals?: unknown };
  if (!mod || typeof mod.id !== 'string' || !registerMod(state, mod.id, {})) return false;
  for (const seal of Array.isArray(mod.seals) ? (mod.seals as JsonSeal[]) : []) {
    const reached = condition(seal?.when);
    if (!reached || !addModSeal(mod.id, { ...seal, reached }))
      console.error(`[Idle Babel] mod « ${mod.id} » : sceau « ${String(seal?.id)} » mal formé, sauté.`);
  }
  return true;
};
