import { ETHER_PAGES } from '../data/etherium';
import { SENTENCES } from '../data/sentences';
import { TOOLS } from '../data/tools';
import { recordOnce } from '../core/history';
import { forgetIntuitions } from './reminiscence';
import { resetGearTurn } from './gear';
import { forgetPagesRest } from './production';
import { forgetBoons } from './boons';
import { giftsFilter, keepsFirstLevels, keptMethodSentences, openDoor, starAffordable } from './etherium';
import { KEEPS } from '../data/etheriumStars';
import { levelOf, maxLevel } from './technologies';
import { sealEvent } from './seals';
import { catchMimic } from './mimic';
import { tasksAfterPrestige } from './tasks';
import { curiosityEther } from './curiosityEffects';
import { atelierOpen, emptyCart } from './curiosities';
import { runHooks } from '../mods/hooks';
import { rule } from '../mods/quantities';
import type { GameState } from '../core/state';

/**
 * Le prestige (conception §4.1) : le chercheur nourrit l'Etherium, le livre qui se nourrit des pages lues ; le sol se
 * dérobe, et quand il rouvre les yeux, ses pages l'attendent. Il y dépense l'Éther que valent les pages lues depuis toujours,
 * jusqu'à ce qu'il le referme ; le reste du temps, le livre se consulte seulement (l'auteur, 14/10).
 */

/** Pages lues à vie pour le premier Éther : ETHER_PAGES, ou ce qu'a réglé un mod (`etherPages`). */
export const etherPages = (): number => rule('etherPages', ETHER_PAGES);

/** L'Éther que méritent les pages lues depuis toujours : floor(∛(pages / 1 Md)). */
export const etherDeserved = (state: GameState): number => Math.floor(Math.cbrt(state.totalPagesRead / etherPages()));

/** Ce que rapporterait le prestige maintenant. */
export const prestigeGain = (state: GameState): number => Math.max(0, etherDeserved(state) - state.etherReceived);

/**
 * L'Éther en plus que donne l'atelier pour un gain (les curiosités d'Éther du lutrin, le pilon) : ce qui en est entier, et le
 * reste, gardé pour le prestige d'après (rien ne se perd).
 */
export const atelierEther = (state: GameState, gain: number): { whole: number; rest: number } => {
  const raw = gain * curiosityEther(state) + (gain >= 1 ? state.atelier.etherRest : 0);
  return { whole: Math.floor(raw), rest: raw - Math.floor(raw) };
};

/** Ce que rapporterait le prestige maintenant, l'Éther de l'atelier compris (il ne compte pas dans l'Éther reçu). */
export const prestigeEther = (state: GameState): number => {
  const gain = prestigeGain(state);
  return gain + atelierEther(state, gain).whole;
};

/** Le livre violet luit : le prestige rapporte au moins 1 Éther, et l'Éther ne se dépense pas déjà. */
export const prestigeReady = (state: GameState): boolean => prestigeGain(state) >= 1 && !state.etheriumInHand;

/** L'Éther se dépense : juste après un prestige, tant que l'Etherium n'est pas refermé. */
export const etherSpendable = (state: GameState): boolean => state.etheriumInHand;

/**
 * Le nourrir encore : le prestige ne rapporte rien, mais l'Éther en réserve allume une étoile. Le prix d'une partie pour le
 * dépenser (l'auteur, 14/10).
 */
export const feedAgainReady = (state: GameState): boolean =>
  !state.etheriumInHand && prestigeGain(state) < 1 && state.etherReceived > 0 && starAffordable(state);

/** Le bouton sous l'Éther : le nourrir rapporte, ou le nourrir encore permet de dépenser. */
export const feedReady = (state: GameState): boolean => prestigeGain(state) >= 1 || feedAgainReady(state);

/** L'Etherium s'ouvre (se consulte) dès le premier Éther, reçu ou à recevoir ; avant, sa couverture résiste. */
export const etheriumOpens = (state: GameState): boolean => state.etherReceived > 0 || prestigeGain(state) >= 1;

/** Pages lues à vie qu'il faut pour l'Éther suivant (le n-ième en demande n³ milliards). */
export const nextEtherPages = (state: GameState): number => (etherDeserved(state) + 1) ** 3 * etherPages();

/** Où en est l'Éther suivant, de 0 à 1 : depuis les pages du dernier Éther mérité. */
export const nextEtherProgress = (state: GameState): number => {
  const from = etherDeserved(state) ** 3 * etherPages();
  return Math.min(1, Math.max(0, (state.totalPagesRead - from) / (nextEtherPages(state) - from)));
};

/**
 * Le prestige : l'Éther mérité est reçu, et tout ce que le chercheur avait en main est perdu (pages, méthodes,
 * Connaissance, intuitions, phrases des méthodes que la Mémoire ne garde pas). Restent les pages à vie, les sceaux,
 * les livres rares, le reste du livre blanc, l'Éther et les étoiles de l'Etherium, et ce que celles-ci donnent au réveil
 * (la Porte, l'Aigrette gauche, le Reflet). Il se réveille l'Etherium en main.
 * Sans Éther à gagner, le nourrir encore (feedAgainReady) : la même chute, pour dépenser l'Éther en réserve ; elle ne compte
 * pas comme un prestige (ni le compte, ni l'histoire, ni le sceau « sans les mains »).
 * Renvoie l'Éther reçu (0 aussi quand rien ne se passe : feedReady le dit avant).
 */
export const prestige = (state: GameState, now = Date.now()): number => {
  if (!feedReady(state)) return 0;
  const gain = prestigeGain(state);
  const counted = gain >= 1;
  // Toute une partie, depuis le dernier réveil, sans tourner une page à la main : un sceau secret.
  if (counted && state.wake.book >= 0 && state.stats.clicks === state.wake.clicks) sealEvent(state, 'noHands', now);
  // Une Mimic dans la salle est attrapée d'office : elle rend tout avant que la Connaissance reparte de zéro (décision de
  // l'auteur, 11/10).
  catchMimic(state, now);
  state.etherReceived += gain;
  state.ether += gain;
  if (counted) state.exiles += 1;
  // L'atelier (systems/curiosities.ts) : son Éther en plus (à dépenser, pas reçu : la lecture ne le compte pas, le prochain
  // prestige non plus) ; le pilon repart à zéro, le chariot se vide.
  if (counted && atelierOpen(state)) {
    const extra = atelierEther(state, gain);
    state.ether += extra.whole;
    state.atelier.etherRest = extra.rest;
    state.atelier.pulp = 0;
    emptyCart(state, Math.random);
  }
  const previous = { tools: { ...state.tools }, pages: state.totalPagesRead - state.wake.pages, knowledge: state.cycleKnowledge };
  const levels = { ...state.technologies };
  state.pages = 0;
  forgetPagesRest();
  // Les bonus de la lettre en cours s'éteignent avec la partie.
  forgetBoons();
  state.tools = Object.fromEntries(TOOLS.map((tool) => [tool.id, 0])) as GameState['tools'];
  state.methodPages = {};
  state.knowledge = 0;
  state.cycleKnowledge = 0;
  openDoor(state, previous);
  forgetIntuitions(state);
  resetGearTurn();
  if (keepsFirstLevels(state))
    for (const [id, level] of Object.entries(levels) as [keyof typeof levels, number][])
      if (level > 0) state.technologies[id] = Math.max(1, levelOf(state, id));
  if (giftsFilter(state)) {
    state.technologies.semanticFilter = Math.min(maxLevel('semanticFilter'), levelOf(state, 'semanticFilter') + 1);
    state.technologiesBest.semanticFilter = Math.max(state.technologiesBest.semanticFilter ?? 0, state.technologies.semanticFilter);
  }
  state.wake = { pages: state.totalPagesRead, book: state.booksFinished + 1, clicks: state.stats.clicks, stars: state.etherium.length };
  const kept = keptMethodSentences(state);
  // Une méthode secrète, elle, ne s'oublie jamais, sauf celle qu'une étoile de la Ruche garde (le Qubit, memory.q0).
  for (const sentence of SENTENCES)
    if (sentence.kind === 'method' && (!sentence.secret || KEEPS[sentence.id]) && !kept.includes(sentence.id))
      delete state.written[sentence.id];
  tasksAfterPrestige(state);
  state.etheriumInHand = true;
  if (counted) recordOnce(state, 'prestige', String(state.exiles), now);
  runHooks('prestige');
  return gain;
};

/** L'Etherium refermé : il retourne sur la pile ; ses étoiles ne s'allument plus avant le prochain prestige. */
export const closeEtherium = (state: GameState): void => {
  // Refermé sans y avoir allumé une étoile depuis le réveil : un sceau secret.
  if (state.etheriumInHand && state.etherium.length === state.wake.stars) sealEvent(state, 'emptyEtherium');
  state.etheriumInHand = false;
};
