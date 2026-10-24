import { getLocale, t } from '../../i18n';
import { formatCount, formatNumber, writeDigits } from '../../core/format';
import { AUTOMATIC_AGE, DIGITAL_AGE, QUANTUM_AGE, TOOLS } from '../../data/tools';
import { automaticAgeMultiplier, digitalAgeMultiplier, tomeKnowledgeMultiplier } from '../../systems/endings';
import { FLAIR_LEVELS } from '../../data/technologies';
import { filterMultiplier, gestureMultiplier, levelOf, rareChance, toolPriceFactor, clickShare } from '../../systems/technologies';
import {
  boonLengthFactor,
  agePageMultiplier,
  digitalMultiplier,
  etherReading,
  findsMultiplier,
  handFindsMultiplier,
  handsMultiplier,
  knowledgePerFind,
  letterWaitFactor,
  rareMultiplier,
  readingMultiplier,
  firstAgeMultiplier,
  quantumMultiplier,
} from '../../systems/etherium';
import { clickBoon, findsBoon, fourTen, knowledgeBoon, priceBoon, readingBoon } from '../../systems/boons';
import { sealFindMultiplier } from '../../systems/seals';
import { relicKnowledge, relicLetterWait, relicReading } from '../../systems/relics';
import { mimicReading } from '../../systems/mimic';
import { lotteryMethod, lotteryReading } from '../../systems/lotteryEffects';
import { hookProduct } from '../../mods/hooks';
import { modded } from '../../mods/quantities';
import { relicName } from '../relics/relicText';
import { pagesPerSecond } from '../../systems/production';
import { clickParts, pagesPerClick } from '../../systems/click';
import { findChance, findKnowledge } from '../../systems/knowledge';
import { nextRareChance } from '../../systems/rareBooks';
import { RARE_BOOKS } from '../../data/rareBooks';
import { boonLength, letterWait, understoodFactor, watchFactor } from '../../systems/letter';
import type { Figure } from './chapters';
import type { GameState } from '../../core/state';

/**
 * Le chapitre « Bonus » du Grand Livre (demande de l'auteur, 17/10, après le +15 % des tomes de « L'histoire de
 * Babel ») : tout ce qui multiplie quelque chose, rangé sous ce que ça booste (la lecture des méthodes, un clic, les
 * trouvailles…). Une ligne par source, seulement quand elle agit (×1 : rien à dire) ; les malus aussi (la Mimic, la
 * Loterie), puisqu'ils se multiplient avec le reste.
 */

/** ×1,05 · ×0,98 · ×410 · ×1,2e12 : deux décimales tant que le facteur est petit (sinon un sceau ferait ×1). */
export const boost = (value: number): string =>
  `×${value < 1000 ? writeDigits(new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(value)) : formatNumber(value, getLocale())}`;
const plusPercent = (value: number): string =>
  `+${writeDigits(new Intl.NumberFormat(getLocale(), { style: 'percent', maximumFractionDigits: 2 }).format(value))}`;

/**
 * Ce que lisent les méthodes d'elles-mêmes, avec leurs intuitions, avec en plus le Minitel pour celles de l'Âge Numérique,
 * puis les tomes pour celles de leur Âge : les intuitions, le Minitel et le tome en moyenne, pesés par ce que lit chacune. La décomposition de la vitesse de lecture
 * (chapters.ts) s'en sert aussi.
 */
/** Ce que les tomes font lire de plus à une méthode : le tome 1 au premier Âge, le tome 2 à l'Âge Automatique, le tome 3 à l'Âge Numérique. */
const storyFactor = (state: GameState, tool: (typeof TOOLS)[number]): number =>
  tool.age === undefined
    ? firstAgeMultiplier(state)
    : tool.age === AUTOMATIC_AGE
      ? automaticAgeMultiplier(state)
      : tool.age === DIGITAL_AGE
        ? digitalAgeMultiplier(state)
        : 1;

/**
 * `digital` : avec la page de l'Etherium de leur Âge (le Minitel, le Lustre) ; `minitel` et `chandelier` : avec l'une des deux
 * seulement, pour la ligne de chacune.
 */
export const methodReading = (
  state: GameState,
): { base: number; gestures: number; digital: number; minitel: number; chandelier: number; story: number } => {
  const rate = (tool: (typeof TOOLS)[number]): number => state.tools[tool.id] * tool.pagesPerSecond * gestureMultiplier(state, tool.id);
  const pageRate = (tool: (typeof TOOLS)[number]): number => rate(tool) * agePageMultiplier(state, tool.age);
  const sum = (of: (tool: (typeof TOOLS)[number]) => number): number => TOOLS.reduce((total, tool) => total + of(tool), 0);
  return {
    base: sum((tool) => state.tools[tool.id] * tool.pagesPerSecond),
    gestures: sum(rate),
    digital: sum(pageRate),
    minitel: sum((tool) => rate(tool) * (tool.age === DIGITAL_AGE ? digitalMultiplier(state) : 1)),
    chandelier: sum((tool) => rate(tool) * (tool.age === QUANTUM_AGE ? quantumMultiplier(state) : 1)),
    story: sum((tool) => pageRate(tool) * storyFactor(state, tool)),
  };
};
const gestures = (state: GameState): number => {
  const { base, gestures: read } = methodReading(state);
  return base > 0 ? read / base : 1;
};
/** Le Minitel ne fait lire plus vite que les méthodes de l'Âge Numérique : sa part de toute la lecture. */
const digitalShare = (state: GameState): number => {
  const { gestures: read, minitel } = methodReading(state);
  return read > 0 ? minitel / read : 1;
};
/** De même, le Lustre pour les méthodes de l'Âge Quantique. */
const quantumShare = (state: GameState): number => {
  const { gestures: read, chandelier } = methodReading(state);
  return read > 0 ? chandelier / read : 1;
};
/** Les tomes de « L'histoire de Babel » ne font lire plus vite que les méthodes de leur Âge : leur part de toute la lecture. */
export const storyShare = (state: GameState): number => {
  const { digital, story } = methodReading(state);
  return digital > 0 ? story / digital : 1;
};

/**
 * Ce que fait au clic entier un facteur qui ne multiplie que la feuille (l'Éther, le Sablier, Quatre cent dix) : la part de la
 * production d'une seconde, elle, ne bouge pas (revue de code, 17/10).
 */
const onLeaf = (state: GameState, factor: number): number => {
  const { leaf, share } = clickParts(state);
  return leaf + share > 0 ? (leaf + share) / (leaf / factor + share) : factor;
};

const flair = (state: GameState): number => FLAIR_LEVELS[0] / FLAIR_LEVELS[Math.min(levelOf(state, 'flair'), FLAIR_LEVELS.length - 1)];

type Group = 'reading' | 'click' | 'finds' | 'knowledge' | 'rare' | 'price' | 'letterWait' | 'boonLength';

/** Un facteur : la ligne paraît dès qu'il n'est plus ×1. */
const factorRow = (group: Group, id: string, caption: string, value: (state: GameState) => number): Figure => ({
  id,
  caption,
  value: (s) => boost(value(s)),
  shown: (s) => Math.abs(value(s) - 1) > 1e-9,
  row: true,
  group,
});

/** Un ajout (+5 %, +3) : la ligne paraît dès qu'il n'est plus nul. */
const addRow = (
  group: Group,
  id: string,
  caption: string,
  value: (state: GameState) => number,
  write: (value: number) => string,
): Figure => ({
  id,
  caption,
  value: (s) => write(value(s)),
  shown: (s) => value(s) > 0,
  row: true,
  group,
});

export const BONUS_FIGURES: Figure[] = [
  factorRow('reading', 'readingIntuitions', 'tedu ralvi', gestures),
  factorRow('reading', 'readingEtherium', 'etra lomi', readingMultiplier),
  factorRow('reading', 'readingDigital', 'etra numel', digitalShare),
  factorRow('reading', 'readingQuantum', 'etra lustra', quantumShare),
  factorRow('reading', 'readingEther', 'etra dulvo', etherReading),
  factorRow('reading', 'readingStory', 'vuntal babel', storyShare),
  factorRow('reading', 'readingLetter', 'lettra vimo', readingBoon),
  { ...factorRow('reading', 'readingRelic', 'relva sablo', relicReading), label: () => relicName('hourglass') },
  factorRow('reading', 'readingLottery', 'lotra fesk', (s) => lotteryReading(s)),
  // Le bonus ×10 ou la méthode arrêtée de la Loterie : une ligne par méthode touchée.
  ...TOOLS.map((tool): Figure => ({
    ...factorRow('reading', `lotteryMethod.${tool.id}`, 'lotra hesmo', (s) => lotteryMethod(s, tool.id)),
    label: () => t('strangeBook.bonuses.lotteryMethod').replace('{method}', t(`tools.${tool.id}.name`)),
  })),
  factorRow('reading', 'readingMimic', 'mimra dolt', mimicReading),
  factorRow('reading', 'readingMods', 'modo vel', () => hookProduct('reading') * modded('reading')),

  addRow('click', 'clickShare', 'zo selim mao', clickShare, plusPercent),
  factorRow('click', 'clickEtherium', 'etra mano', handsMultiplier),
  factorRow('click', 'clickEther', 'etra dulvo', (s) => onLeaf(s, etherReading(s))),
  { ...factorRow('click', 'clickRelic', 'relva sablo', (s) => onLeaf(s, relicReading(s))), label: () => relicName('hourglass') },
  factorRow('click', 'clickLetter', 'lettra vimo', (s) => clickBoon() * onLeaf(s, fourTen())),
  factorRow('click', 'clickMods', 'modo vel', () => hookProduct('click') * modded('click')),

  factorRow('finds', 'findIntuitions', 'tedu ralvi', filterMultiplier),
  factorRow('finds', 'findSeals', 'sigil varno', sealFindMultiplier),
  factorRow('finds', 'findEtherium', 'etra lupa', findsMultiplier),
  factorRow('finds', 'findHand', 'etra anel', handFindsMultiplier),
  factorRow('finds', 'findLetter', 'lettra vimo', () => findsBoon()),
  factorRow('finds', 'findMods', 'modo vel', () => modded('findChance')),

  factorRow('knowledge', 'knowledgeEtherium', 'etra semav', knowledgePerFind),
  factorRow('knowledge', 'knowledgeLetter', 'lettra vimo', () => knowledgeBoon()),
  factorRow('knowledge', 'knowledgeStory', 'vuntal babel', tomeKnowledgeMultiplier),
  {
    ...addRow('knowledge', 'knowledgeRelic', 'relva lupa', relicKnowledge, (value) => writeDigits(`+${formatNumber(value, getLocale())}`)),
    label: () => relicName('loupe'),
  },
  factorRow('knowledge', 'knowledgeMods', 'modo vel', () => modded('knowledge')),

  factorRow('rare', 'rareIntuitions', 'tedu ralvi', flair),
  factorRow('rare', 'rareEtherium', 'etra lupa', rareMultiplier),
  factorRow('rare', 'rareMods', 'modo vel', () => modded('rareChance')),

  factorRow('price', 'priceIntuitions', 'tedu ralvi', toolPriceFactor),
  factorRow('price', 'priceLetter', 'lettra vimo', () => priceBoon()),
  factorRow('price', 'priceMods', 'modo vel', () => modded('methodCost')),

  factorRow('letterWait', 'letterWaitIntuitions', 'tedu ralvi', watchFactor),
  factorRow('letterWait', 'letterWaitEtherium', 'etra pluma', letterWaitFactor),
  {
    ...factorRow('letterWait', 'letterWaitRelic', 'relva astro', relicLetterWait),
    label: () => relicName('astrolabe'),
  },
  factorRow('letterWait', 'letterWaitMods', 'modo vel', () => modded('letterWait')),

  factorRow('boonLength', 'boonLengthIntuitions', 'tedu ralvi', understoodFactor),
  factorRow('boonLength', 'boonLength', 'etra pluma dur', boonLengthFactor),
  factorRow('boonLength', 'boonLengthMods', 'modo vel', () => modded('boonLength')),
];

const minutes = (seconds: number): string =>
  writeDigits(new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 1 }).format(seconds / 60));

/**
 * Sous chaque sous-titre, ce que ça donne en ce moment, tous bonus compris (demande de l'auteur, 17/10 : « pour donner un
 * ordre d'idée ») : les pages par seconde, d'un clic, la chance de trouvaille… Illisible : le nombre seul.
 */
const GROUP_VALUES: Record<Group, (state: GameState) => Record<string, string>> = {
  reading: (s) => ({ n: formatCount(pagesPerSecond(s), getLocale()) }),
  click: (s) => ({ n: formatCount(pagesPerClick(s), getLocale()) }),
  finds: (s) => ({
    n: writeDigits(new Intl.NumberFormat(getLocale(), { style: 'percent', maximumSignificantDigits: 3 }).format(findChance(s))),
  }),
  knowledge: (s) => ({ n: formatNumber(findKnowledge(s), getLocale()) }),
  rare: (s) => ({ n: formatNumber(Math.round(1 / nextRareChance(Object.keys(s.rareBooks).length, rareChance(s))), getLocale()) }),
  price: (s) => ({ n: boost(toolPriceFactor(s) * priceBoon() * modded('methodCost')) }),
  letterWait: (s) => {
    const { min, max } = letterWait(s);
    return { min: minutes(min), max: minutes(max) };
  },
  boonLength: (s) => ({ n: boost(boonLength(s)) }),
};

export const groupValue = (state: GameState, group: string, readable: boolean): string => {
  const values = GROUP_VALUES[group as Group](state);
  if (!readable) return Object.values(values).join(' · ');
  // Tous les livres rares trouvés : plus de chance à dire.
  if (group === 'rare' && Object.keys(state.rareBooks).length >= RARE_BOOKS.length) return t('strangeBook.figures.rareAll');
  return Object.entries(values).reduce((text, [key, value]) => text.replace(`{${key}}`, value), t(`strangeBook.groupValues.${group}`));
};

/** Le chapitre paraît dès qu'un bonus agit. */
export const anyBonus = (state: GameState): boolean => BONUS_FIGURES.some((figure) => figure.shown?.(state));
