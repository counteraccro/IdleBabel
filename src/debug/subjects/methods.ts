import { t } from '../../i18n';
import { TOOLS } from '../../data/tools';
import { SENTENCES } from '../../data/sentences';
import { buyTool, nextToolCost } from '../../systems/tools';
import { pagesPerSecond } from '../../systems/production';
import { currentTarget, segments, toolUnlocked, write, written } from '../../systems/sentences';
import { rewriteBigBook } from '../refresh';
import { duration, format, type DebugSubject } from './subject';
import type { GameState } from '../../core/state';

/** Débogage : efface ce qui est écrit d'une phrase dans le livre blanc. */
export const eraseSentence = (state: GameState, id: string): void => {
  delete state.written[id];
  rewriteBigBook();
};

export const completeSentence = (state: GameState, id: string): void => {
  write(
    state,
    id,
    segments(id).map((_, index) => index),
  );
  rewriteBigBook();
};

/** Une fiche par méthode de lecture : sa phrase, son niveau, ce qu'elle rapporte. */
export const METHOD_SUBJECTS: DebugSubject[] = TOOLS.map((tool) => {
  const sentence = SENTENCES.find((candidate) => candidate.tool === tool.id)?.id;
  return {
    id: `method:${tool.id}`,
    chapter: 'methods',
    name: () => t(`tools.${tool.id}.name`),
    description: 'Sa phrase, son niveau, son prix, ce qu’elle rapporte.',
    build: (kit, state) => {
      kit.info('État', () => {
        if (toolUnlocked(state, tool.id)) return 'découverte';
        return sentence !== undefined && currentTarget(state) === sentence ? 'à découvrir (phrase en cours)' : 'à découvrir (pas son tour)';
      });
      if (sentence !== undefined) {
        kit.info('Phrase', () => `${written(state, sentence).length} / ${segments(sentence).length} morceaux`);
        kit.buttons('', [
          ['Compléter la phrase', () => completeSentence(state, sentence)],
          ['Effacer', () => eraseSentence(state, sentence)],
        ]);
      }
      kit.number(
        'Niveau',
        () => state.tools[tool.id],
        (v) => (state.tools[tool.id] = v),
      );
      kit.buttons('', [
        ['+1', () => (state.tools[tool.id] += 1)],
        ['+10', () => (state.tools[tool.id] += 10)],
        ['Acheter', () => buyTool(state, tool.id)],
        ['0', () => (state.tools[tool.id] = 0)],
      ]);
      kit.info('Prix du suivant', () => `${format(nextToolCost(state, tool.id))} pages`);
      kit.info('Production', () => {
        const own = state.tools[tool.id] * tool.pagesPerSecond;
        const total = pagesPerSecond(state);
        const share = total > 0 ? ` (${format((own / total) * 100)} %)` : '';
        return `${format(tool.pagesPerSecond)} /s chacune → ${format(own)} /s${share}`;
      });
      kit.info('Achat possible', () => {
        const missing = nextToolCost(state, tool.id) - state.pages;
        if (missing <= 0) return 'maintenant';
        if (pagesPerSecond(state) === 0) return 'jamais seul : rien ne produit';
        return `dans ${duration(missing / pagesPerSecond(state))}`;
      });
    },
  };
});
