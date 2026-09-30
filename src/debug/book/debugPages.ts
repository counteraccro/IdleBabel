import { createLeafPage, type LeafPage } from '../../ui/strangeBook/pages';
import { folio, heading, type Item } from '../../ui/strangeBook/pageItems';
import { CHAPTERS, subjectName, type DebugSubject } from '../subjects/subject';
import { chapterSubjects } from '../subjects/catalog';
import { isPinned, togglePin } from '../pins';

/** Entrées d'une page de chapitre : au plus tant, espacées d'autant (repère de la texture, 640 × 800). */
const PER_PAGE = 6;
const ENTRY_TOP = 176;
const ENTRY_STEP = 88;

const PIN_PREFIX = 'pin:';

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
    { kind: 'text', text: subjectName(subject), x: 112, y: top, size: 23, align: 'left', gold: pinned },
    { kind: 'text', text: subject.description, x: 112, y: top + 34, size: 15, align: 'left', italic: true, faded: true },
    { kind: 'action', id: `${PIN_PREFIX}${subject.id}`, y: top - 8, height: ENTRY_STEP - 10 },
  ];
};

const chapterItems = (page: ChapterPage, number: number): Item[] => {
  const title = CHAPTERS[page.chapter].title + (page.from > 0 ? ' (suite)' : '');
  return [
    ...heading(title, page.chapter + 1),
    ...page.subjects.flatMap((subject, i) => entryItems(subject, ENTRY_TOP + i * ENTRY_STEP)),
    folio(number),
  ];
};

/** Sommaire : un chapitre par ligne, la page où il commence ; un clic y va. */
const contentsItems = (pages: ChapterPage[], first: number): Item[] => [
  ...heading('Table'),
  ...CHAPTERS.flatMap((chapter, index): Item[] => {
    const page = first + pages.findIndex((candidate) => candidate.chapter === index);
    const top = 180 + index * 60;
    const chosen = chapterSubjects(chapter.id).filter((subject) => isPinned(subject.id)).length;
    return [
      { kind: 'text', text: chapter.title, x: 90, y: top, size: 26, align: 'left', spacing: 2 },
      ...(chosen > 0
        ? [{ kind: 'text', text: '◆'.repeat(Math.min(chosen, 5)), x: 330, y: top + 4, size: 16, align: 'left', gold: true } satisfies Item]
        : []),
      { kind: 'dots', x1: 420, x2: 520, y: top + 20 },
      { kind: 'text', text: String(page + 1), x: 550, y: top, size: 26, align: 'right' },
      { kind: 'link', y: top - 10, height: 56, target: page },
    ];
  }),
  folio(2),
];

/**
 * Les pages du livre de débogage, un catalogue : la page de titre, la table, puis chaque chapitre et
 * ses sujets. Un clic sur un sujet le choisit (ou le retire) : il apparaît dans la barre de débogage.
 */
export const createDebugPages = (goTo: (page: number) => void): LeafPage[] => {
  const pages = chapterPages();
  const first = 2;
  const onAct = (id: string): void => {
    if (id.startsWith(PIN_PREFIX)) togglePin(id.slice(PIN_PREFIX.length));
  };
  return [
    createLeafPage(titleItems, goTo),
    createLeafPage(() => contentsItems(pages, first), goTo),
    ...pages.map((page, index) => createLeafPage(() => chapterItems(page, first + index + 1), goTo, { onAct })),
  ];
};
