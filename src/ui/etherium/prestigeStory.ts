import './etherium.css';
import { el } from '../dom';
import { openModal, type ModalAction } from '../modal/modal';
import { goThroughTheDark, PARAGRAPH_MS, storyLines } from '../lore';
import { messages } from '../../i18n';
import { formatNumber } from '../../core/format';
import { getLocale } from '../../i18n';
import { saveGame } from '../../core/save';
import { prestige, prestigeGain } from '../../systems/prestige';
import type { GameState } from '../../core/state';

/** L'adresse de la page de l'Etherium (ui/app.ts). */
export const ETHERIUM_HASH = '#etherium';

/**
 * Une modale du prestige (conception §4.1) : ses strophes apparaissent l'une après
 * l'autre, les vers à la ligne, puis `extra` (une précision, plus petite), puis les boutons.
 */
const tell = (
  title: string,
  stanzas: string[],
  actions: ModalAction[],
  backdrop: 'dim' | 'black' = 'dim',
  extra?: string,
  enterConfirms = true,
): void => {
  const story = storyLines(stanzas.length);
  story.root.classList.add('prestige-story');
  story.lines.forEach((line, index) => (line.textContent = stanzas[index]));
  const body = [story.root];
  if (extra) {
    const note = el('p', 'prestige-warning', extra);
    note.style.animationDelay = `${stanzas.length * PARAGRAPH_MS}ms`;
    body.push(note);
  }
  const modal = openModal({ title, body, actions, backdrop, enterConfirms });
  modal.root.querySelector<HTMLElement>('.modal-actions')!.style.animationDelay = `${(stanzas.length + (extra ? 1 : 0)) * PARAGRAPH_MS}ms`;
};

/**
 * L'Etherium de la pile, cliqué quand son ouverture rapporte : une confirmation courte, à chaque fois (ce qui sera
 * perdu, l'Éther gagné ; « Ouvrir » se clique, pas d'Entrée machinale). L'ouvrir, c'est le prestige : au premier,
 * le récit de l'ouverture (texte validé par l'auteur, version B), puis ses pages ; ensuite, ses pages aussitôt.
 */
export const offerEtherium = (state: GameState): void => {
  const etherium = messages().etherium;
  const gain = prestigeGain(state);
  if (gain < 1) return;
  const first = state.exiles === 0;
  tell(
    etherium.confirm.title,
    [],
    [
      { label: etherium.confirm.stay, kind: 'secondary' },
      {
        label: etherium.confirm.open,
        kind: 'primary',
        onClick: () => {
          // Rien à gagner entre-temps (Éther changé au débogage) : pas de prestige.
          if (prestige(state) < 1) return;
          saveGame(state);
          if (!first) return goThroughTheDark(ETHERIUM_HASH);
          const opening = etherium.opening;
          tell(
            opening.title,
            opening.text,
            [{ label: opening.button, kind: 'primary', onClick: () => goThroughTheDark(ETHERIUM_HASH) }],
            'black',
          );
        },
      },
    ],
    'dim',
    etherium.confirm.warning.replace('{n}', formatNumber(gain, getLocale())),
    false,
  );
};
