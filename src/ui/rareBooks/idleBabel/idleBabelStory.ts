import { messages } from '../../../i18n';

/**
 * Le récit du livre « Idle Babel » : un chapitre par phase de la fabrication (l'idée, la démo technique, la
 * première alpha…), des parties par fonctionnalité dans l'ordre où elles sont venues, sans dates. Le texte est
 * dans les traductions (rareBooks.idleBabel.pages) ; ici, l'ordre, et ce qui l'illustre : les planches des
 * couvertures retenues (dessinées par le jeu) et les pistes écartées (images de public/idle-babel/pistes/,
 * capturées des maquettes). Rien du livre de la fin : il ne doit pas être dévoilé.
 */

export type ChapterKey = keyof ReturnType<typeof pagesText>['chapters'];
export type SectionKey = keyof ReturnType<typeof pagesText>['sections'];
export type DraftGroup = keyof typeof DRAFT_GROUPS;

export interface StorySection {
  key: SectionKey;
  /** Une sous-partie de la partie qui la précède (titre plus petit, plus en retrait au sommaire). */
  sub?: boolean;
  /** Les livres rares dont la couverture retenue suit la partie (ids de arts.ts). */
  plates?: string[];
  /** Les pistes écartées hors livres qui la suivent. */
  drafts?: DraftGroup[];
}

export interface StoryChapter {
  key: ChapterKey;
  sections?: StorySection[];
}

export const pagesText = () => messages().rareBooks.idleBabel.pages;

/** Les pistes écartées de chaque couverture (après la planche de la couverture retenue). */
export const BOOK_DRAFTS: Record<string, string[]> = {
  alexH: ['alexH-a', 'alexH-b'],
  directory: ['directory-e'],
  blankPage: ['blankPage-a', 'blankPage-b', 'blankPage-c'],
  oriana: ['oriana-b', 'oriana-c'],
  alice: ['alice-b', 'alice-c'],
  mobyDick: ['mobyDick-b'],
  bible: ['bible-a'],
  arabianNights: ['arabianNights-a', 'arabianNights-b'],
  odyssey: ['odyssey-a'],
  quixote: ['quixote-b', 'quixote-c'],
  divineComedy: ['divineComedy-a', 'divineComedy-b'],
  credits: ['credits-a', 'credits-b'],
  idleBabel: ['idleBabel-a', 'idleBabel-b', 'idleBabel-c'],
};

/** Les pistes écartées hors livres : les fenêtres, les méthodes, la vitrine… */
export const DRAFT_GROUPS = {
  methods: ['methods-1', 'methods-2', 'methods-3', 'methods-4', 'methods-5'],
  modals: ['modal-a', 'modal-b', 'modal-c'],
  modalForms: ['modal-form-1', 'modal-form-3'],
  numerals: ['numerals-b'],
  showcase: ['showcase-a', 'showcase-b', 'showcase-c'],
};

export const STORY: StoryChapter[] = [
  { key: 'idea' },
  {
    key: 'demo',
    sections: [
      { key: 'reading' },
      { key: 'firstBooks' },
      { key: 'strangeBook' },
      { key: 'exerciseBook' },
      { key: 'seals' },
      { key: 'knowledge', drafts: ['methods'] },
      { key: 'depth' },
      { key: 'voice', drafts: ['modals', 'modalForms'] },
      { key: 'numerals', drafts: ['numerals'] },
      { key: 'anomalies' },
      // Toutes les couvertures au même endroit : une partie « Les livres », et dedans les rares puis les classiques.
      { key: 'books' },
      { key: 'rareBooks', sub: true, plates: ['deathBook', 'directory', 'blankPage', 'debug', 'alexH', 'oriana', 'credits', 'idleBabel'] },
      { key: 'classics', sub: true, plates: ['alice', 'mobyDick', 'bible', 'arabianNights', 'odyssey', 'quixote', 'divineComedy'] },
      { key: 'library', drafts: ['showcase'] },
      { key: 'credits' },
      { key: 'thisBook' },
    ],
  },
  { key: 'alpha' },
];

/** Les couvertures retenues montrées en planche, dans l'ordre du livre. */
export const PLATE_BOOKS = STORY.flatMap((chapter) => chapter.sections ?? []).flatMap((section) => section.plates ?? []);

/** Toutes les images de pistes écartées que le livre montre. */
export const DRAFT_IMAGES = [...Object.values(BOOK_DRAFTS), ...Object.values(DRAFT_GROUPS)].flat();
