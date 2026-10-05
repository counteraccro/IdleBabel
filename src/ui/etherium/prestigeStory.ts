import './etherium.css';
import { el } from '../dom';
import { openModal, type ModalAction } from '../modal/modal';
import { goThroughTheDark, PARAGRAPH_MS, storyLines } from '../lore';
import { messages, t } from '../../i18n';
import { formatNumber } from '../../core/format';
import { getLocale } from '../../i18n';
import { saveGame } from '../../core/save';
import { prestige, prestigeGain } from '../../systems/prestige';
import type { GameState } from '../../core/state';

/** L'adresse de la page de l'Etherium (ui/app.ts). */
export const ETHERIUM_HASH = '#etherium';

/**
 * Un récit du prestige (textes validés par l'auteur, conception §4.1) : ses strophes apparaissent l'une après
 * l'autre, les vers à la ligne, puis `extra` (une précision, plus petite), puis les boutons.
 */
const tell = (title: string, stanzas: string[], actions: ModalAction[], backdrop: 'dim' | 'black' = 'dim', extra?: string): void => {
  const story = storyLines(stanzas.length);
  story.root.classList.add('prestige-story');
  story.lines.forEach((line, index) => (line.textContent = stanzas[index]));
  const body = [story.root];
  if (extra) {
    const note = el('p', 'prestige-warning', extra);
    note.style.animationDelay = `${stanzas.length * PARAGRAPH_MS}ms`;
    body.push(note);
  }
  const modal = openModal({ title, body, actions, backdrop });
  modal.root.querySelector<HTMLElement>('.modal-actions')!.style.animationDelay = `${(stanzas.length + (extra ? 1 : 0)) * PARAGRAPH_MS}ms`;
};

type Story = { title: string; text: string[] };
const story = (id: 'wake' | 'gone'): Story => messages().etherium[id];

/**
 * Le livre violet de la pile, cliqué : le chercheur regarde le puits, se penche, et peut encore reculer. S'il
 * tend la main, il l'attrape, le vide l'attire (le prestige), puis il se réveille ailleurs, l'Etherium en main :
 * il s'ouvre (une seule modale, du vide au réveil).
 * Le récit ne se raconte qu'au premier prestige : ensuite, le puits ne garde que ce qui sera perdu et le choix,
 * et l'Etherium s'ouvre aussitôt la main tendue.
 */
export const reachForEtherium = (state: GameState): void => {
  const reach = messages().etherium.reach;
  const gain = prestigeGain(state);
  if (gain < 1) return;
  const first = state.exiles === 0;
  tell(
    reach.title,
    first ? reach.text : [],
    [
      { label: reach.stay, kind: 'secondary' },
      {
        label: reach.reach,
        kind: 'primary',
        onClick: () => {
          prestige(state);
          saveGame(state);
          if (!first) return goThroughTheDark(ETHERIUM_HASH);
          const wake = story('wake');
          tell(
            wake.title,
            wake.text,
            [{ label: messages().etherium.wake.button, kind: 'primary', onClick: () => goThroughTheDark(ETHERIUM_HASH) }],
            'black',
          );
        },
      },
    ],
    'dim',
    reach.warning.replace('{n}', formatNumber(gain, getLocale())),
  );
};

/** L'Etherium refermé : il n'est plus là. Raconté la première fois seulement (après le premier prestige). */
export const tellEtheriumGone = (state: GameState): void => {
  if (state.exiles > 1) return;
  const gone = story('gone');
  tell(gone.title, gone.text, [{ label: t('lore.continue'), kind: 'primary' }]);
};
