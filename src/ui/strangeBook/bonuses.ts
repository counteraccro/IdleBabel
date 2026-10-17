import { getLocale, t } from '../../i18n';
import { formatNumber, writeDigits } from '../../core/format';
import { TOOLS } from '../../data/tools';
import { FLAIR_LEVELS } from '../../data/technologies';
import { filterMultiplier, gestureMultiplier, levelOf, toolPriceFactor, clickShare } from '../../systems/technologies';
import {
  boonLengthFactor,
  digitalMultiplier,
  etherReading,
  findsMultiplier,
  handFindsMultiplier,
  handsMultiplier,
  knowledgePerFind,
  letterWaitFactor,
  rareMultiplier,
  readingMultiplier,
  storyMultiplier,
} from '../../systems/etherium';
import { clickBoon, findsBoon, fourTen, knowledgeBoon, priceBoon, readingBoon } from '../../systems/boons';
import { sealFindMultiplier } from '../../systems/seals';
import { relicKnowledge, relicLetterWait, relicReading } from '../../systems/relics';
import { mimicReading } from '../../systems/mimic';
import { lotteryMethod, lotteryReading } from '../../systems/lotteryEffects';
import { hookProduct } from '../../mods/hooks';
import { modded } from '../../mods/quantities';
import { relicName } from '../relics/relicText';
import type { Figure } from './chapters';
import type { GameState } from '../../core/state';

/**
 * Le chapitre « Bonus » du Grand Livre (demande de l'auteur, 17/10, après le +15 % des tomes de « L'histoire de
 * Babel ») : tout ce qui multiplie quelque chose, rangé sous ce que ça booste (la lecture des méthodes, un clic, les
 * trouvailles…). Une ligne par source, seulement quand elle agit (×1 : rien à dire) ; les malus aussi (la Mimic, la
 * Loterie), puisqu'ils se multiplient avec le reste.
 */

/** ×1,05 · ×0,98 · ×410 · ×1,2e12 : deux décimales tant que le facteur est petit (sinon un sceau ferait ×1). */
const boost = (value: number): string =>
  `×${value < 1000 ? writeDigits(new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(value)) : formatNumber(value, getLocale())}`;
const plusPercent = (value: number): string =>
  `+${writeDigits(new Intl.NumberFormat(getLocale(), { style: 'percent', maximumFractionDigits: 2 }).format(value))}`;

/** Les intuitions des méthodes, en moyenne pesée par ce que lit chacune (comme la décomposition de la vitesse de lecture). */
const gestures = (state: GameState): number => {
  const base = TOOLS.reduce((total, tool) => total + state.tools[tool.id] * tool.pagesPerSecond, 0);
  const read = TOOLS.reduce((total, tool) => total + state.tools[tool.id] * tool.pagesPerSecond * gestureMultiplier(state, tool.id), 0);
  return base > 0 ? read / base : 1;
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
  factorRow('reading', 'readingDigital', 'etra numel', digitalMultiplier),
  factorRow('reading', 'readingEther', 'etra dulvo', etherReading),
  factorRow('reading', 'readingStory', 'vuntal babel', storyMultiplier),
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
  factorRow('click', 'clickEther', 'etra dulvo', etherReading),
  { ...factorRow('click', 'clickRelic', 'relva sablo', relicReading), label: () => relicName('hourglass') },
  factorRow('click', 'clickLetter', 'lettra vimo', () => clickBoon() * fourTen()),
  factorRow('click', 'clickMods', 'modo vel', () => hookProduct('click') * modded('click')),

  factorRow('finds', 'findIntuitions', 'tedu ralvi', filterMultiplier),
  factorRow('finds', 'findSeals', 'sigil varno', sealFindMultiplier),
  factorRow('finds', 'findEtherium', 'etra lupa', findsMultiplier),
  factorRow('finds', 'findHand', 'etra anel', handFindsMultiplier),
  factorRow('finds', 'findLetter', 'lettra vimo', () => findsBoon()),
  factorRow('finds', 'findMods', 'modo vel', () => modded('findChance')),

  factorRow('knowledge', 'knowledgeEtherium', 'etra semav', knowledgePerFind),
  factorRow('knowledge', 'knowledgeLetter', 'lettra vimo', () => knowledgeBoon()),
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

  factorRow('letterWait', 'letterWaitEtherium', 'etra pluma', letterWaitFactor),
  {
    ...factorRow('letterWait', 'letterWaitRelic', 'relva astro', relicLetterWait),
    label: () => relicName('astrolabe'),
  },
  factorRow('boonLength', 'boonLength', 'etra pluma dur', boonLengthFactor),
];

/** Le chapitre paraît dès qu'un bonus agit. */
export const anyBonus = (state: GameState): boolean => BONUS_FIGURES.some((figure) => figure.shown?.(state));
