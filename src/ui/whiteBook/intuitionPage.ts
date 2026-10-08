import { getLocale, messages, t } from '../../i18n';
import { formatNumber, writeDigits } from '../../core/format';
import { BASE_FIND_CHANCE } from '../../data/knowledge';
import {
  armfulLots,
  awayShare,
  bestOf,
  clickShare,
  duplicateShare,
  filterMultiplier,
  gestureMultiplier,
  levelOf,
  lockOf,
  maxAwaySeconds,
  maxLevel,
  nextPrice,
  rareChance,
  targetShare,
  toolPriceFactor,
  technology,
  turnsPerSecond,
} from '../../systems/technologies';
import { reminiscenceKnown, reminiscing } from '../../systems/reminiscence';
import { boonLength, letterStays, letterWait } from '../../systems/letter';
import { durationText } from '../letter/duration';
import { nextRareChance } from '../../systems/rareBooks';
import { sealFindMultiplier } from '../../systems/seals';
import { babelize, seedOf } from './babelMask';
import { paragraph } from './paragraph';
import { fitCaption, folio, type Item } from '../strangeBook/pageItems';
import type { TechnologyId } from '../../data/technologies';
import type { ToolId } from '../../data/tools';
import type { GameState } from '../../core/state';

interface IntuitionTexts {
  name: string;
  description: string;
  effect: string;
  /** Les phrases du chercheur : celle du dernier niveau compris s'écrit en exergue (la dernière, au-delà). */
  notes: string[];
}

interface GestureTexts {
  description: string;
  effect: string;
  notes: Record<ToolId, string>;
}

/** Ses textes ; ceux d'une intuition de méthode : le nom de la méthode, une phrase à elle, le reste commun. */
const texts = (id: TechnologyId): IntuitionTexts => {
  const all = messages().whiteBook.intuitions as unknown as Record<string, IntuitionTexts> & { gestures: GestureTexts };
  const tool = technology(id).tool;
  if (!tool) return all[id];
  const { description, effect, notes } = all.gestures;
  return { name: t(`tools.${tool}.name`), description, effect, notes: [notes[tool]] };
};

const percent = (value: number): string =>
  writeDigits(new Intl.NumberFormat(getLocale(), { style: 'percent', maximumFractionDigits: 2 }).format(value));

const plain = (value: number): string => formatNumber(value, getLocale());

/** Ce que l'intuition change, au niveau `level` : un nombre lisible. */
const effectAt = (state: GameState, id: TechnologyId, level: number): string => {
  const tool = technology(id).tool;
  if (tool) return `×${plain(gestureMultiplier(state, tool, level))}`;
  switch (id) {
    case 'semanticFilter':
      return percent(BASE_FIND_CHANCE * filterMultiplier(state, level) * sealFindMultiplier(state));
    case 'ariadne':
      return percent(targetShare(state, level));
    case 'sentenceMemory':
      return percent(duplicateShare(state, level));
    case 'speedReading':
      return plain(turnsPerSecond(state, level));
    case 'muscleMemory':
      return percent(clickShare(state, level));
    case 'returnMap':
      return percent(awayShare(state, level));
    case 'deepSleep':
      return `${plain(maxAwaySeconds(state, level) / 3600)} h`;
    case 'flair':
      // Le prochain livre rare : plus rare à chaque livre déjà trouvé (systems/rareBooks.ts).
      return `1 / ${plain(Math.round(1 / nextRareChance(Object.keys(state.rareBooks).length, rareChance(state, level))))}`;
    case 'bargain':
      return percent(toolPriceFactor(state, level));
    case 'watch': {
      const wait = letterWait(state, level);
      return t('whiteBook.intuitions.watch.between').replace('{min}', durationText(wait.min)).replace('{max}', durationText(wait.max));
    }
    case 'heldBreath':
      return durationText(letterStays(state, level));
    case 'letterUnderstood':
      return `×${plain(Math.round(boonLength(state, level) * 100) / 100)}`;
    case 'reminiscence':
      return t(level > 0 ? 'whiteBook.intuitions.reminiscence.alone' : 'whiteBook.intuitions.reminiscence.byHand');
    case 'armful': {
      const lots = armfulLots(state, level);
      const most = lots[lots.length - 1];
      return most === 'max' ? t('whiteBook.intuitions.armful.all') : plain(most);
    }
    default:
      return '';
  }
};

const levelText = (id: TechnologyId, level: number): string => {
  const max = maxLevel(id);
  const key = max === Infinity ? 'whiteBook.intuition.levelEndless' : 'whiteBook.intuition.level';
  return t(key)
    .replace('{n}', writeDigits(String(level)))
    .replace('{max}', writeDigits(String(max)));
};

/**
 * Page d'une intuition (repère de la page : 640 × 800), comme celle d'une méthode : son sceau (doré
 * dès le premier niveau compris), son nom, la dernière phrase comprise en exergue (en symboles avant), ce
 * qu'elle fait, son niveau et son effet (maintenant → au niveau suivant), puis, au crayon, de quoi
 * comprendre le niveau suivant et son prix (un clic : c'est payé ; estompé s'il manque de la Connaissance).
 * L'intuition d'une méthode pas encore retrouvée reste en symboles, rien à comprendre (pas de secret éventé).
 */
export const intuitionItems = (state: GameState, id: TechnologyId, number: number): Item[] => {
  const lock = lockOf(state, id);
  const hidden = lock === 'unknownGesture';
  const raw = texts(id);
  const veil = (text: string, field: string): string => (hidden ? babelize(text, seedOf(`${id}:${field}`)) : text);
  const text = { name: veil(raw.name, 'name'), description: veil(raw.description, 'description') };
  const level = levelOf(state, id);
  const price = nextPrice(state, id);
  const notes = raw.notes;
  const note = level > 0 ? notes[Math.min(level, notes.length) - 1] : babelize(notes[0], seedOf(`${id}:note`));
  const quote = paragraph(`« ${note} »`, 250, {
    left: 110,
    width: 420,
    size: 22,
    line: 32,
    align: 'center',
    italic: true,
    faded: level === 0,
  });
  const description = paragraph(text.description, quote.bottom + 34, { left: 110, width: 420, size: 20, line: 29, align: 'center' });
  const now = effectAt(state, id, level);
  const effect = price === undefined ? now : `${now}  →  ${effectAt(state, id, level + 1)}`;
  const y = Math.max(description.bottom + 50, 470);
  const affordable = price !== undefined && state.knowledge >= price;
  const offer = lock
    ? t(`whiteBook.intuition.${lock}`)
    : price === undefined
      ? t('whiteBook.intuition.done')
      : t(affordable ? 'whiteBook.intuition.offer' : 'whiteBook.intuition.short').replace('{n}', formatNumber(price, getLocale()));
  const details: Item[] = hidden
    ? []
    : [
        { kind: 'text', text: levelText(id, level), x: 320, y, size: 22, align: 'center', spacing: 3, face: 'title' },
        { kind: 'text', text: raw.effect, x: 320, y: y + 44, size: 18, align: 'center', italic: true, faded: true, spacing: 2 },
        // Trop longue (le Guet : deux durées de chaque côté), elle se resserre pour tenir dans la page.
        fitCaption({ kind: 'text', text: effect, x: 320, y: y + 74, size: 28, align: 'center', spacing: 2, face: 'title' }),
        // Oubliée à l'Exil : jusqu'où elle était allée (la Réminiscence y remonte seule).
        ...(bestOf(state, id) > level
          ? [
              {
                kind: 'text',
                text: t('whiteBook.intuition.remembered').replace('{n}', writeDigits(String(bestOf(state, id)))),
                x: 320,
                y: y + 112,
                size: 17,
                align: 'center',
                italic: true,
                faded: true,
              } satisfies Item,
            ]
          : []),
      ];
  return [
    {
      kind: 'seal',
      id: `intuition:${id}`,
      series: `intuition:${id}`,
      tier: 0,
      look: level > 0 ? 'gold' : 'embossed',
      x: 320,
      y: 108,
      size: 112,
    },
    { kind: 'text', text: text.name, x: 320, y: 182, size: 22, align: 'center', caps: true, spacing: 3 },
    { kind: 'rule', y: 222, width: 180 },
    ...quote.items,
    ...description.items,
    ...details,
    {
      kind: 'text',
      text: offer,
      x: 320,
      y: 640,
      size: lock ? 26 : 30,
      align: 'center',
      face: 'hand',
      faded: !affordable && !lock,
      steady: true,
    },
    ...(affordable ? [{ kind: 'action', id: 'pay', y: 632, height: 44 } satisfies Item] : []),
    folio(number),
  ];
};

/**
 * Réminiscence, une fois obtenue : une note au crayon en bas de la page de titre des intuitions, que l'on
 * coche ou décoche d'un clic (estompée quand on ne la laisse pas faire).
 */
export const reminiscenceNote = (state: GameState): Item[] => {
  if (!reminiscenceKnown(state)) return [];
  const on = reminiscing(state);
  return [
    {
      kind: 'text',
      text: t(on ? 'whiteBook.reminiscence.on' : 'whiteBook.reminiscence.off'),
      x: 320,
      y: 680,
      size: 24,
      align: 'center',
      face: 'hand',
      faded: !on,
      steady: true,
    },
    { kind: 'action', id: 'reminiscence', y: 672, height: 40 },
  ];
};
