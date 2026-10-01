import { getLocale, t } from '../../i18n';
import { currentNotation, writeDigits } from '../../core/format';
import { SENTENCES, type SentenceDef } from '../../data/sentences';
import { ANOMALY_FAMILIES, type AnomalyFamily } from '../../data/anomalies';
import { isComplete, segments, sentenceSource, written } from '../../systems/sentences';
import { babelize, seedOf } from './babelMask';
import { sentenceWords, sourceItem } from './sentencePage';
import { wordsParagraph } from './paragraph';
import { folio, heading, type Item } from '../strangeBook/pageItems';
import type { GameState } from '../../core/state';

/**
 * Partie des anomalies du livre blanc : une introduction (total, puis une ligne par famille avec sa
 * complétion, qui mène à sa page), puis chaque famille sur ses pages, plusieurs phrases par page. Pas de
 * devinette ici : les anomalies se collectionnent en lisant. Chaque phrase montre ses morceaux trouvés
 * en clair, les autres en symboles de Babel.
 */

/** Haut des phrases, sous le titre de la page. */
const TOP = 190;
/** Bas des phrases, avec de la marge : une phrase qui gagne une ligne en se remplissant tient encore. */
const BOTTOM = 660;
const SENTENCE_GAP = 20;
/** Ligne de l'auteur d'une citation (sa place est gardée tant qu'elle n'est pas trouvée). */
const SOURCE_LINE = 26;
const COLUMN = { left: 80, width: 480, size: 21, line: 29, align: 'center', italic: true } as const;
/** Lignes des familles sur la page d'introduction (resserrées si elles sont nombreuses). */
const LINE_TOP = 360;
const LINE_STEP = 52;
const FAMILY_BOTTOM = 660;

export const ofFamily = (family: AnomalyFamily): SentenceDef[] => SENTENCES.filter((sentence) => sentence.family === family);
export const anomalies = (): SentenceDef[] => SENTENCES.filter((sentence) => sentence.kind === 'anomaly');

/** Nom d'une famille : en symboles tant que rien n'en est écrit. */
export const familyTitle = (state: GameState, family: AnomalyFamily): string => {
  const name = t(`whiteBook.anomalyFamilies.${family}`);
  return ofFamily(family).some((sentence) => written(state, sentence.id).length > 0) ? name : babelize(name, seedOf(`family:${family}`));
};

/** Phrases complètes sur le total, écrit « 3 / 11 ». */
export const tally = (state: GameState, sentences: readonly SentenceDef[]): string =>
  writeDigits(`${sentences.filter((sentence) => isComplete(state, sentence.id)).length} / ${sentences.length}`);

/** Hauteur d'une phrase : la plus grande, trouvée ou non (les symboles n'ont pas la largeur des lettres). */
const sentenceHeight = (sentence: SentenceDef): number => {
  const all = segments(sentence.id).map((_, index) => index);
  const tallest = Math.max(...[all, []].map((done) => wordsParagraph(sentenceWords(sentence, done), 0, COLUMN).bottom));
  return tallest + (sentenceSource(sentence.id) ? SOURCE_LINE : 0) + SENTENCE_GAP;
};

/** Les phrases d'une famille réparties en pages. */
const paginate = (sentences: SentenceDef[]): SentenceDef[][] => {
  const pages: SentenceDef[][] = [[]];
  let y = TOP;
  for (const sentence of sentences) {
    const height = sentenceHeight(sentence);
    if (y + height > BOTTOM && pages[pages.length - 1].length > 0) {
      pages.push([]);
      y = TOP;
    }
    pages[pages.length - 1].push(sentence);
    y += height;
  }
  return pages;
};

/** Une ligne de complétion : titre, points, complétion, et lien vers sa page. */
export const tallyLine = (title: string, sentences: readonly SentenceDef[], state: GameState, y: number, target: number): Item[] => [
  { kind: 'text', text: title, x: 110, y, size: 22, align: 'left', spacing: 2 },
  { kind: 'dots', x1: 385, x2: 460, y: y + 17 },
  { kind: 'text', text: tally(state, sentences), x: 530, y, size: 22, align: 'right' },
  { kind: 'link', y: y - 8, height: LINE_STEP - 4, target },
];

/** Grand total de l'introduction (« 3 / 92 ») et sa phrase de complétion en dessous. */
const totalItems = (state: GameState, sentences: readonly SentenceDef[]): Item[] => [
  {
    kind: 'text',
    text: tally(state, sentences),
    x: 320,
    y: 200,
    size: 72,
    align: 'center',
    spacing: 2,
    gold: currentNotation() === 'babel',
  },
  {
    kind: 'text',
    text: writeDigits(
      t('whiteBook.anomaliesCompletion').replace(
        '{percent}',
        new Intl.NumberFormat(getLocale(), { style: 'percent', maximumFractionDigits: 0 }).format(
          sentences.filter((sentence) => isComplete(state, sentence.id)).length / Math.max(1, sentences.length),
        ),
      ),
    ),
    x: 320,
    y: 290,
    size: 20,
    align: 'center',
    italic: true,
    faded: true,
    spacing: 3,
  },
];

/** Suit les morceaux nouveaux d'une phrase (leurs lettres s'ordonnent à leur première apparition). */
export type FreshOf = (sentence: SentenceDef) => (segment: number) => boolean;

export interface AnomalyPages {
  /** L'introduction puis les pages des familles, chacune avec sa place dans la liste des pages. */
  pages: (() => Item[])[];
  /** Première page de chaque famille (pour le sommaire). */
  familyPage: Record<AnomalyFamily, number>;
}

/** `first` : place de l'introduction dans la liste des pages (son numéro imprimé est le même). */
export const anomalyPages = (state: GameState, first: number, freshOf: FreshOf): AnomalyPages => {
  const families = ANOMALY_FAMILIES.filter((family) => ofFamily(family).length > 0);
  const familyPage = {} as Record<AnomalyFamily, number>;
  const pages: (() => Item[])[] = [];
  let page = first + 1;
  for (const family of families) {
    familyPage[family] = page;
    for (const sentences of paginate(ofFamily(family))) {
      const number = page;
      pages.push(() => familyItems(state, family, sentences, number, freshOf));
      page += 1;
    }
  }
  const step = Math.min(LINE_STEP, (FAMILY_BOTTOM - LINE_TOP) / Math.max(1, families.length - 1));
  const intro = (): Item[] => [
    ...heading(t('whiteBook.parts.anomaly')),
    ...totalItems(state, anomalies()),
    ...families.flatMap((family, index) =>
      tallyLine(familyTitle(state, family), ofFamily(family), state, LINE_TOP + index * step, familyPage[family]),
    ),
    folio(first),
  ];
  return { pages: [intro, ...pages], familyPage };
};

/** Une page d'une famille : son nom, puis ses phrases. */
const familyItems = (state: GameState, family: AnomalyFamily, sentences: SentenceDef[], number: number, freshOf: FreshOf): Item[] => {
  let y = TOP;
  return [
    ...heading(familyTitle(state, family)),
    ...sentences.flatMap((sentence) => {
      const text = wordsParagraph(sentenceWords(sentence, written(state, sentence.id), freshOf(sentence)), y, COLUMN);
      const source = isComplete(state, sentence.id) ? sentenceSource(sentence.id) : undefined;
      y += sentenceHeight(sentence);
      return [...text.items, ...(source ? [sourceItem(source, text.bottom, 16)] : [])];
    }),
    folio(number),
  ];
};
