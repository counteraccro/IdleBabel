import { t } from '../../i18n';
import { el } from '../../ui/dom';
import { SENTENCES, type SentenceKind } from '../../data/sentences';
import { currentTarget, guessPrice, segments, write, written } from '../../systems/sentences';
import { rewriteBigBook } from '../refresh';
import { completeSentence, eraseSentence } from './methods';
import type { DebugSubject } from './subject';

const KINDS: Record<SentenceKind, string> = { method: 'méthode', memory: 'histoire (souvenir)', anomaly: 'juste là (anomalie)' };

/** Début de la phrase, pour la reconnaître dans le livre. */
const opening = (id: string): string => {
  const [first = id, second] = segments(id);
  return second === undefined ? first : `${first} ${second.replace(/[\s,;:.]+$/, '')}…`;
};

/** Une fiche par phrase du livre blanc : ses morceaux, écrits ou non, qu'un clic écrit ou efface. */
export const SENTENCE_SUBJECTS: DebugSubject[] = SENTENCES.map((sentence) => ({
  id: `sentence:${sentence.id}`,
  chapter: 'sentences',
  name: () => (sentence.tool ? `${t(`tools.${sentence.tool}.name`)} (phrase)` : `« ${opening(sentence.id)} »`),
  description: `${KINDS[sentence.kind]} : ses morceaux, un par un.`,
  build: (kit, state) => {
    kit.info('Sorte', () => KINDS[sentence.kind] + (currentTarget(state) === sentence.id ? ', en cours' : ''));
    kit.info('Écrits', () => `${written(state, sentence.id).length} / ${segments(sentence.id).length}`);
    // Les morceaux : écrits en clair, manquants barrés ; un clic écrit ou efface le morceau.
    const list = el('div', 'debug-segments');
    const draw = (): void => {
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
    kit.custom(list);
    let shown = '';
    kit.info('Deviner', () => {
      // Relu avec les autres lignes : les morceaux se redessinent quand ce qui est écrit change.
      const now = written(state, sentence.id).join(',');
      if (now !== shown || list.childElementCount === 0) {
        shown = now;
        draw();
      }
      const price = guessPrice(state, sentence.id);
      return price === undefined ? 'non (il manque plus d’un morceau, ou rien)' : `oui, ${price} 🧠`;
    });
    kit.buttons('', [
      ['Compléter', () => completeSentence(state, sentence.id)],
      ['Effacer', () => eraseSentence(state, sentence.id)],
    ]);
  },
}));
