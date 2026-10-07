import { UNLOCK_ALL_SUBJECT } from './unlockAll';
import { RESOURCE_SUBJECTS } from './resources';
import { SEED_SUBJECT } from './seed';
import { METHOD_SUBJECTS } from './methods';
import { INTUITION_SUBJECTS } from './intuitions';
import { PRESTIGE_SUBJECTS } from './prestige';
import { SENTENCE_SUBJECTS } from './sentences';
import { ALL_SENTENCES_SUBJECT } from './allSentences';
import { BOOK_SUBJECTS } from './books';
import { RARE_BOOK_SUBJECT } from './rareBooks';
import { LORE_SUBJECTS } from './lore';
import { SEAL_SUBJECTS } from './seals';
import { DISPLAY_SUBJECTS } from './display';
import { CHAPTERS, type ChapterId, type DebugSubject } from './subject';

/** Tout ce que recense le livre de débogage, chapitre après chapitre. */
export const SUBJECTS: readonly DebugSubject[] = [
  UNLOCK_ALL_SUBJECT,
  ...RESOURCE_SUBJECTS,
  SEED_SUBJECT,
  ...METHOD_SUBJECTS,
  ...INTUITION_SUBJECTS,
  ...PRESTIGE_SUBJECTS,
  ALL_SENTENCES_SUBJECT,
  ...SENTENCE_SUBJECTS,
  ...BOOK_SUBJECTS,
  RARE_BOOK_SUBJECT,
  ...LORE_SUBJECTS,
  ...SEAL_SUBJECTS,
  ...DISPLAY_SUBJECTS,
];

export const subjectById = (id: string): DebugSubject | undefined => SUBJECTS.find((subject) => subject.id === id);

export const chapterSubjects = (chapter: ChapterId): DebugSubject[] => SUBJECTS.filter((subject) => subject.chapter === chapter);

/** Les sujets dans l'ordre du livre : chapitre après chapitre, puis dans l'ordre de chaque chapitre. */
export const BOOK_ORDER: readonly string[] = CHAPTERS.flatMap((chapter) => chapterSubjects(chapter.id).map((subject) => subject.id));
