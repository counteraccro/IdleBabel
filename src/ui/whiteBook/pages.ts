import { writeDigits } from '../../core/format';
import { t } from '../../i18n';
import { SENTENCES, type SentenceDef, type SentenceKind } from '../../data/sentences';
import { ANOMALY_FAMILIES } from '../../data/anomalies';
import { anomalyPages, familyTitle, ofFamily } from './anomalyPages';
import { contentsItems, type ContentsEntry } from './contents';
import { partTitleItems, partTitleLayout, subPartLayout, type WhiteBookPart } from './partTitle';
import { intuitionItems, reminiscenceNote } from './intuitionPage';
import { TECHNOLOGIES } from '../../data/technologies';
import { intuitionVisible, technologiesCompletion, understand } from '../../systems/technologies';
import { completion, guess, guessPrice, isComplete, written } from '../../systems/sentences';
import { waitingFor } from '../../systems/findable';
import { METHOD_GATE } from '../../data/knowledge';
import { babelize, seedOf } from './babelMask';
import { sentenceBody } from './sentencePage';
import { folio, type Item, type TextItem } from '../strangeBook/pageItems';
import { createLeafPage, pencilOffer, priceNote, type LeafPage, type PageHooks } from '../strangeBook/pages';
import type { GameState } from '../../core/state';

/** Sceau de la phrase, et nom de la méthode dessous (repère de la page : 640 × 800). */
const SEAL_Y = 108;
const SEAL_SIZE = 112;
const NAME_Y = 182;

/**
 * Page d'une phrase : son sceau hexagonal (doré une fois la phrase complète), le nom de la méthode
 * (en symboles tant qu'elle n'est pas découverte), le corps de la page, et (note au crayon du
 * chercheur, dans la marge du haut) deviner le dernier morceau.
 */
const sentenceLayout = (
  state: GameState,
  sentence: SentenceDef,
  number: number,
  asking: boolean,
  fresh: (segment: number) => boolean,
): Item[] => {
  const price = guessPrice(state, sentence.id);
  const known = isComplete(state, sentence.id);
  const name = sentence.tool ? t(`tools.${sentence.tool}.name`) : '';
  // Nom de la méthode, en symboles tant que la phrase n'est pas complète : c'est lui que la devinette
  // révèle, souligné au crayon.
  const title: TextItem = {
    kind: 'text',
    text: known ? name : babelize(name, seedOf(`${sentence.id}:name`)),
    x: 320,
    y: NAME_Y,
    size: 22,
    align: 'center',
    caps: true,
    spacing: 3,
    ink: known ? undefined : 'ghost',
  };
  return [
    {
      kind: 'seal',
      id: `whiteBook:${sentence.id}`,
      series: `whiteBook:${sentence.id}`,
      tier: 0,
      look: known ? 'gold' : 'embossed',
      x: 320,
      y: SEAL_Y,
      size: SEAL_SIZE,
    },
    title,
    ...sentenceBody(state, sentence, 240, { known, reveal: known && fresh(-1), fresh }),
    ...waitingNote(state, sentence),
    ...(price === undefined ? [] : pencilOffer(priceNote(state, price, 'whiteBook.guess', 'whiteBook.guessShort'), asking, 20, [title])),
    folio(number),
  ];
};

/**
 * La méthode en cours qui attend la précédente à METHOD_GATE exemplaires : une note au crayon dans la
 * marge du haut (« Pas encore. D'abord : La Lecture Diagonale, 12 / 25 »), là où se proposerait la devinette.
 */
const waitingNote = (state: GameState, sentence: SentenceDef): Item[] => {
  const before = waitingFor(state, sentence.id);
  if (!before) return [];
  const text = t('whiteBook.notYet')
    .replace('{method}', t(`tools.${before}.name`))
    .replace('{owned}', writeDigits(String(state.tools[before])))
    .replace('{n}', writeDigits(String(METHOD_GATE)));
  return [{ kind: 'text', text, x: 320, y: 20, size: 26, align: 'center', face: 'hand', steady: true }];
};

/**
 * Suit ce qui s'ordonne sur une page : ce qui était déjà là à l'ouverture ne bouge pas. -1 : la phrase
 * complète (la page change d'aspect).
 */
const freshTracker = (state: GameState, sentence: SentenceDef): ((segment: number) => boolean) => {
  const seen = new Set(written(state, sentence.id));
  if (isComplete(state, sentence.id)) seen.add(-1);
  return (segment) => {
    if (seen.has(segment)) return false;
    seen.add(segment);
    return true;
  };
};

/** Page de titre, la première du livre : le grand hexagone doré, le titre, et ce qui s'en est écrit. */
const titleItems = (state: GameState): Item[] => [
  { kind: 'seal', id: 'whiteBook', series: 'whiteBook', tier: 0, look: 'gold', x: 320, y: 280, size: 170 },
  { kind: 'text', text: t('whiteBook.title'), x: 320, y: 410, size: 34, align: 'center', caps: true, spacing: 6 },
  { kind: 'text', text: '·   ·   ·', x: 320, y: 470, size: 18, align: 'center', faded: true },
  // Police des titres : ses chiffres ont la hauteur du « % » (partTitle.ts).
  {
    kind: 'text',
    text: writeDigits(`${Math.floor(completion(state) * 100)} %`),
    x: 320,
    y: 542,
    size: 40,
    align: 'center',
    spacing: 2,
    face: 'title',
  },
  { kind: 'text', text: t('whiteBook.completion'), x: 320, y: 600, size: 18, align: 'center', italic: true, faded: true, spacing: 2 },
];

const ofKind = (kind: SentenceKind): SentenceDef[] => SENTENCES.filter((sentence) => sentence.kind === kind);

/**
 * Le livre blanc, toutes ses pages dès le début. Le numéro imprimé d'une page est sa place dans la
 * liste (0 : l'intérieur de la couverture, à gauche). Dans l'ordre : la page de titre seule à droite,
 * le sommaire à gauche, puis quatre parties : les méthodes (une page par phrase), les intuitions (une page
 * chacune), les souvenirs (le lore, une page par phrase), puis les anomalies (leur introduction, puis les familles). Chaque partie s'ouvre sur sa page de titre, à
 * droite, son contenu commençant en face ; et de nouveau l'intérieur de la
 * couverture si la dernière page tombe à gauche.
 */
export const createWhiteBookPages = (state: GameState, goTo: (page: number) => void): (LeafPage | null)[] => {
  const trackers = new Map<string, (segment: number) => boolean>();
  const freshOf = (sentence: SentenceDef) => {
    if (!trackers.has(sentence.id)) trackers.set(sentence.id, freshTracker(state, sentence));
    return trackers.get(sentence.id)!;
  };
  const CONTENTS = 2;
  const entries: ContentsEntry[] = [];
  const pages: (LeafPage | null)[] = [
    null,
    createLeafPage(() => titleItems(state), goTo),
    createLeafPage(() => contentsItems(state, entries, CONTENTS), goTo),
  ];
  // Page de titre d'une partie, sur une page de droite (une page blanche avant si besoin) : son contenu
  // commence en face, à gauche.
  const partTitle = (
    kind: WhiteBookPart,
    number: number,
    layout: () => Item[] = () => partTitleItems(state, kind as SentenceKind, number),
    hooks: PageHooks = {},
  ): void => {
    if (pages.length % 2 === 0) {
      const blank = pages.length;
      pages.push(createLeafPage(() => [folio(blank)], goTo));
    }
    entries.push({ title: () => t(`whiteBook.parts.${kind}`), page: pages.length });
    pages.push(createLeafPage(layout, goTo, hooks));
  };
  const sentencePart = (kind: 'method' | 'memory', number: number): void => {
    partTitle(kind, number);
    for (const sentence of ofKind(kind)) {
      const number = pages.length;
      pages.push(
        createLeafPage(({ asking }) => sentenceLayout(state, sentence, number, asking, freshOf(sentence)), goTo, {
          onPay: () => guess(state, sentence.id),
        }),
      );
    }
  };
  sentencePart('method', 1);
  // Les intuitions, achetées en Connaissance : une page chacune, juste après les méthodes qu'elles aident.
  // Sa page de titre porte la note au crayon de la Réminiscence, une fois obtenue : un clic la laisse faire ou non.
  partTitle('intuition', 2, () => [...partTitleLayout('intuition', 2, technologiesCompletion(state)), ...reminiscenceNote(state)], {
    onAct: (id) => {
      if (id === 'reminiscence') state.reminiscence.on = !state.reminiscence.on;
    },
  });
  const intuitionPage = (tech: (typeof TECHNOLOGIES)[number]): void => {
    const number = pages.length;
    pages.push(createLeafPage(() => intuitionItems(state, tech.id, number), goTo, { onPay: () => understand(state, tech.id) }));
  };
  const lasting = (tech: (typeof TECHNOLOGIES)[number]): boolean => 'permanent' in tech && tech.permanent;
  TECHNOLOGIES.filter((tech) => !lasting(tech)).forEach(intuitionPage);
  // Les intuitions permanentes (des conforts, que l'Exil ne fait pas oublier) : une sous-partie, son titre
  // à gauche (une page blanche avant si besoin), en face de la première d'entre elles.
  if (pages.length % 2 === 1) {
    const blank = pages.length;
    pages.push(createLeafPage(() => [folio(blank)], goTo));
  }
  const lastingTitle = pages.length;
  entries.push({ title: () => t('whiteBook.parts.permanent'), page: lastingTitle, sub: true });
  pages.push(createLeafPage(() => subPartLayout('permanent'), goTo));
  TECHNOLOGIES.filter((tech) => lasting(tech) && intuitionVisible(state, tech.id)).forEach(intuitionPage);
  sentencePart('memory', 3);
  partTitle('anomaly', 4);
  const anomalyPart = anomalyPages(state, pages.length, freshOf);
  entries.push(
    ...ANOMALY_FAMILIES.filter((family) => ofFamily(family).length > 0).map((family) => ({
      title: (current: GameState) => familyTitle(current, family),
      page: anomalyPart.familyPage[family],
      sub: true,
    })),
  );
  pages.push(...anomalyPart.pages.map((layout) => createLeafPage(layout, goTo)));
  return pages.length % 2 === 1 ? [...pages, null] : pages;
};
