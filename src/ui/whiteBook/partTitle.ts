import { t } from '../../i18n';
import { paragraph } from './paragraph';
import { roman, type Item } from '../strangeBook/pageItems';
import type { SentenceKind } from '../../data/sentences';

/**
 * Page de titre d'une partie du livre blanc (méthodes, souvenirs, anomalies), toujours sur une page de
 * droite : son numéro en chiffres romains, son nom, un filet, et quelques mots du chercheur.
 */
export const partTitleItems = (kind: SentenceKind, number: number): Item[] => [
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
  ...paragraph(t(`whiteBook.partDescriptions.${kind}`), 430, {
    left: 120,
    width: 400,
    size: 21,
    line: 30,
    align: 'center',
    italic: true,
    faded: true,
  }).items,
];
