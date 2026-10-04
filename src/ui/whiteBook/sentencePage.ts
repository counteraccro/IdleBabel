import { getLocale, t } from '../../i18n';
import { formatNumber } from '../../core/format';
import { TOOLS } from '../../data/tools';
import { toolRate } from '../../systems/production';
import { isComplete, segments, sentenceSource, written } from '../../systems/sentences';
import { babelize, seedOf } from './babelMask';
import { paragraph, wordsParagraph, type Word } from './paragraph';
import type { SentenceDef } from '../../data/sentences';
import type { Item } from '../strangeBook/pageItems';
import type { GameState } from '../../core/state';

const COLUMN = { left: 80, width: 480 };

export interface SentenceView {
  /** La phrase est complète : tout se lit. Sinon, tout n'est que la forme de ce qui sera écrit. */
  known: boolean;
  /** Elle vient de se compléter : la page apparaît en fondu. */
  reveal: boolean;
  /** Ce morceau vient d'être trouvé : ses lettres s'ordonnent. */
  fresh: (segment: number) => boolean;
}

/**
 * La phrase, mot à mot : les morceaux trouvés (`done`) à l'encre, les autres en symboles fantômes (les
 * mêmes dans le livre blanc et dans le livre étrange).
 */
export const sentenceWords = (sentence: SentenceDef, done: number[], fresh: (segment: number) => boolean = () => false): Word[] => {
  const words = segments(sentence.id).flatMap((text, segment) => {
    const found = done.includes(segment);
    const shown = found ? text : babelize(text, seedOf(`${sentence.id}:${segment}`));
    const gather = found && fresh(segment);
    return shown
      .split(' ')
      .map((word): Word => ({ text: word, key: found ? `found:${segment}` : 'ghost', ink: found ? undefined : 'ghost', gather }));
  });
  words[0] = { ...words[0], text: `« ${words[0].text}` };
  const last = words.length - 1;
  words[last] = { ...words[last], text: `${words[last].text} »` };
  return words;
};

/** Auteur ou référence d'une citation, sous elle, à droite de la colonne. */
export const sourceItem = (source: string, y: number, size: number, reveal?: number): Item => ({
  kind: 'text',
  text: `— ${source}`,
  x: 560,
  y,
  size,
  align: 'right',
  italic: true,
  faded: true,
  reveal,
});

/**
 * Corps d'une page du livre blanc, sous le sceau et le nom : la phrase en épigraphe ; pour une
 * méthode, ses chiffres, ce qu'elle fait et une citation obscure tirée d'un volume de la Bibliothèque.
 * Tant que la phrase n'est pas complète, ce ne sont que des symboles de Babel de la même forme (un
 * squelette de la page), et les chiffres restent cachés.
 */
export const sentenceBody = (state: GameState, sentence: SentenceDef, top: number, view: SentenceView): Item[] => {
  const delay = (ms: number): number | undefined => (view.reveal ? ms : undefined);
  const words = sentenceWords(sentence, written(state, sentence.id), view.fresh);
  const tool = TOOLS.find((candidate) => candidate.id === sentence.tool);
  if (!tool) {
    // Souvenir, anomalie : la phrase seule, au milieu de la page ; une citation, son auteur dessous une
    // fois complète.
    const alone = wordsParagraph(words, top + 120, { ...COLUMN, size: 24, line: 34, align: 'center', italic: true, reveal: delay(0) });
    const source = isComplete(state, sentence.id) ? sentenceSource(sentence.id) : undefined;
    return [...alone.items, ...(source ? [sourceItem(source, alone.bottom + 12, 18, delay(600))] : [])];
  }
  const text = (key: string): string => {
    const real = t(`whiteBook.methods.${tool.id}.${key}`);
    return view.known ? real : babelize(real, seedOf(`${tool.id}:${key}`));
  };
  const ink = view.known ? undefined : 'ghost';
  const epigraph = wordsParagraph(words, top, { ...COLUMN, size: 22, line: 30, align: 'center', italic: true, reveal: delay(0) });
  const statTop = epigraph.bottom + 14;
  const stat = t('whiteBook.stat')
    .replace('{n}', formatNumber(toolRate(state, tool.id), getLocale()))
    .replace('{count}', formatNumber(state.tools[tool.id], getLocale()));
  const description = paragraph(
    text('description'),
    statTop + 46,
    { ...COLUMN, size: 21, line: 30, align: 'left', reveal: delay(400) },
    ink,
  );
  const separatorTop = description.bottom + 16;
  const quote = paragraph(
    text('quote'),
    separatorTop + 38,
    { ...COLUMN, size: 19, line: 25, align: 'left', italic: true, faded: true, reveal: delay(900) },
    ink,
  );
  return [
    ...epigraph.items,
    // Les chiffres de la méthode ne se montrent qu'une fois découverte : rien à deviner avant.
    ...(view.known
      ? [
          {
            kind: 'text',
            text: stat,
            x: 320,
            y: statTop,
            size: 15,
            align: 'center',
            faded: true,
            caps: true,
            spacing: 1,
            reveal: delay(250),
          } satisfies Item,
        ]
      : []),
    ...description.items,
    { kind: 'text', text: '·   ·   ·', x: 320, y: separatorTop, size: 18, align: 'center', faded: true, reveal: delay(800) },
    ...quote.items,
    {
      kind: 'text',
      text: `— ${text('source')}`,
      x: 560,
      y: quote.bottom + 8,
      size: 16,
      align: 'right',
      italic: true,
      faded: true,
      ink,
      reveal: delay(1500),
    },
  ];
};
