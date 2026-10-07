import { ETHER_PAGES } from '../data/etherium';
import { SENTENCES } from '../data/sentences';
import { TOOLS } from '../data/tools';
import { recordOnce } from '../core/history';
import { forgetIntuitions } from './reminiscence';
import { forgetPagesRest } from './production';
import { giftsFilter, keepsFirstLevels, keptMethodSentences, openDoor } from './etherium';
import { levelOf, maxLevel } from './technologies';
import { segments, write } from './sentences';
import type { GameState } from '../core/state';

/**
 * Le prestige (conception §4.1) : le chercheur ouvre l'Etherium, le livre qui se nourrit des pages lues ; le sol se
 * dérobe, et quand il rouvre les yeux, ses pages l'attendent. Il y dépense l'Éther que valent les pages lues depuis toujours.
 */

/** L'Éther que méritent les pages lues depuis toujours : floor(∛(pages / 1 Md)). */
export const etherDeserved = (state: GameState): number => Math.floor(Math.cbrt(state.totalPagesRead / ETHER_PAGES));

/** Ce que rapporterait le prestige maintenant. */
export const prestigeGain = (state: GameState): number => Math.max(0, etherDeserved(state) - state.etherReceived);

/** L'Etherium peut s'ouvrir : le prestige rapporte au moins 1 Éther, et ses pages ne sont pas déjà ouvertes. */
export const prestigeReady = (state: GameState): boolean => prestigeGain(state) >= 1 && !state.etheriumInHand;

/** Pages lues à vie qu'il faut pour l'Éther suivant (le n-ième en demande n³ milliards). */
export const nextEtherPages = (state: GameState): number => (etherDeserved(state) + 1) ** 3 * ETHER_PAGES;

/** Où en est l'Éther suivant, de 0 à 1 : depuis les pages du dernier Éther mérité. */
export const nextEtherProgress = (state: GameState): number => {
  const from = etherDeserved(state) ** 3 * ETHER_PAGES;
  return Math.min(1, Math.max(0, (state.totalPagesRead - from) / (nextEtherPages(state) - from)));
};

/**
 * Le prestige : l'Éther mérité est reçu, et tout ce que le chercheur avait en main est perdu (pages, méthodes,
 * Connaissance, intuitions, phrases des méthodes que la Mémoire ne garde pas). Restent les pages à vie, les sceaux,
 * les livres rares, le reste du livre blanc, l'Éther et les étoiles de l'Etherium, et ce que celles-ci donnent au réveil
 * (la Porte, et les phrases des méthodes qu'elle donne ; l'Aigrette gauche, le Reflet). Il se réveille l'Etherium en main.
 * Renvoie l'Éther reçu (rien si le prestige ne rapporte pas encore).
 */
export const prestige = (state: GameState, now = Date.now()): number => {
  const gain = prestigeGain(state);
  if (gain < 1) return 0;
  state.etherReceived += gain;
  state.ether += gain;
  state.exiles += 1;
  const previous = { tools: { ...state.tools }, pages: state.totalPagesRead - state.wake.pages, knowledge: state.cycleKnowledge };
  const levels = { ...state.technologies };
  state.pages = 0;
  forgetPagesRest();
  state.tools = Object.fromEntries(TOOLS.map((tool) => [tool.id, 0])) as GameState['tools'];
  state.methodPages = {};
  state.knowledge = 0;
  state.cycleKnowledge = 0;
  openDoor(state, previous);
  forgetIntuitions(state);
  if (keepsFirstLevels(state))
    for (const [id, level] of Object.entries(levels) as [keyof typeof levels, number][])
      if (level > 0) state.technologies[id] = Math.max(1, levelOf(state, id));
  if (giftsFilter(state)) {
    state.technologies.semanticFilter = Math.min(maxLevel('semanticFilter'), levelOf(state, 'semanticFilter') + 1);
    state.technologiesBest.semanticFilter = Math.max(state.technologiesBest.semanticFilter ?? 0, state.technologies.semanticFilter);
  }
  state.wake = { pages: state.totalPagesRead, book: state.booksFinished + 1 };
  const kept = keptMethodSentences(state);
  for (const sentence of SENTENCES) if (sentence.kind === 'method' && !kept.includes(sentence.id)) delete state.written[sentence.id];
  // Une méthode donnée par la Porte se retrouve aussitôt : sa phrase s'écrit, son intuition peut se comprendre.
  for (const sentence of SENTENCES)
    if (sentence.kind === 'method' && sentence.tool && state.tools[sentence.tool] > 0)
      write(
        state,
        sentence.id,
        segments(sentence.id).map((_, index) => index),
      );
  state.etheriumInHand = true;
  recordOnce(state, 'prestige', String(state.exiles), now);
  return gain;
};

/** L'Etherium refermé : il retourne sur la pile, et ne se rouvre plus avant le prochain prestige. */
export const closeEtherium = (state: GameState): void => {
  state.etheriumInHand = false;
};
