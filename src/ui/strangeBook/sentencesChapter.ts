import { getLocale, t } from '../../i18n';
import { currentNotation, writeDigits } from '../../core/format';
import { SENTENCES, type SentenceDef, type SentenceKind } from '../../data/sentences';
import { ANOMALY_FAMILIES, type AnomalyFamily } from '../../data/anomalies';
import { isComplete, segments, sentenceSource, written } from '../../systems/sentences';
import { isDeciphered } from '../../systems/decipher';
import { babelName } from '../../systems/seals';
import { statsRevealed } from '../../systems/strangeBook';
import { sentenceWords, sourceItem } from '../whiteBook/sentencePage';
import { wordsParagraph } from '../whiteBook/paragraph';
import { folio, heading, type Item } from './pageItems';
import type { GameState } from '../../core/state';

/**
 * Chapitre des Connaissances du livre étrange : toutes les phrases du jeu (celles du livre blanc). Comme
 * les sceaux : une page d'introduction (phrases revenues, et une ligne par sorte), puis chaque sorte sur
 * sa propre page (plusieurs si elle ne tient pas). Les anomalies, à collectionner, ont leur propre
 * introduction (une ligne par famille, chacune avec sa complétion), puis une page par famille.
 * Chaque phrase montre ses morceaux trouvés en clair, les autres en symboles de Babel (les mêmes que
 * dans le livre blanc).
 */

/** Titre et sortes, tant que le sommaire n'est pas déchiffré. */
const TITLE = 'semelin varo';
const KIND_TITLES: Record<SentenceKind, string> = { method: 'hesmo tival', memory: 'rumevi', anomaly: 'anzolt eru' };
/** Ordre des sortes dans le chapitre. */
const KINDS: readonly SentenceKind[] = ['method', 'memory', 'anomaly'];

/** Haut des phrases, sous le titre de la page. */
const TOP = 190;
/** Bas des phrases, avec de la marge : une phrase qui gagne une ligne en se remplissant tient encore. */
const BOTTOM = 660;
const SENTENCE_GAP = 20;
/** Ligne de l'auteur d'une citation (sa place est gardée tant qu'elle n'est pas trouvée). */
const SOURCE_LINE = 26;
const COLUMN = { left: 80, width: 480, size: 21, line: 29, align: 'center', italic: true } as const;
/** Lignes des sortes sur la page d'introduction (comme les planches des sceaux). */
const LINE_TOP = 360;
const LINE_STEP = 52;
/** Dernière ligne possible des familles d'anomalies (resserrées si elles sont nombreuses). */
const FAMILY_BOTTOM = 660;

/** Le chapitre se montre avec la première trouvaille, comme celui de la Connaissance. */
export const sentencesShown = (state: GameState): boolean => statsRevealed() || state.lifetimeKnowledge > 0;

export const sentencesTitle = (state: GameState): string => (isDeciphered(state, 'contents') ? t('strangeBook.chapters.sentences') : TITLE);

const kindTitle = (state: GameState, kind: SentenceKind): string =>
  isDeciphered(state, 'contents') ? t(`strangeBook.sentenceKinds.${kind}`) : KIND_TITLES[kind];

const familyTitle = (state: GameState, family: AnomalyFamily): string =>
  isDeciphered(state, 'contents') ? t(`strangeBook.anomalyFamilies.${family}`) : babelName(`family:${family}`);

const ofKind = (kind: SentenceKind): SentenceDef[] => SENTENCES.filter((sentence) => sentence.kind === kind);
const ofFamily = (family: AnomalyFamily): SentenceDef[] => SENTENCES.filter((sentence) => sentence.family === family);

/** Une suite de pages de phrases : une sorte, ou une famille d'anomalies. */
interface Section {
  id: string;
  title: (state: GameState) => string;
  sentences: SentenceDef[];
}

const SECTIONS: readonly Section[] = [
  ...(['method', 'memory'] as const).map((kind) => ({
    id: kind,
    title: (state: GameState) => kindTitle(state, kind),
    sentences: ofKind(kind),
  })),
  ...ANOMALY_FAMILIES.map((family) => ({
    id: family,
    title: (state: GameState) => familyTitle(state, family),
    sentences: ofFamily(family),
  })),
];

/** Phrases revenues sur le total, écrit « 3 / 11 ». */
const tally = (state: GameState, sentences: readonly SentenceDef[]): string =>
  writeDigits(`${sentences.filter((sentence) => isComplete(state, sentence.id)).length} / ${sentences.length}`);

/** Hauteur d'une phrase : la plus grande, trouvée ou non (les symboles n'ont pas la largeur des lettres). */
const sentenceHeight = (sentence: SentenceDef): number => {
  const all = segments(sentence.id).map((_, index) => index);
  const tallest = Math.max(...[all, []].map((done) => wordsParagraph(sentenceWords(sentence, done), 0, COLUMN).bottom));
  return tallest + (sentenceSource(sentence.id) ? SOURCE_LINE : 0) + SENTENCE_GAP;
};

/** Les phrases d'une sorte réparties en pages. */
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

/** Une page de phrases d'une section : son titre, puis ses phrases. */
const sectionItems = (state: GameState, section: Section, sentences: SentenceDef[], number: number): Item[] => {
  let y = TOP;
  return [
    ...heading(section.title(state)),
    ...sentences.flatMap((sentence) => {
      const text = wordsParagraph(sentenceWords(sentence, written(state, sentence.id)), y, COLUMN);
      const source = isComplete(state, sentence.id) ? sentenceSource(sentence.id) : undefined;
      y += sentenceHeight(sentence);
      return [...text.items, ...(source ? [sourceItem(source, text.bottom, 16)] : [])];
    }),
    folio(number),
  ];
};

/** Une ligne de sommaire sur une page d'introduction : titre, points, complétion, et lien vers sa page. */
const tallyLine = (title: string, sentences: readonly SentenceDef[], state: GameState, y: number, target: number): Item[] => [
  { kind: 'text', text: title, x: 110, y, size: 22, align: 'left', spacing: 2 },
  { kind: 'dots', x1: 385, x2: 460, y: y + 17 },
  { kind: 'text', text: tally(state, sentences), x: 530, y, size: 22, align: 'right' },
  { kind: 'link', y: y - 8, height: LINE_STEP - 4, target },
];

/** Grand total d'une introduction (« 3 / 11 ») et sa phrase de complétion en dessous. */
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
      t('strangeBook.sentencesCompletion').replace(
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

interface SectionPage {
  section: Section;
  sentences: SentenceDef[];
  /** Première page de la section (celle des liens). */
  first: boolean;
}

/** Une entrée du sommaire pour la sorte, en sous-entrée du chapitre. */
export interface SentencesEntry {
  title: (state: GameState) => string;
  page: number;
}

export interface SentencesSection {
  /** L'introduction, puis les pages des sortes : leur contenu suit la partie. */
  pages: (() => Item[])[];
  /** Les sortes au sommaire (sous-entrées). */
  entries: SentencesEntry[];
}

const paged = (sections: readonly Section[]): SectionPage[] =>
  sections.flatMap((section) =>
    paginate(section.sentences)
      .filter((sentences) => sentences.length > 0)
      .map((sentences, index) => ({ section, sentences, first: index === 0 })),
  );

/**
 * Les pages du chapitre, réparties une fois (à l'ouverture du livre). `chapter` : son numéro de
 * chapitre ; `first` : la place de son introduction dans la liste des pages (numéro imprimé : un de plus).
 * Ordre : introduction, méthodes, souvenirs, introduction des anomalies, puis leurs familles.
 */
export const sentencesSection = (state: GameState, chapter: number, first: number): SentencesSection => {
  const anomalies = ofKind('anomaly');
  const before = paged(SECTIONS.filter((section) => !ANOMALY_FAMILIES.includes(section.id as AnomalyFamily)));
  const families = paged(SECTIONS.filter((section) => ANOMALY_FAMILIES.includes(section.id as AnomalyFamily)));
  // Place de chaque page dans la liste du livre : l'introduction du chapitre est à `first`.
  const anomaliesPage = first + 1 + before.length;
  const pageOf = (pages: SectionPage[], start: number, id: string): number =>
    start + pages.findIndex((page) => page.section.id === id && page.first);
  const kindPage = (kind: SentenceKind): number => (kind === 'anomaly' ? anomaliesPage : pageOf(before, first + 1, kind));
  const shownKinds = KINDS.filter((kind) => ofKind(kind).length > 0);
  const shownFamilies = ANOMALY_FAMILIES.filter((family) => ofFamily(family).length > 0);
  const kindsStep = LINE_STEP;
  const familiesStep = Math.min(LINE_STEP, (FAMILY_BOTTOM - LINE_TOP) / Math.max(1, shownFamilies.length - 1));
  const intro = (): Item[] => [
    ...heading(sentencesTitle(state), chapter),
    ...totalItems(state, SENTENCES),
    ...shownKinds.flatMap((kind, index) =>
      tallyLine(kindTitle(state, kind), ofKind(kind), state, LINE_TOP + index * kindsStep, kindPage(kind)),
    ),
    folio(first + 1),
  ];
  const anomaliesIntro = (): Item[] => [
    ...heading(kindTitle(state, 'anomaly')),
    ...totalItems(state, anomalies),
    ...shownFamilies.flatMap((family, index) =>
      tallyLine(
        familyTitle(state, family),
        ofFamily(family),
        state,
        LINE_TOP + index * familiesStep,
        pageOf(families, anomaliesPage + 1, family),
      ),
    ),
    folio(anomaliesPage + 1),
  ];
  const sectionPage = (page: SectionPage, index: number) => () => sectionItems(state, page.section, page.sentences, index + 1);
  return {
    pages: [
      intro,
      ...before.map((page, index) => sectionPage(page, first + 1 + index)),
      ...(anomalies.length > 0 ? [anomaliesIntro] : []),
      ...families.map((page, index) => sectionPage(page, anomaliesPage + 1 + index)),
    ],
    entries: shownKinds.map((kind) => ({ title: (current: GameState) => kindTitle(current, kind), page: kindPage(kind) })),
  };
};
