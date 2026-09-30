import { RESOURCE_SUBJECTS } from './resources';
import { METHOD_SUBJECTS } from './methods';
import { SENTENCE_SUBJECTS } from './sentences';
import { BOOK_SUBJECTS } from './books';
import { LORE_SUBJECTS } from './lore';
import { SEAL_SUBJECTS } from './seals';
import { DISPLAY_SUBJECTS } from './display';
import type { ChapterId, DebugSubject } from './subject';

/** Tout ce que recense le livre de débogage, chapitre après chapitre. */
export const SUBJECTS: readonly DebugSubject[] = [
  ...RESOURCE_SUBJECTS,
  ...METHOD_SUBJECTS,
  ...SENTENCE_SUBJECTS,
  ...BOOK_SUBJECTS,
  ...LORE_SUBJECTS,
  ...SEAL_SUBJECTS,
  ...DISPLAY_SUBJECTS,
];

export const subjectById = (id: string): DebugSubject | undefined => SUBJECTS.find((subject) => subject.id === id);

export const chapterSubjects = (chapter: ChapterId): DebugSubject[] => SUBJECTS.filter((subject) => subject.chapter === chapter);
