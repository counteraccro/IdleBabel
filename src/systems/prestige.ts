import { ETHER_PAGES, ETHERIUM_TREES, type EtheriumTreeId } from '../data/etherium';
import { SENTENCES } from '../data/sentences';
import { TOOLS } from '../data/tools';
import { recordOnce } from '../core/history';
import { forgetIntuitions } from './reminiscence';
import { forgetPagesRest } from './production';
import type { GameState } from '../core/state';

/**
 * Le prestige (conception §4.1) : le chercheur tente d'attraper le livre qui flotte au centre du puits, tombe,
 * et se réveille ailleurs, l'Etherium en main. Il y dépense l'Éther que valent les pages lues depuis toujours.
 */

/** L'Éther que méritent les pages lues depuis toujours : floor(∛(pages / 1 Md)). */
export const etherDeserved = (state: GameState): number => Math.floor(Math.cbrt(state.totalPagesRead / ETHER_PAGES));

/** Ce que rapporterait le prestige maintenant. */
export const prestigeGain = (state: GameState): number => Math.max(0, etherDeserved(state) - state.etherReceived);

/** Le livre violet attend dans la pile : le prestige rapporte au moins 1 Éther, et l'Etherium n'est pas en main. */
export const prestigeReady = (state: GameState): boolean => prestigeGain(state) >= 1 && !state.etheriumInHand;

/** Pages lues à vie qu'il faut pour l'Éther suivant (le n-ième en demande n³ milliards). */
export const nextEtherPages = (state: GameState): number => (etherDeserved(state) + 1) ** 3 * ETHER_PAGES;

/** Où en est l'Éther suivant, de 0 à 1 : depuis les pages du dernier Éther mérité. */
export const nextEtherProgress = (state: GameState): number => {
  const from = etherDeserved(state) ** 3 * ETHER_PAGES;
  return Math.min(1, Math.max(0, (state.totalPagesRead - from) / (nextEtherPages(state) - from)));
};

const tree = (id: EtheriumTreeId) => ETHERIUM_TREES.find((candidate) => candidate.id === id)!;

/** Nœuds pris dans un arbre. */
export const nodesOf = (state: GameState, id: EtheriumTreeId): number => state.etherium[id] ?? 0;

/** Prix du nœud suivant d'un arbre, s'il en reste. */
export const nextNodeCost = (state: GameState, id: EtheriumTreeId): number | undefined => tree(id).costs[nodesOf(state, id)];

/** Ce que donne un arbre une fois `nodes` nœuds pris (les siens par défaut) ; `none` sans aucun. */
export const treeValue = (state: GameState, id: EtheriumTreeId, none: number, nodes = nodesOf(state, id)): number =>
  nodes === 0 ? none : tree(id).values[Math.min(nodes, tree(id).values.length) - 1];

/** Prend le nœud suivant d'un arbre, s'il y a assez d'Éther. Renvoie true s'il est pris. */
export const takeNode = (state: GameState, id: EtheriumTreeId): boolean => {
  const cost = nextNodeCost(state, id);
  if (cost === undefined || state.ether < cost) return false;
  state.ether -= cost;
  state.etherium[id] = nodesOf(state, id) + 1;
  return true;
};

// Ce que fait chaque arbre.

/** Lecture : les pages/s de toutes les méthodes. */
export const readingMultiplier = (state: GameState): number => treeValue(state, 'reading', 1);
/** Mains : les pages d'un clic. */
export const handsMultiplier = (state: GameState): number => treeValue(state, 'hands', 1);
/** Connaissance : ce que rapporte une trouvaille. */
export const knowledgePerFind = (state: GameState): number => treeValue(state, 'knowledge', 1);
/** Trouvailles : la chance de trouvaille. */
export const findsMultiplier = (state: GameState): number => treeValue(state, 'finds', 1);
/** Départ : Lectures Diagonales déjà là au réveil. */
export const startingDiagonals = (state: GameState): number => treeValue(state, 'start', 0);

/** Mémoire des méthodes : les phrases de méthode que le prestige laisse écrites (les premières de l'Âge Manuel). */
export const keptMethodSentences = (state: GameState): string[] =>
  SENTENCES.filter((sentence) => sentence.kind === 'method')
    .slice(0, treeValue(state, 'memory', 0))
    .map((sentence) => sentence.id);

/**
 * Le prestige : l'Éther mérité est reçu, et tout ce que le chercheur avait en main est perdu (pages, méthodes,
 * Connaissance, intuitions, phrases des méthodes que la Mémoire ne garde pas). Restent les pages à vie, les sceaux,
 * les livres rares, le reste du livre blanc, l'Éther et l'Etherium. Il se réveille l'Etherium en main.
 * Renvoie l'Éther reçu (rien si le prestige ne rapporte pas encore).
 */
export const prestige = (state: GameState, now = Date.now()): number => {
  const gain = prestigeGain(state);
  if (gain < 1) return 0;
  state.etherReceived += gain;
  state.ether += gain;
  state.exiles += 1;
  state.pages = 0;
  forgetPagesRest();
  state.tools = Object.fromEntries(TOOLS.map((tool) => [tool.id, 0])) as GameState['tools'];
  state.tools.diagonal = startingDiagonals(state);
  state.methodPages = {};
  state.knowledge = 0;
  state.cycleKnowledge = 0;
  forgetIntuitions(state);
  const kept = keptMethodSentences(state);
  for (const sentence of SENTENCES) if (sentence.kind === 'method' && !kept.includes(sentence.id)) delete state.written[sentence.id];
  state.etheriumInHand = true;
  recordOnce(state, 'prestige', String(state.exiles), now);
  return gain;
};

/** L'Etherium refermé : il disparaît de la pile, jusqu'au prochain prestige. */
export const closeEtherium = (state: GameState): void => {
  state.etheriumInHand = false;
};
