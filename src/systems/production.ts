import { taskReading } from './taskBonus';
import { DIGITAL_AGE, TOOLS, type ToolId } from '../data/tools';
import { gestureMultiplier } from './technologies';
import { digitalMultiplier, etherReading, readingMultiplier, storyMultiplier } from './etherium';
import { readingBoon } from './boons';
import { relicReading } from './relics';
import { mimicReading } from './mimic';
import { lotteryMethod, lotteryReading } from './lotteryEffects';
import { goldenEatsPages, goldenHere } from './goldenMimic';
import { hookProduct } from '../mods/hooks';
import { modded } from '../mods/quantities';
import type { GameState } from '../core/state';

/** Débogage : production imposée à la main, à la place de celle des méthodes (pas dans la sauvegarde). */
let forcedPagesPerSecond: number | undefined;
export const forcePagesPerSecond = (value: number | undefined): void => {
  forcedPagesPerSecond = value;
};
export const isForcingPagesPerSecond = (): boolean => forcedPagesPerSecond !== undefined;

/**
 * Ce qui multiplie la lecture de toutes les méthodes : la Lecture de l'Etherium, l'Éther reçu, la Transe de la lettre (en
 * cours), le Sablier (s'il agit), la Mimic qui la ralentit (si elle est là), le Rideau entier (×2), les bonus et malus de la Loterie et les mods (crochet `reading`, grandeur `reading`) ; et le Minitel,
 * pour celles de l'Âge Numérique. Calculés une fois pour toutes les méthodes (revue de code, 13/10).
 */
type Shared = { all: number; digital: number };
const shared = (state: GameState): Shared => ({
  all:
    readingMultiplier(state) *
    etherReading(state) *
    readingBoon(state) *
    relicReading(state) *
    mimicReading(state) *
    storyMultiplier(state) *
    lotteryReading(state) *
    taskReading(state) *
    hookProduct('reading') *
    modded('reading'),
  digital: digitalMultiplier(state),
});

const rateOf = (state: GameState, tool: (typeof TOOLS)[number], factors: Shared): number =>
  tool.pagesPerSecond *
  gestureMultiplier(state, tool.id) *
  (tool.age === DIGITAL_AGE ? factors.digital : 1) *
  factors.all *
  lotteryMethod(state, tool.id) *
  modded(`method:${tool.id}`);

/** Ce que lit une méthode, pour chaque exemplaire : sa base, doublée par son intuition à chaque niveau, × `shared`. */
export const toolRate = (state: GameState, id: ToolId): number =>
  rateOf(
    state,
    TOOLS.find((candidate) => candidate.id === id)!,
    shared(state),
  );

/** Production : celle de chaque méthode (toolRate). */
export const pagesPerSecond = (state: GameState): number => {
  if (forcedPagesPerSecond !== undefined) return forcedPagesPerSecond;
  const factors = shared(state);
  return TOOLS.reduce((total, tool) => total + state.tools[tool.id] * rateOf(state, tool, factors), 0);
};

/**
 * Ce qu'un ajout n'a pas pu compter : au-delà de ~10¹⁵ pages, un nombre à virgule ne distingue plus les
 * petites quantités (0,1 page ajoutée à 10¹⁵ ne change rien). On garde ce reste de côté et on le rajoute
 * aux ajouts suivants, jusqu'à ce qu'il compte : le compteur avance, même lentement, à toute échelle.
 */
const carry = { pages: 0, totalPagesRead: 0, pagesByMethods: 0 };

const addKeepingRest = (state: GameState, key: keyof typeof carry, amount: number): void => {
  const wanted = carry[key] + amount;
  const next = state[key] + wanted;
  carry[key] = wanted - (next - state[key]);
  state[key] = next;
};

/** Les pages remises à zéro (prestige) : leur reste d'avant ne s'y ajoute pas (il ferait −0,00000002 page). */
export const forgetPagesRest = (): void => {
  carry.pages = 0;
};

/** Toute page lue passe par ici : elle s'ajoute au stock et au total à vie, sauf si la Mimic dorée la mange. */
export const gainPages = (state: GameState, amount: number): void => {
  if (goldenEatsPages(state, amount)) return;
  addKeepingRest(state, 'pages', amount);
  addKeepingRest(state, 'totalPagesRead', amount);
};

/**
 * Fois où la production a fait passer le compteur de pages à l'entier suivant, depuis le chargement :
 * les pages qui tournent seules suivent ce nombre, pour tourner en même temps que le compteur change
 * (les clics et les achats, qui le changent aussi, n'en font pas partie).
 */
let producedWhole = 0;
export const producedWholePages = (): number => producedWhole;

/**
 * Ce que chaque méthode a lu pendant `seconds`, et toutes ensemble depuis toujours (leurs sceaux) ; rien quand
 * le débogage impose la production, ou que la Mimic dorée mange tout.
 */
export const creditMethods = (state: GameState, seconds: number): void => {
  // La Mimic dorée mange ce qu'elles lisent : rien n'est compté.
  if (forcedPagesPerSecond !== undefined || goldenHere(state)) return;
  const factors = shared(state);
  for (const tool of TOOLS) {
    const read = state.tools[tool.id] * rateOf(state, tool, factors) * seconds;
    if (read <= 0) continue;
    state.methodPages[tool.id] = (state.methodPages[tool.id] ?? 0) + read;
    addKeepingRest(state, 'pagesByMethods', read);
  }
};

export const produce = (state: GameState, seconds: number): void => {
  const before = Math.floor(state.pages);
  gainPages(state, pagesPerSecond(state) * seconds);
  creditMethods(state, seconds);
  producedWhole += Math.max(0, Math.floor(state.pages) - before);
};
