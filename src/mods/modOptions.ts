import type { GameState } from '../core/state';
import type { ModText } from './modSeals';

/**
 * Les options d'un mod (idée de l'auteur, 15/10 ; .ai/plan-better-babel.md §3 bis) : le mod les déclare dans
 * registerMod (`options`), le cahier les montre sur une page à lui, la partie les garde (state.modOptions, export
 * compris) et le mod est prévenu quand elles changent (`onOptions`).
 */

/** Une option : un choix parmi plusieurs (`choices`), ou sans `choices`, une case à cocher. */
export interface ModOption {
  id: string;
  name: ModText;
  /** La ligne au crayon sous une case. */
  hint?: ModText;
  choices?: { id: string; name: ModText }[];
  /** L'id d'un choix, ou pour une case true / false. */
  default: string | boolean;
  /** L'id d'une case du même mod : décochée, cette option est grisée au cahier (elle ne sert plus). */
  needs?: string;
}

export type ModOptionValues = Record<string, string | boolean>;

/** Un mod qui a des options : leur liste, sa version, et qui prévenir. */
export interface ModWithOptions {
  id: string;
  version?: string;
  options: ModOption[];
  changed?: (values: ModOptionValues) => void;
}

const withOptions: ModWithOptions[] = [];

const isOption = (option: unknown): option is ModOption => {
  const o = option as ModOption;
  if (!o || typeof o.id !== 'string' || !o.id || o.name === undefined) return false;
  if (o.choices === undefined) return typeof o.default === 'boolean';
  return Array.isArray(o.choices) && o.choices.length > 0 && o.choices.every((c) => c && typeof c.id === 'string');
};

/** La valeur gardée si elle vaut encore quelque chose (option retirée, choix renommé : le défaut). */
const valid = (option: ModOption, value: unknown): string | boolean => {
  if (option.choices) {
    if (option.choices.some((choice) => choice.id === value)) return value as string;
    return option.choices.some((choice) => choice.id === option.default) ? option.default : option.choices[0].id;
  }
  return typeof value === 'boolean' ? value : (option.default as boolean);
};

/** Les valeurs d'un mod, chacune à son défaut si elle manque ou ne vaut plus rien. */
export const modOptionValues = (state: GameState, mod: string): ModOptionValues => {
  const options = withOptions.find((other) => other.id === mod)?.options ?? [];
  const saved = state.modOptions[mod] ?? {};
  return Object.fromEntries(options.map((option) => [option.id, valid(option, saved[option.id])]));
};

/** IdleBabel.option(mod, id) : une valeur, n'importe quand ; undefined pour une option inconnue. */
export const modOption = (state: GameState, mod: string, id: string): string | boolean | undefined => modOptionValues(state, mod)[id];

const tell = (state: GameState, mod: ModWithOptions): void => {
  try {
    mod.changed?.(modOptionValues(state, mod.id));
  } catch (error) {
    console.error(`[Idle Babel] mod « ${mod.id} », onOptions :`, error);
  }
};

/** À l'enregistrement d'un mod (registry.ts) : ses options valables (une mal formée est sautée), puis `onOptions`. */
export const declareModOptions = (
  state: GameState,
  id: string,
  options: unknown,
  version?: string,
  changed?: (values: ModOptionValues) => void,
): void => {
  if (!Array.isArray(options)) return;
  const kept = options.filter((option) => {
    if (isOption(option)) return true;
    console.error(`[Idle Babel] mod « ${id} » : option « ${String((option as ModOption)?.id)} » mal formée, sautée.`);
    return false;
  });
  if (kept.length === 0) return;
  const mod: ModWithOptions = { id, version, options: kept, changed: typeof changed === 'function' ? changed : undefined };
  withOptions.push(mod);
  tell(state, mod);
};

/** Le cahier change une option : gardée dans la partie, le mod prévenu. */
export const setModOption = (state: GameState, mod: string, id: string, value: string | boolean): void => {
  const found = withOptions.find((other) => other.id === mod);
  if (!found) return;
  state.modOptions[mod] = { ...state.modOptions[mod], [id]: value };
  tell(state, found);
};

/** Les mods actifs qui ont des options, dans l'ordre de leur chargement : une page du cahier chacun. */
export const modsWithOptions = (): readonly ModWithOptions[] => withOptions;

/** Tests : plus aucune option. */
export const clearModOptions = (): void => {
  withOptions.length = 0;
};
