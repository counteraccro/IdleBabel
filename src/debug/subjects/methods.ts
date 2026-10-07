import { t } from '../../i18n';
import { TOOLS } from '../../data/tools';
import { SENTENCES } from '../../data/sentences';
import { buyTool, nextToolCost } from '../../systems/tools';
import { pagesPerSecond, toolRate } from '../../systems/production';
import { currentTarget, segments, toolUnlocked, write, written } from '../../systems/sentences';
import { rewriteBigBook } from '../refresh';
import { compact, duration, format, type Action, type DebugSubject } from './subject';
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
    peek: (state) => {
      const level = `niv. ${compact(state.tools[tool.id])}`;
      return sentence === undefined ? level : `${level} · ${written(state, sentence).length}/${segments(sentence).length}`;
    },
    build: (kit, state) => {
      kit.number(
        'Niveau',
        () => state.tools[tool.id],
        (v) => (state.tools[tool.id] = v),
        { hint: 'Les boutons ajoutent ou retirent sans rien dépenser.', steps: true },
      );
      kit.info('État', () => {
        if (toolUnlocked(state, tool.id)) return 'découverte';
        return sentence !== undefined && currentTarget(state) === sentence ? 'à découvrir (phrase en cours)' : 'à découvrir (pas son tour)';
      });
      if (sentence !== undefined) kit.progress('Phrase', () => [written(state, sentence).length, segments(sentence).length]);
      kit.info('Prix du suivant', () => `${format(Math.ceil(nextToolCost(state, tool.id)))} pages`);
      kit.info('Production', () => {
        // Ce que lit vraiment un exemplaire : intuitions et Etherium compris.
        const rate = toolRate(state, tool.id);
        const own = state.tools[tool.id] * rate;
        const total = pagesPerSecond(state);
        const share = total > 0 ? ` (${format((own / total) * 100)} %)` : '';
        return `${format(rate)}/s × ${format(state.tools[tool.id])} = ${format(own)}/s${share}`;
      });
      kit.info('Achat possible', () => {
        const missing = nextToolCost(state, tool.id) - state.pages;
        if (missing <= 0) return 'maintenant';
        if (pagesPerSecond(state) === 0) return 'jamais : rien ne produit';
        return `dans ${duration(missing / pagesPerSecond(state))}`;
      });
      kit.actions(
        ...(sentence === undefined ? [] : [['Compléter la phrase', () => completeSentence(state, sentence)] as Action]),
        ['Acheter', () => buyTool(state, tool.id), { title: 'Comme dans le jeu : dépense les pages' }],
        ...(sentence === undefined
          ? []
          : [['Effacer', () => eraseSentence(state, sentence), { danger: true, title: 'Efface la phrase du livre blanc' }] as Action]),
      );
    },
  };
});
