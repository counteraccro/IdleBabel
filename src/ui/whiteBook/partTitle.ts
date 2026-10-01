import { t } from '../../i18n';
import { writeDigits } from '../../core/format';
import { SENTENCES, type SentenceKind } from '../../data/sentences';
import { isComplete } from '../../systems/sentences';
import { paragraph } from './paragraph';
import { roman, type Item } from '../strangeBook/pageItems';
import type { GameState } from '../../core/state';

/**
 * Page de titre d'une partie du livre blanc (méthodes, souvenirs, anomalies), toujours sur une page de
 * droite : son numéro en chiffres romains, son nom, un filet, quelques mots du chercheur, et la part de
 * ses phrases déjà complètes.
 */
export const partTitleItems = (state: GameState, kind: SentenceKind, number: number): Item[] => {
  const sentences = SENTENCES.filter((sentence) => sentence.kind === kind);
  const done = sentences.filter((sentence) => isComplete(state, sentence.id)).length;
  const percent = Math.floor((done / Math.max(1, sentences.length)) * 100);
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
