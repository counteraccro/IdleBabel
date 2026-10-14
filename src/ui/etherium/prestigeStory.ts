import './etherium.css';
import { el } from '../dom';
import { openModal, type ModalAction } from '../modal/modal';
import { PARAGRAPH_MS, storyLines } from '../lore';
import { messages } from '../../i18n';
import { formatNumber } from '../../core/format';
import { getLocale } from '../../i18n';
import { saveGame } from '../../core/save';
import { closeEtherium, etherSpendable, feedReady, prestige, prestigeGain } from '../../systems/prestige';
import { readingGain, starAffordable } from '../../systems/etherium';
import type { GameState } from '../../core/state';

/** La lecture promise, en points de pour cent : entière, ou au dixième sous 1 (sous le poids, jamais « +0 % »). */
const shownReading = (reading: number): number => (reading < 1 ? Math.max(0.1, Math.round(reading * 10) / 10) : Math.round(reading));

/** L'adresse de la page de l'Etherium (ui/app.ts). */
export const ETHERIUM_HASH = '#etherium';

/**
 * Une modale du prestige (conception §4.1) : ses strophes apparaissent l'une après
 * l'autre, les vers à la ligne, puis `extra` (une précision, plus petite), puis les boutons. Renvoie la modale (la fin de
 * « Mon histoire vraie » y dore sa précision).
 */
export const tell = (
  title: string,
  stanzas: string[],
  actions: ModalAction[],
  backdrop: 'dim' | 'black' = 'dim',
  extra?: string,
  enterConfirms = true,
): HTMLElement => {
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
  return modal.root;
};

/**
 * Le bouton sous l'Éther (feedButton.ts) : le nourrir, c'est le prestige (l'auteur, 14/10). Une confirmation courte, à
 * chaque fois (ce qui sera perdu, l'Éther gagné ; « Le nourrir » se clique, pas d'Entrée machinale). Sans Éther à gagner,
 * le nourrir encore, pour dépenser l'Éther en réserve. Au premier prestige, le récit de l'ouverture (texte validé par
 * l'auteur, version B). `done` : le livre, ouvert, se redessine.
 */
export const feedEtherium = (state: GameState, done: () => void): void => {
  if (!feedReady(state)) return;
  const etherium = messages().etherium;
  const gain = prestigeGain(state);
  const again = gain < 1;
  const first = state.exiles === 0;
  tell(
    again ? etherium.confirm.againTitle : etherium.confirm.title,
    [],
    [
      { label: etherium.confirm.stay, kind: 'secondary' },
      {
        label: etherium.confirm.feed,
        kind: 'primary',
        onClick: () => {
          // Plus rien à faire entre-temps (Éther changé au débogage) : pas de prestige.
          if (!feedReady(state)) return;
          prestige(state);
          saveGame(state);
          done();
          if (!first) return;
          const opening = etherium.opening;
          tell(opening.title, opening.text, [{ label: opening.button, kind: 'primary' }], 'black');
        },
      },
    ],
    'dim',
    again
      ? etherium.confirm.againWarning
      : etherium.confirm.warning
          .replace('{ether}', formatNumber(gain, getLocale()))
          .replace('{reading}', formatNumber(shownReading(readingGain(state, gain)), getLocale())),
    false,
  );
};

/**
 * Quitter l'Etherium juste après un prestige, avec de quoi allumer une étoile : « Le refermer ? » (l'auteur, 14/10).
 * Renvoie true si la question est posée ; refermé, `go` s'en va.
 */
export const askCloseEtherium = (state: GameState, go: () => void): boolean => {
  if (!etherSpendable(state) || !starAffordable(state)) return false;
  const ask = messages().etherium.closeAsk;
  tell(
    ask.title,
    [],
    [
      { label: ask.stay, kind: 'secondary' },
      {
        label: ask.close,
        kind: 'primary',
        onClick: () => {
          closeEtherium(state);
          saveGame(state);
          go();
        },
      },
    ],
    'dim',
    ask.text.replace('{n}', formatNumber(Math.floor(state.ether), getLocale())),
    false,
  );
  return true;
};
