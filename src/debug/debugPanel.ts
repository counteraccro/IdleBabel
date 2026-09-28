import { el } from '../ui/dom';
import { beyond, clarity } from '../systems/perception';
import { forceFragments } from '../systems/fragments';
import { forceTitles, type TitleOverride } from '../systems/coverTitle';
import { pagesPerSecond } from '../systems/production';
import { STRANGE_BOOK_INDEX, revealStats, statsRevealed } from '../systems/strangeBook';
import { STRANGE_BOOK_REWRITE } from '../ui/strangeBook/strangeBookPage';
import { announceSeals, sealAll } from '../systems/seals';
import { SEALS } from '../data/seals';
import { DEBUG_BOOK_EVENT } from './events';
import { buttons, check, numberInput, rememberOpen, row, section, wasOpen } from './debugControls';
import { createFpsMeter } from '../ui/fpsMeter';
import type { GameState } from '../core/state';

/**
 * Mode débogage : s'ouvre en ajoutant ?debug à l'adresse (en local comme en ligne).
 * Outil de développement : textes en français, hors du système de traduction.
 */
export const isDebugEnabled = (): boolean => new URLSearchParams(window.location.search).has('debug');

const PRESETS = [0, 100, 1_000, 10_000, 1_000_000];

/** Le livre en main a changé (page, numéro, titres) : il se redessine. */
const refreshBook = (): void => {
  window.dispatchEvent(new Event(DEBUG_BOOK_EVENT));
};

export const mountDebugPanel = (state: GameState): void => {
  // Champs recopiés depuis l'état toutes les 250 ms (sauf celui qu'on est en train de modifier).
  const synced: [HTMLInputElement, () => number][] = [];
  const field = (read: () => number, write: (value: number) => void, max?: number): HTMLInputElement => {
    const input = numberInput(write, max);
    synced.push([input, read]);
    return input;
  };

  const pages = section(
    'Pages et production',
    row('Stock', field(() => state.pages, (v) => (state.pages = v)), 'pages à dépenser'),
    row('Lues à vie', field(() => state.totalPagesRead, (v) => (state.totalPagesRead = v)), "dissipent l'obscurité du décor"),
    row(
      'Régler les deux à',
      buttons(...PRESETS.map((value): [string, () => void] => [value.toLocaleString('fr-FR'), () => {
        state.pages = value;
        state.totalPagesRead = value;
      }])),
    ),
    row('Lecture diagonale', field(() => state.tools.diagonal, (v) => (state.tools.diagonal = v)), '10 = 1 page/s ; 50 = pages en continu'),
  );

  const titles = el('select');
  for (const [value, text] of [['', 'tels que tirés'], ['none', 'charabia'], ['word', 'un vrai mot'], ['title', 'titre entier']]) {
    const option = el('option', undefined, text);
    option.value = value;
    titles.append(option);
  }
  titles.addEventListener('change', () => {
    forceTitles((titles.value || undefined) as TitleOverride);
    refreshBook();
  });
  const held = section(
    'Livre en main',
    row('Page', field(() => state.bookPage, (v) => {
      state.bookPage = Math.min(v, 409);
      refreshBook();
    }, 409), '0 à 409 ; 405 : le livre se referme bientôt'),
    row('Livres terminés', field(() => state.booksFinished, (v) => {
      state.booksFinished = v;
      refreshBook();
    }), 'numéro du livre : couverture, reliure'),
    row('Titres des couvertures', titles),
    check('Phrase sensée à chaque page', 'au lieu d’une page sur 8', forceFragments).root,
  );

  const reveal = check('Statistiques visibles', 'livre accessible, tout débloqué, titre et légendes en clair', (on) => {
    revealStats(on);
    refreshBook();
    // Livre étrange déjà ouvert : il se réécrit à la même page ; sinon l'écran est reconstruit (le
    // livre devient accessible, ou ne l'est plus).
    if (document.querySelector('.sb-page')) window.dispatchEvent(new Event(STRANGE_BOOK_REWRITE));
    else window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
  const strange = section(
    'Livre étrange',
    reveal.root,
    row(
      'Raccourcis',
      buttons(
        ['Le prendre en main', () => {
          state.booksFinished = STRANGE_BOOK_INDEX;
          state.bookPage = 0;
          refreshBook();
        }],
        ['L’ouvrir en grand', () => {
          window.location.hash = '#livre';
        }],
      ),
      'le prendre en main le rend aussi accessible',
    ),
    row(
      'Sceaux',
      buttons(
        ['Une vision', () => announceSeals([SEALS[Math.floor(Math.random() * SEALS.length)].id])],
        ['Tout débloquer', () => sealAll(state)],
      ),
      'une vision : sans rien débloquer ; tout débloquer : pour de vrai (effacer la sauvegarde pour revenir)',
    ),
  );

  const readout = el('div', 'debug-readout');
  const status = section('État (lecture seule)', readout);

  const panel = el('aside', 'debug');
  const header = el('div', 'debug-header');
  // Panneau réduit : il ne reste que son titre et les FPS, un clic le rouvre.
  const toggle = el('button', 'debug-toggle');
  const setOpen = (open: boolean): void => {
    panel.classList.toggle('collapsed', !open);
    toggle.textContent = open ? '−' : '+';
    toggle.title = open ? 'Réduire le panneau' : 'Ouvrir le panneau';
    rememberOpen('panel', open);
  };
  toggle.addEventListener('click', () => setOpen(panel.classList.contains('collapsed')));
  header.append(el('strong', undefined, 'Débogage'), createFpsMeter('debug-fps', true), toggle);
  setOpen(wasOpen('panel'));
  panel.append(header, pages, held, strange, status);
  document.body.append(panel);

  setInterval(() => {
    for (const [input, read] of synced) {
      if (document.activeElement !== input) input.value = String(Math.floor(read()));
    }
    reveal.input.checked = statsRevealed();
    readout.replaceChildren(
      ...[
        ['Production', `${pagesPerSecond(state).toFixed(1)} pages/s`],
        ['Découverte', clarity(state).toFixed(2)],
        ['Au-delà', beyond(state).toFixed(2)],
        ['Livre étrange', state.booksFinished >= STRANGE_BOOK_INDEX ? 'trouvé' : `au livre n° ${STRANGE_BOOK_INDEX + 1}`],
      ].map(([label, value]) => {
        const line = el('div');
        line.append(el('span', 'debug-label', label), el('span', undefined, value));
        return line;
      }),
    );
  }, 250);
};
