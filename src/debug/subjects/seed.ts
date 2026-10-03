import { el } from '../../ui/dom';
import { newGameSeed, parseSeed, seedLabel } from '../../core/random';
import { saveGame } from '../../core/save';
import { refreshBook, refreshLibrary } from '../refresh';
import type { GameState } from '../../core/state';
import type { DebugSubject } from './subject';

/** Ce qu'une autre graine change : dit au survol et dans la fiche, avant de la changer. */
const IMPACT =
  'Changer la graine change toute la suite de la partie : couvertures, texte et numéros des pages, place des livres rares pas encore trouvés, trouvailles. Ce qui est déjà trouvé ou gagné reste.';

/** Une autre graine pour la partie : enregistrée tout de suite, le livre en main et la bibliothèque se redessinent. */
const reseed = (state: GameState, seed: number): void => {
  state.seed = seed;
  saveGame(state);
  refreshBook();
  refreshLibrary();
};

/**
 * La graine de la partie (GameState.seed) : celle qu'un joueur lit dans son cahier d'options et nous donne,
 * pour retrouver ses tirages ; ici on peut la changer.
 */
export const SEED_SUBJECT: DebugSubject = {
  id: 'seed',
  chapter: 'resources',
  name: 'La graine',
  description: 'D’où sont tirés couvertures, pages, livres rares et trouvailles.',
  peek: (state) => seedLabel(state.seed),
  build: (kit, state) => {
    kit.info(
      'Graine',
      () => (state.seed ? seedLabel(state.seed) : '0 (partie d’avant les graines)'),
      'Celle qu’écrit le cahier d’options.',
    );
    const input = el('input', 'debug-field');
    input.placeholder = '3F2A9C1B';
    kit.row('Nouvelle graine', input, '8 chiffres hexadécimaux au plus. 0 : la Bibliothèque d’avant les graines.');
    const warning = el('p', 'debug-warning');
    warning.textContent = `⚠ ${IMPACT}`;
    kit.custom(warning);
    kit.actions(
      [
        'Appliquer',
        () => {
          const seed = parseSeed(input.value.trim());
          if (seed === null) {
            input.setCustomValidity('Graine illisible');
            input.reportValidity();
            return;
          }
          input.setCustomValidity('');
          input.value = '';
          reseed(state, seed);
        },
        { danger: true, title: IMPACT },
      ],
      ['Au hasard', () => reseed(state, newGameSeed()), { danger: true, title: IMPACT }],
    );
  },
};
