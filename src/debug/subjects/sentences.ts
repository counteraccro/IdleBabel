import { t } from '../../i18n';
import { el } from '../../ui/dom';
import { SENTENCES, type SentenceDef } from '../../data/sentences';
import { ANOMALY_FAMILIES, type AnomalyFamily } from '../../data/anomalies';
import { guessPrice, isComplete, segments, write, written } from '../../systems/sentences';
import { rewriteBigBook } from '../refresh';
import { completeSentence, eraseSentence } from './methods';
import type { GameState } from '../../core/state';
import type { CardKit, DebugSubject } from './subject';

/** Début de la phrase, pour la reconnaître dans le livre. */
const opening = (id: string): string => {
  const [first = id, second] = segments(id);
  return second === undefined ? first : `${first} ${second.replace(/[\s,;:.]+$/, '')}…`;
};

/**
 * Les morceaux de quelques phrases, écrits en clair, manquants barrés ; un clic écrit ou efface le
 * morceau. Une ligne de la fiche les redessine quand ce qui est écrit change (relue toutes les 250 ms).
 */
const segmentLists = (kit: CardKit, state: GameState, sentences: readonly SentenceDef[], label: string, read: () => string): void => {
  const lists = sentences.map(() => el('div', 'debug-segments'));
  const draw = (sentence: SentenceDef, list: HTMLElement): void => {
    const done = written(state, sentence.id);
    list.replaceChildren(
      ...segments(sentence.id).map((text, index) => {
        const button = el('button', done.includes(index) ? 'written' : 'missing', text);
        button.title = done.includes(index) ? 'Écrit : cliquer pour l’effacer' : 'Manquant : cliquer pour l’écrire';
        button.addEventListener('click', () => {
          if (done.includes(index)) state.written[sentence.id] = done.filter((segment) => segment !== index);
          else write(state, sentence.id, [index]);
          rewriteBigBook();
        });
        return button;
      }),
    );
  };
  for (const list of lists) kit.custom(list);
  let shown = '';
  kit.info(label, () => {
    const now = sentences.map((sentence) => written(state, sentence.id).join(',')).join('|');
    if (now !== shown || lists[0]?.childElementCount === 0) {
      shown = now;
      sentences.forEach((sentence, index) => draw(sentence, lists[index]));
    }
    return read();
  });
};

/** Une fiche par souvenir (phrase d'histoire) : ses morceaux, un par un. */
const MEMORY_SUBJECTS: DebugSubject[] = SENTENCES.filter((sentence) => sentence.kind === 'memory').map((sentence) => ({
  id: `sentence:${sentence.id}`,
  chapter: 'sentences',
  name: () => `« ${opening(sentence.id)} »`,
  description: 'Souvenir (histoire) : ses morceaux, un par un.',
  peek: (state) => `${written(state, sentence.id).length}/${segments(sentence.id).length}`,
  build: (kit, state) => {
    kit.progress('Écrits', () => [written(state, sentence.id).length, segments(sentence.id).length]);
    segmentLists(kit, state, [sentence], 'Deviner', () => {
      const price = guessPrice(state, sentence.id);
      return price === undefined ? 'non' : `oui, ${price} 🧠`;
    });
    kit.actions(
      ['Compléter', () => completeSentence(state, sentence.id)],
      ['Effacer', () => eraseSentence(state, sentence.id), { danger: true }],
    );
  },
}));

const complete = (state: GameState, sentences: readonly SentenceDef[]): number =>
  sentences.filter((sentence) => isComplete(state, sentence.id)).length;

/** Une fiche par famille d'anomalies : ses phrases et leurs morceaux, la famille d'un coup. */
const familySubject = (family: AnomalyFamily): DebugSubject => {
  const sentences = SENTENCES.filter((sentence) => sentence.family === family);
  return {
    id: `anomalies:${family}`,
    chapter: 'sentences',
    name: () => `Anomalies : ${t(`strangeBook.anomalyFamilies.${family}`)}`,
    description: 'Ses phrases, morceau par morceau ; toute la famille d’un coup (son sceau suit).',
    peek: (state) => `${complete(state, sentences)}/${sentences.length}`,
    build: (kit, state) => {
      kit.progress('Complètes', () => [complete(state, sentences), sentences.length]);
      segmentLists(kit, state, sentences, 'Morceaux', () =>
        String(sentences.reduce((sum, sentence) => sum + written(state, sentence.id).length, 0)),
      );
      kit.actions(
        ['Écrire la famille', () => sentences.forEach((sentence) => completeSentence(state, sentence.id))],
        ['Effacer', () => sentences.forEach((sentence) => eraseSentence(state, sentence.id)), { danger: true }],
      );
    },
  };
};

/** Les phrases hors méthodes (celles-ci ont leur fiche de méthode) : souvenirs, puis familles d'anomalies. */
export const SENTENCE_SUBJECTS: DebugSubject[] = [...MEMORY_SUBJECTS, ...ANOMALY_FAMILIES.map(familySubject)];
