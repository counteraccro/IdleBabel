import { writeDigits } from '../../core/format';
import { t } from '../../i18n';
import { SENTENCES, type SentenceDef, type SentenceKind } from '../../data/sentences';
import { ANOMALY_FAMILIES } from '../../data/anomalies';
import { anomalyPages, familyTitle, ofFamily } from './anomalyPages';
import { contentsFit, contentsItems, splitContents, type ContentsEntry } from './contents';
import { partTitleItems, partTitleLayout, subPartLayout, type WhiteBookPart } from './partTitle';
import { intuitionItems, reminiscenceNote } from './intuitionPage';
import { TECHNOLOGIES } from '../../data/technologies';
import { AUTOMATIC_AGE, DIGITAL_AGE, TOOLS } from '../../data/tools';
import { starLit } from '../../systems/etherium';
import { intuitionVisible, technologiesCompletion, understand } from '../../systems/technologies';
import { completion, guess, guessPrice, isComplete, sentenceShown, written } from '../../systems/sentences';
import { methodGate, waitingFor } from '../../systems/findable';
import { babelize, seedOf } from './babelMask';
import { sentenceBody } from './sentencePage';
import { folio, type Item, type TextItem } from '../strangeBook/pageItems';
import { createLeafPage, pencilOffer, priceNote, type LeafPage, type PageHooks } from '../strangeBook/pages';
import { tasksOpen } from '../../systems/tasks';
import { actOnTask, onceItems, oncePageCount, taskTitleItems, todayItems } from './taskPages';
import type { GameState } from '../../core/state';

/** Sceau de la phrase, et nom de la méthode dessous (repère de la page : 640 × 800). */
const SEAL_Y = 108;
const SEAL_SIZE = 112;
const NAME_Y = 182;
/** Bâtons d'une méthode qui attend : entre son nom et sa phrase. */
const TALLY_Y = 214;

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
    ...waitingTally(state, sentence),
    ...(price === undefined ? [] : pencilOffer(priceNote(state, price, 'whiteBook.guess', 'whiteBook.guessShort'), asking, 20, [title])),
    folio(number),
  ];
};

/**
 * La méthode en cours qui attend la précédente à METHOD_GATE exemplaires : des bâtons au crayon sous son
 * nom, un par exemplaire possédé (choix de l'auteur, 04/10 : pas de texte, on compte comme le chercheur).
 */
const waitingTally = (state: GameState, sentence: SentenceDef): Item[] => {
  const before = waitingFor(state, sentence.id);
  if (!before) return [];
  const gate = methodGate();
  return [{ kind: 'tally', x: 320, y: TALLY_Y, count: gate, done: Math.min(state.tools[before], gate) }];
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

/** Les Âges, dans l'ordre (aucun : l'Âge Manuel), et le nom de leur sous-partie (whiteBook.parts). */
const AGES = [undefined, AUTOMATIC_AGE, DIGITAL_AGE] as const;
const AGE_KEYS: Record<string, string> = { manual: 'manualAge', [AUTOMATIC_AGE]: 'automaticAge', [DIGITAL_AGE]: 'digitalAge' };

const ofKind = (kind: SentenceKind): SentenceDef[] => SENTENCES.filter((sentence) => sentence.kind === kind);

/**
 * Le livre blanc, toutes ses pages dès le début. Le numéro imprimé d'une page est sa place dans la
 * liste (0 : l'intérieur de la couverture, à gauche). Dans l'ordre : la page de titre seule à droite,
 * le sommaire à gauche, puis quatre parties : les méthodes (une page par phrase), les intuitions (une page
 * chacune ; l'Âge Automatique acheté, ces deux parties se rangent par Âge), les souvenirs (le lore, une page par phrase), puis les anomalies (leur introduction, puis les familles). Chaque partie s'ouvre sur sa page de titre, à
 * droite, son contenu commençant en face ; et de nouveau l'intérieur de la
 * couverture si la dernière page tombe à gauche.
 */
/** La page « Aujourd'hui » du dernier livre blanc fait (undefined : pas de tâches). */
let tasksPage: number | undefined;
export const whiteBookTasksPage = (): number | undefined => tasksPage;

/** Le jeton de la clé cliqué : le livre blanc s'ouvrira sur les tâches (pris une fois, à son ouverture). */
let tasksWanted = false;
export const openWhiteBookOnTasks = (): void => {
  tasksWanted = true;
};
export const takeWhiteBookTasks = (): boolean => {
  const wanted = tasksWanted;
  tasksWanted = false;
  return wanted;
};

/** La page de chaque phrase dans le dernier livre blanc fait. */
const sentencePages = new Map<string, number>();
/** Une méthode qui s'annonce cliquée (methodHive.ts) : le livre blanc s'ouvrira sur la page de sa phrase. */
let sentenceWanted: string | undefined;
export const openWhiteBookOnSentence = (id: string): void => {
  sentenceWanted = id;
};
/** La page voulue, prise une fois à l'ouverture du livre (undefined : rien de demandé). */
export const takeWhiteBookSentence = (): number | undefined => {
  const id = sentenceWanted;
  sentenceWanted = undefined;
  return id === undefined ? undefined : sentencePages.get(id);
};

/**
 * Les pages du livre blanc. Le sommaire tient sur une page tant qu'il ne se tasse pas ; sinon, le livre se refait avec un
 * sommaire sur deux pages, face à face (2 et 3) : les parties qui suivent sont décalées.
 */
export const createWhiteBookPages = (state: GameState, goTo: (page: number) => void): (LeafPage | null)[] => {
  const book = buildWhiteBook(state, goTo, false);
  return contentsFit(book.entries) ? book.pages : buildWhiteBook(state, goTo, true).pages;
};

const buildWhiteBook = (
  state: GameState,
  goTo: (page: number) => void,
  twoContents: boolean,
): { pages: (LeafPage | null)[]; entries: ContentsEntry[] } => {
  tasksPage = undefined;
  sentencePages.clear();
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
    ...(twoContents
      ? [
          createLeafPage(() => contentsItems(state, splitContents(entries)[0], CONTENTS), goTo),
          createLeafPage(() => contentsItems(state, splitContents(entries)[1], CONTENTS + 1), goTo),
        ]
      : [createLeafPage(() => contentsItems(state, entries, CONTENTS), goTo)]),
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
  // Titre d'une sous-partie, à gauche (une page blanche avant si besoin), en face de son premier contenu ; une ligne en
  // retrait au sommaire.
  const subPart = (key: string): void => {
    if (pages.length % 2 === 1) {
      const blank = pages.length;
      pages.push(createLeafPage(() => [folio(blank)], goTo));
    }
    entries.push({ title: () => t(`whiteBook.parts.${key}`), page: pages.length, sub: true });
    pages.push(createLeafPage(() => subPartLayout(key), goTo));
  };
  // L'Âge Automatique acheté, méthodes et intuitions se rangent par Âge, chacun sous son titre ; avant, rien ne le
  // laisse deviner.
  const byAge = starLit(state, AUTOMATIC_AGE);
  const ages = <T>(items: T[], ageOf: (item: T) => string | undefined, add: (item: T) => void): void => {
    if (!byAge) return items.forEach(add);
    for (const age of AGES) {
      const ofAge = items.filter((item) => ageOf(item) === age);
      if (ofAge.length === 0) continue;
      subPart(AGE_KEYS[age ?? 'manual']);
      ofAge.forEach(add);
    }
  };
  const sentencePage = (sentence: SentenceDef): void => {
    const number = pages.length;
    sentencePages.set(sentence.id, number);
    pages.push(
      createLeafPage(({ asking }) => sentenceLayout(state, sentence, number, asking, freshOf(sentence)), goTo, {
        onPay: () => guess(state, sentence.id),
      }),
    );
  };
  // Une méthode secrète n'a sa page qu'une fois son souvenir revenu (l'Etherium).
  const shown = (kind: SentenceKind): SentenceDef[] => ofKind(kind).filter((candidate) => sentenceShown(state, candidate.id));
  partTitle('method', 1);
  ages(shown('method'), (sentence) => sentence.age, sentencePage);
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
  const visible = TECHNOLOGIES.filter((tech) => !lasting(tech) && intuitionVisible(state, tech.id));
  // Rangées par Âge, celles qui ne tiennent à aucune méthode ont leur sous-partie, avant les Âges (elles ne sont d'aucun ;
  // remarque de l'auteur, 08/10) ; celle d'une méthode est de son Âge. Avant l'Âge Automatique, toutes à la suite.
  const general = byAge ? visible.filter((tech) => !('tool' in tech)) : [];
  if (general.length > 0) {
    subPart('general');
    general.forEach(intuitionPage);
  }
  ages(
    visible.filter((tech) => !general.includes(tech)),
    (tech) => TOOLS.find((tool) => 'tool' in tech && tool.id === tech.tool)?.age,
    intuitionPage,
  );
  // Les intuitions permanentes (des conforts, que l'Exil ne fait pas oublier) : une sous-partie.
  subPart('permanent');
  TECHNOLOGIES.filter((tech) => lasting(tech) && intuitionVisible(state, tech.id)).forEach(intuitionPage);
  partTitle('memory', 3);
  shown('memory').forEach(sentencePage);
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
  // Les tâches, dès le Nord de la Rose des vents : leur page de titre, « Aujourd'hui » à gauche, « Une seule fois » en face.
  if (tasksOpen(state)) {
    const onTasks = { onAct: (id: string) => actOnTask(state, id) };
    const title = pages.length + (pages.length % 2 === 0 ? 1 : 0);
    partTitle('task', 5, () => taskTitleItems(state, title));
    const today = pages.length;
    tasksPage = today;
    pages.push(createLeafPage(() => todayItems(state, today), goTo, onTasks));
    for (let part = 0; part < oncePageCount(state); part++) {
      const number = pages.length;
      pages.push(createLeafPage(() => onceItems(state, part, number), goTo, onTasks));
    }
  }
  return { pages: pages.length % 2 === 1 ? [...pages, null] : pages, entries };
};
