import { isHookName, registerHook, type Hooks } from './hooks';
import { registerMod, type ModDef } from './registry';
import { loadMod } from './loader';
import { notify } from './notify';
import { replaceHeldBook, type HeldBookFactory } from './heldBook';
import { addModSeal, type ModSealInput } from './modSeals';
import { addModTask, type ModTaskInput } from './modTasks';
import { modOption } from './modOptions';
import { modGame, type ModGame } from './game';
import { modify, tune } from './quantities';
import { formatNumber } from '../core/format';
import { getLocale } from '../i18n';
import type { GameState } from '../core/state';

/** Ce qu'un mod trouve dans `window.IdleBabel` (l'équivalent de `Game` dans Cookie Clicker). */
export interface IdleBabelApi {
  /** La partie, lisible et modifiable : à vos risques. */
  readonly state: GameState;
  /** Ce que le jeu calcule (production, prix, Éther, lettre, Mimic), en lecture seule : les vraies formules. */
  readonly game: ModGame;
  /** `fr` ou `en`. */
  readonly locale: string;
  registerMod: (id: string, mod: ModDef) => boolean;
  registerHook: <N extends keyof Hooks>(name: N, hook: Hooks[N]) => void;
  loadMod: (address: string) => Promise<boolean>;
  notify: (title: string, text?: string) => void;
  addSeal: (seal: ModSealInput) => boolean;
  /** Une tâche à vous, au bout de la liste « Une seule fois » du livre blanc (src/mods/modTasks.ts). */
  addTask: (task: ModTaskInput) => boolean;
  format: (value: number) => string;
  /** Remplace le livre en main (livres ordinaires seulement) par la vue que rend `factory`. */
  replaceHeldBook: (factory: HeldBookFactory) => void;
  /** La valeur d'une option d'un mod (registerMod `options`), réglée au cahier ; undefined si elle n'existe pas. */
  option: (mod: string, id: string) => string | boolean | undefined;
  /**
   * Change une grandeur du jeu (src/mods/quantities.ts) : un facteur (×) ou un ajout (+), selon elle ; une fonction,
   * appelée à chaque calcul, ou un nombre fixe. Rend false si la grandeur n'existe pas.
   */
  modify: (name: string, value: number | (() => number)) => boolean;
  /** Règle une règle de base du jeu (`costGrowth`, `methodGate`, `etherPages`) ; false si elle n'existe pas ou hors bornes. */
  tune: (name: string, value: number) => boolean;
}

declare global {
  interface Window {
    IdleBabel?: IdleBabelApi;
  }
}

/**
 * Pose `window.IdleBabel` (plan des mods, §2) avant le chargement du premier mod. Ses sceaux (`addSeal`) prennent le
 * nom du mod qui les ajoute, celui en cours d'enregistrement (son `init`) ou le dernier enregistré.
 */
export const mountModApi = (state: GameState): IdleBabelApi => {
  let lastMod = 'mod';
  const api: IdleBabelApi = {
    state,
    game: modGame(state),
    get locale() {
      return getLocale();
    },
    registerMod: (id, mod) => {
      const previous = lastMod;
      lastMod = id;
      const registered = registerMod(state, id, mod ?? {});
      if (!registered) lastMod = previous;
      return registered;
    },
    registerHook: (name, hook) => {
      if (!isHookName(name) || typeof hook !== 'function') {
        console.error(`[Idle Babel] crochet inconnu : « ${String(name)} ».`);
        return;
      }
      registerHook(name, hook);
    },
    loadMod: (address) => loadMod(state, String(address)),
    notify,
    addSeal: (seal) => addModSeal(lastMod, seal),
    addTask: (task) => addModTask(lastMod, task),
    format: (value) => formatNumber(value, getLocale(), state.settings.notation),
    replaceHeldBook,
    option: (mod, id) => modOption(state, String(mod), String(id)),
    modify: (name, value) => {
      const done = modify(String(name), typeof value === 'number' ? () => value : value);
      if (!done) console.error(`[Idle Babel] grandeur inconnue, ou pas une fonction : « ${String(name)} ».`);
      return done;
    },
    tune: (name, value) => {
      const done = tune(String(name), value);
      if (!done) console.error(`[Idle Babel] règle inconnue, ou valeur hors bornes : « ${String(name)} » = ${String(value)}.`);
      return done;
    },
  };
  window.IdleBabel = api;
  return api;
};
