import { t } from '../../i18n';
import { SENTENCES, type SentenceDef } from '../../data/sentences';
import { ANOMALY_FAMILIES } from '../../data/anomalies';
import { isComplete, segments, write } from '../../systems/sentences';
import { rewriteBigBook } from '../refresh';
import type { GameState } from '../../core/state';
import type { DebugSubject } from './subject';

/** Phrases complètes sur le total. */
const count = (state: GameState, sentences: readonly SentenceDef[]): [number, number] => [
  sentences.filter((sentence) => isComplete(state, sentence.id)).length,
  sentences.length,
];

const writeAll = (state: GameState, sentences: readonly SentenceDef[]): void => {
  for (const sentence of sentences)
    write(
      state,
      sentence.id,
      segments(sentence.id).map((_, index) => index),
    );
  rewriteBigBook();
};

const methods = SENTENCES.filter((sentence) => sentence.kind === 'method');
const anomalies = SENTENCES.filter((sentence) => sentence.kind === 'anomaly');

/** Toutes les phrases d'un coup : les écrire (tout, ou une sorte), ou tout effacer. */
export const ALL_SENTENCES_SUBJECT: DebugSubject = {
  id: 'sentences:all',
  chapter: 'sentences',
  name: () => 'Toutes les phrases',
  description: 'Tout écrire ou tout effacer d’un coup ; avancement par sorte et par famille d’anomalies.',
  peek: (state) => count(state, SENTENCES).join('/'),
  build: (kit, state) => {
    kit.progress('Toutes', () => count(state, SENTENCES));
    kit.progress('Méthodes', () => count(state, methods));
    kit.progress('Anomalies', () => count(state, anomalies));
    for (const family of ANOMALY_FAMILIES) {
      const sentences = anomalies.filter((sentence) => sentence.family === family);
      kit.progress(`· ${t(`whiteBook.anomalyFamilies.${family}`)}`, () => count(state, sentences));
    }
    kit.actions(
      ['Tout écrire', () => writeAll(state, SENTENCES), { title: 'Méthodes comprises : elles se débloquent toutes.' }],
      ['Anomalies', () => writeAll(state, anomalies), { title: 'Les anomalies seules (leurs sceaux de famille suivent).' }],
      [
        'Tout effacer',
        () => {
          state.written = {};
          rewriteBigBook();
        },
        { danger: true },
      ],
    );
  },
};
