import { writeDigits } from '../../core/format';
import { t } from '../../i18n';
import { SENTENCES, type SentenceDef, type SentenceKind } from '../../data/sentences';
import { ANOMALY_FAMILIES } from '../../data/anomalies';
import { anomalies, anomalyPages, familyTitle, ofFamily } from './anomalyPages';
import { contentsItems, type ContentsEntry } from './contents';
import { partTitleItems } from './partTitle';
import { completion, guess, guessPrice, isComplete, written } from '../../systems/sentences';
import { babelize, seedOf } from './babelMask';
import { sentenceBody } from './sentencePage';
import { folio, type Item, type TextItem } from '../strangeBook/pageItems';
import { createLeafPage, pencilOffer, priceNote, type LeafPage } from '../strangeBook/pages';
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
    ...(price === undefined ? [] : pencilOffer(priceNote(state, price, 'whiteBook.guess', 'whiteBook.guessShort'), asking, 20, [title])),
    folio(number),
  ];
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
  { kind: 'text', text: writeDigits(`${Math.floor(completion(state) * 100)} %`), x: 320, y: 540, size: 44, align: 'center', spacing: 2 },
  { kind: 'text', text: t('whiteBook.completion'), x: 320, y: 600, size: 18, align: 'center', italic: true, faded: true, spacing: 2 },
];

const ofKind = (kind: SentenceKind): SentenceDef[] => SENTENCES.filter((sentence) => sentence.kind === kind);

/**
 * Le livre blanc, toutes ses pages dès le début. Le numéro imprimé d'une page est sa place dans la
 * liste (0 : l'intérieur de la couverture, à gauche). Dans l'ordre : la page de titre seule à droite,
 * le sommaire à gauche, puis trois parties : méthodes et souvenirs (le lore, une page par phrase), puis
 * les anomalies (leur introduction, puis les familles). Chaque partie s'ouvre sur sa page de titre, à
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
  const partTitle = (kind: SentenceKind, number: number, sentences: readonly SentenceDef[]): void => {
    if (pages.length % 2 === 0) {
      const blank = pages.length;
      pages.push(createLeafPage(() => [folio(blank)], goTo));
    }
    entries.push({ title: () => t(`whiteBook.parts.${kind}`), sentences, page: pages.length });
    pages.push(createLeafPage(() => partTitleItems(kind, number), goTo));
  };
  (['method', 'memory'] as const).forEach((kind, index) => {
    partTitle(kind, index + 1, ofKind(kind));
    for (const sentence of ofKind(kind)) {
      const number = pages.length;
      pages.push(
        createLeafPage(({ asking }) => sentenceLayout(state, sentence, number, asking, freshOf(sentence)), goTo, {
          onPay: () => guess(state, sentence.id),
        }),
      );
    }
  });
  partTitle('anomaly', 3, anomalies());
  const anomalyPart = anomalyPages(state, pages.length, freshOf);
  entries.push(
    ...ANOMALY_FAMILIES.filter((family) => ofFamily(family).length > 0).map((family) => ({
      title: (current: GameState) => familyTitle(current, family),
      sentences: ofFamily(family),
      page: anomalyPart.familyPage[family],
      sub: true,
    })),
  );
  pages.push(...anomalyPart.pages.map((layout) => createLeafPage(layout, goTo)));
  return pages.length % 2 === 1 ? [...pages, null] : pages;
};
