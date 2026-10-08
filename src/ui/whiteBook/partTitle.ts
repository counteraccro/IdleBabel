import { t } from '../../i18n';
import { writeDigits } from '../../core/format';
import { SENTENCES, type SentenceKind } from '../../data/sentences';
import { isComplete, sentenceShown } from '../../systems/sentences';
import { paragraph } from './paragraph';
import { roman, type Item } from '../strangeBook/pageItems';
import type { GameState } from '../../core/state';

/** Parties du livre blanc : celles des phrases, et les intuitions (achetées, sans phrase). */
export type WhiteBookPart = SentenceKind | 'intuition';

/**
 * Page de titre d'une partie du livre blanc (méthodes, souvenirs, anomalies), toujours sur une page de
 * droite : son numéro en chiffres romains, son nom, un filet, quelques mots du chercheur, et la part de
 * ses phrases déjà complètes.
 */
export const partTitleItems = (state: GameState, kind: SentenceKind, number: number): Item[] => {
  const sentences = SENTENCES.filter((sentence) => sentence.kind === kind && sentenceShown(state, sentence.id));
  const done = sentences.filter((sentence) => isComplete(state, sentence.id)).length;
  return partTitleLayout(kind, number, done / Math.max(1, sentences.length));
};

/** La page de titre d'une partie, `share` (de 0 à 1) de son contenu déjà là. */
export const partTitleLayout = (kind: WhiteBookPart, number: number, share: number): Item[] => {
  const percent = Math.floor(share * 100);
  const description = paragraph(t(`whiteBook.partDescriptions.${kind}`), 430, {
    left: 120,
    width: 400,
    size: 21,
    line: 30,
    align: 'center',
    italic: true,
    faded: true,
  });
  return [
    { kind: 'text', text: roman(number), x: 320, y: 270, size: 22, align: 'center', spacing: 8, gold: true, face: 'title' },
    {
      kind: 'text',
      text: t(`whiteBook.parts.${kind}`).toLocaleUpperCase(),
      x: 320,
      y: 310,
      size: 40,
      align: 'center',
      spacing: 8,
      face: 'title',
      initial: true,
    },
    { kind: 'rule', y: 385, width: 240 },
    ...description.items,
    { kind: 'text', text: '·   ·   ·', x: 320, y: description.bottom + 24, size: 18, align: 'center', faded: true },
    // Police des titres : ses chiffres ont la hauteur des capitales, comme le « % » (ceux du texte, plus
    // bas, le laissent flotter au-dessus).
    {
      kind: 'text',
      text: writeDigits(`${percent} %`),
      x: 320,
      y: description.bottom + 62,
      size: 28,
      align: 'center',
      spacing: 2,
      face: 'title',
    },
  ];
};

/**
 * Page de titre d’une sous-partie (les intuitions générales, permanentes, d’un Âge), à gauche, en face de son contenu : son
 * nom, un filet, quelques mots du chercheur ; ni numéro, ni part déjà là.
 */
export const subPartLayout = (key: string): Item[] => {
  const description = paragraph(t(`whiteBook.partDescriptions.${key}`), 430, {
    left: 120,
    width: 400,
    size: 21,
    line: 30,
    align: 'center',
    italic: true,
    faded: true,
  });
  return [
    {
      kind: 'text',
      text: t(`whiteBook.parts.${key}`).toLocaleUpperCase(),
      x: 320,
      y: 320,
      size: 26,
      align: 'center',
      spacing: 5,
      face: 'title',
      initial: true,
    },
    { kind: 'rule', y: 385, width: 200 },
    ...description.items,
  ];
};
