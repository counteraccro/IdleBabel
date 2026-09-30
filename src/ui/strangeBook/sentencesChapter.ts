import { getLocale, t } from '../../i18n';
import { currentNotation, writeDigits } from '../../core/format';
import { SENTENCES, type SentenceDef, type SentenceKind } from '../../data/sentences';
import { isComplete, segments, written } from '../../systems/sentences';
import { isDeciphered } from '../../systems/decipher';
import { statsRevealed } from '../../systems/strangeBook';
import { sentenceWords } from '../whiteBook/sentencePage';
import { wordsParagraph } from '../whiteBook/paragraph';
import { folio, heading, type Item } from './pageItems';
import type { GameState } from '../../core/state';

/**
 * Chapitre des Connaissances du livre étrange : toutes les phrases du jeu (celles du livre blanc). Comme
 * les sceaux : une page d'introduction (phrases revenues, et une ligne par sorte), puis chaque sorte sur
 * sa propre page (plusieurs si elle ne tient pas). Chaque phrase montre ses morceaux trouvés en clair,
 * les autres en symboles de Babel (les mêmes que dans le livre blanc).
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
const COLUMN = { left: 80, width: 480, size: 21, line: 29, align: 'center', italic: true } as const;
/** Lignes des sortes sur la page d'introduction (comme les planches des sceaux). */
const LINE_TOP = 360;
const LINE_STEP = 52;

/** Le chapitre se montre avec la première trouvaille, comme celui de la Connaissance. */
export const sentencesShown = (state: GameState): boolean => statsRevealed() || state.lifetimeKnowledge > 0;

export const sentencesTitle = (state: GameState): string => (isDeciphered(state, 'contents') ? t('strangeBook.chapters.sentences') : TITLE);

const kindTitle = (state: GameState, kind: SentenceKind): string =>
  isDeciphered(state, 'contents') ? t(`strangeBook.sentenceKinds.${kind}`) : KIND_TITLES[kind];

const ofKind = (kind: SentenceKind): SentenceDef[] => SENTENCES.filter((sentence) => sentence.kind === kind);

/** Phrases revenues sur le total, écrit « 3 / 11 ». */
const tally = (state: GameState, sentences: readonly SentenceDef[]): string =>
  writeDigits(`${sentences.filter((sentence) => isComplete(state, sentence.id)).length} / ${sentences.length}`);

/** Hauteur d'une phrase : la plus grande, trouvée ou non (les symboles n'ont pas la largeur des lettres). */
const sentenceHeight = (sentence: SentenceDef): number => {
  const all = segments(sentence.id).map((_, index) => index);
  const tallest = Math.max(...[all, []].map((done) => wordsParagraph(sentenceWords(sentence, done), 0, COLUMN).bottom));
  return tallest + SENTENCE_GAP;
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

/** Une page de phrases d'une sorte : son titre, puis ses phrases. */
const kindItems = (state: GameState, kind: SentenceKind, sentences: SentenceDef[], number: number): Item[] => {
  let y = TOP;
  return [
    ...heading(kindTitle(state, kind)),
    ...sentences.flatMap((sentence) => {
      const items = wordsParagraph(sentenceWords(sentence, written(state, sentence.id)), y, COLUMN).items;
      y += sentenceHeight(sentence);
      return items;
    }),
    folio(number),
  ];
};

interface KindPage {
  kind: SentenceKind;
  sentences: SentenceDef[];
  /** Première page de la sorte (celle du sommaire). */
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

/**
 * Les pages du chapitre, réparties une fois (à l'ouverture du livre). `chapter` : son numéro de
 * chapitre ; `first` : la place de son introduction dans la liste des pages (numéro imprimé : un de plus).
 */
export const sentencesSection = (state: GameState, chapter: number, first: number): SentencesSection => {
  const kinds: KindPage[] = KINDS.flatMap((kind) =>
    paginate(ofKind(kind))
      .filter((sentences) => sentences.length > 0)
      .map((sentences, index) => ({ kind, sentences, first: index === 0 })),
  );
  const pageOf = (kind: SentenceKind): number => first + 1 + kinds.findIndex((page) => page.kind === kind && page.first);
  const shownKinds = KINDS.filter((kind) => ofKind(kind).length > 0);
  const intro = (): Item[] => [
    ...heading(sentencesTitle(state), chapter),
    {
      kind: 'text',
      text: tally(state, SENTENCES),
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
            SENTENCES.filter((sentence) => isComplete(state, sentence.id)).length / Math.max(1, SENTENCES.length),
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
    ...shownKinds.flatMap((kind, index): Item[] => {
      const y = LINE_TOP + index * LINE_STEP;
      return [
        { kind: 'text', text: kindTitle(state, kind), x: 110, y, size: 22, align: 'left', spacing: 2 },
        { kind: 'dots', x1: 330, x2: 450, y: y + 17 },
        { kind: 'text', text: tally(state, ofKind(kind)), x: 530, y, size: 22, align: 'right' },
        { kind: 'link', y: y - 8, height: LINE_STEP - 4, target: pageOf(kind) },
      ];
    }),
    folio(first + 1),
  ];
  return {
    pages: [intro, ...kinds.map((page, index) => () => kindItems(state, page.kind, page.sentences, first + index + 2))],
    entries: shownKinds.map((kind) => ({ title: (current: GameState) => kindTitle(current, kind), page: pageOf(kind) })),
  };
};
