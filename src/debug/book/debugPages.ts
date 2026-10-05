import { createLeafPage, type LeafPage } from '../../ui/strangeBook/pages';
import { folio, heading, type Item } from '../../ui/strangeBook/pageItems';
import { CHAPTERS, subjectName, type DebugSubject } from '../subjects/subject';
import { chapterSubjects } from '../subjects/catalog';
import { isPinned, togglePin } from '../pins';
import { shrinkTo, wrapTo } from './fitText';
import { RECAP_TITLE, recapPages } from './recapPages';

/** Entrées d'une page de chapitre : au plus tant, espacées d'autant (repère de la texture, 640 × 800). */
const PER_PAGE = 6;
const ENTRY_TOP = 176;
const ENTRY_STEP = 88;

const PIN_PREFIX = 'pin:';
/** Largeur d'une entrée, de son nom jusqu'à la marge de droite. */
const TEXT_ROOM = 640 - 112 - 60;

/** Page de titre : le livre dit ce qu'il est. */
const titleItems = (): Item[] => [
  { kind: 'text', text: 'DÉBOGAGE', x: 320, y: 300, size: 40, align: 'center', spacing: 10, face: 'title', initial: true },
  { kind: 'rule', y: 370, width: 260 },
  { kind: 'text', text: 'Tout ce qui est, tout ce qui peut être.', x: 320, y: 410, size: 20, align: 'center', italic: true, faded: true },
  {
    kind: 'text',
    text: 'Coche ce que tu veux suivre : il apparaît dans la barre.',
    x: 320,
    y: 620,
    size: 16,
    align: 'center',
    faded: true,
  },
];

/** Une page d'un chapitre : son titre, ses entrées ; `from` : première entrée (le chapitre continue). */
interface ChapterPage {
  chapter: number;
  subjects: DebugSubject[];
  from: number;
}

const chapterPages = (): ChapterPage[] =>
  CHAPTERS.flatMap((chapter, index) => {
    const subjects = chapterSubjects(chapter.id);
    return Array.from({ length: Math.ceil(subjects.length / PER_PAGE) }, (_, part) => ({
      chapter: index,
      subjects: subjects.slice(part * PER_PAGE, (part + 1) * PER_PAGE),
      from: part * PER_PAGE,
    }));
  });

/** Une entrée : sa case (losange plein une fois choisie), son nom, ce qu'on y trouve ; toute la ligne se clique. */
const entryItems = (subject: DebugSubject, top: number): Item[] => {
  const pinned = isPinned(subject.id);
  return [
    { kind: 'text', text: pinned ? '◆' : '◇', x: 74, y: top, size: 24, align: 'left', gold: pinned, faded: !pinned },
    // Trop longs, le nom rétrécit et la description passe sur deux lignes : rien ne déborde de la page.
    shrinkTo({ kind: 'text', text: subjectName(subject), x: 112, y: top, size: 23, align: 'left', gold: pinned }, TEXT_ROOM),
    ...wrapTo(
      { kind: 'text', text: subject.description, x: 112, y: top + 32, size: 15, align: 'left', italic: true, faded: true },
      TEXT_ROOM,
      2,
      20,
    ),
    { kind: 'action', id: `${PIN_PREFIX}${subject.id}`, y: top - 8, height: ENTRY_STEP - 10 },
  ];
};

const chapterItems = (page: ChapterPage, number: number): Item[] => {
  return [
    ...heading(CHAPTERS[page.chapter].title, page.chapter + 1),
    ...page.subjects.flatMap((subject, i) => entryItems(subject, ENTRY_TOP + i * ENTRY_STEP)),
    folio(number),
  ];
};

/** Lignes de la table : au plus tant par page, espacées d'autant ; au-delà, elle continue sur la page suivante. */
const CONTENTS_PER_PAGE = 8;
const CONTENTS_TOP = 180;
const CONTENTS_STEP = 60;

/** Une ligne de la table : un chapitre (et ses sujets choisis), ou le récapitulatif. */
interface ContentsEntry {
  title: string;
  target: number;
  chosen: number;
}

/** Les lignes de la table : un chapitre par ligne, la page où il commence, puis le récapitulatif (tous les chiffres du jeu). */
const contentsEntries = (pages: ChapterPage[], first: number): ContentsEntry[] => [
  ...CHAPTERS.map((chapter, index) => ({
    title: chapter.title,
    target: first + pages.findIndex((candidate) => candidate.chapter === index),
    chosen: chapterSubjects(chapter.id).filter((subject) => isPinned(subject.id)).length,
  })),
  { title: RECAP_TITLE, target: first + pages.length, chosen: 0 },
];

/** Pages de la table, CONTENTS_PER_PAGE lignes chacune. */
const contentsPageCount = (): number => Math.ceil((CHAPTERS.length + 1) / CONTENTS_PER_PAGE);

/** Une page de la table (`part` : 0 pour la première) ; un clic sur une ligne y va. */
const contentsItems = (entries: ContentsEntry[], part: number, number: number): Item[] => [
  ...heading(part === 0 ? 'Table' : 'Table, suite'),
  ...entries.slice(part * CONTENTS_PER_PAGE, (part + 1) * CONTENTS_PER_PAGE).flatMap((entry, index): Item[] => {
    const top = CONTENTS_TOP + index * CONTENTS_STEP;
    return [
      { kind: 'text', text: entry.title, x: 90, y: top, size: 26, align: 'left', spacing: 2 },
      ...(entry.chosen > 0
        ? [
            {
              kind: 'text',
              text: '◆'.repeat(Math.min(entry.chosen, 5)),
              x: 330,
              y: top + 4,
              size: 16,
              align: 'left',
              gold: true,
            } satisfies Item,
          ]
        : []),
      { kind: 'dots', x1: 420, x2: 520, y: top + 20 },
      { kind: 'text', text: String(entry.target + 1), x: 550, y: top, size: 26, align: 'right' },
      { kind: 'link', y: top - 10, height: 56, target: entry.target },
    ];
  }),
  folio(number),
];

/**
 * Les pages du livre de débogage, un catalogue : la page de titre, la table (sur deux pages si elle déborde), puis chaque chapitre et
 * ses sujets, et le récapitulatif des chiffres. Un clic sur un sujet le choisit (ou le retire) : il apparaît dans la barre de débogage.
 */
export const createDebugPages = (goTo: (page: number) => void): LeafPage[] => {
  const pages = chapterPages();
  // Les chapitres commencent après la page de titre et la table (une page de plus quand elle déborde).
  const tables = contentsPageCount();
  const first = 1 + tables;
  const onAct = (id: string): void => {
    if (id.startsWith(PIN_PREFIX)) togglePin(id.slice(PIN_PREFIX.length));
  };
  return [
    createLeafPage(titleItems, goTo),
    ...Array.from({ length: tables }, (_, part) =>
      createLeafPage(() => contentsItems(contentsEntries(pages, first), part, 2 + part), goTo),
    ),
    ...pages.map((page, index) => createLeafPage(() => chapterItems(page, first + index + 1), goTo, { onAct })),
    ...recapPages(goTo, first + pages.length, CHAPTERS.length + 1),
  ];
};
