import { el } from '../ui/dom';
import { beyond, clarity } from '../systems/perception';
import { forceFragments } from '../systems/fragments';
import type { GameState } from '../core/state';

/**
 * Mode débogage : s'ouvre en ajoutant ?debug à l'adresse (en local comme en ligne).
 * Outil de développement : textes en français, hors du système de traduction.
 */
export const isDebugEnabled = (): boolean => new URLSearchParams(window.location.search).has('debug');

const PRESETS = [0, 100, 1_000, 10_000, 1_000_000];

type NumericField = 'pages' | 'totalPagesRead' | 'bookPage';

const createField = (state: GameState, field: NumericField, text: string): HTMLInputElement => {
  const input = el('input');
  input.type = 'number';
  input.min = '0';
  input.dataset.field = field;
  input.setAttribute('aria-label', text);
  input.addEventListener('change', () => {
    state[field] = Math.max(0, Number(input.value) || 0);
  });
  return input;
};

export const mountDebugPanel = (state: GameState): void => {
  const panel = el('aside', 'debug');
  const stock = createField(state, 'pages', 'Pages en stock');
  const total = createField(state, 'totalPagesRead', 'Pages lues à vie');
  const stockLabel = el('label', undefined, 'Stock ');
  stockLabel.append(stock);
  const totalLabel = el('label', undefined, 'Lues (à vie) ');
  totalLabel.append(total);

  const presets = el('div', 'debug-presets');
  for (const value of PRESETS) {
    const button = el('button', undefined, value.toLocaleString('fr-FR'));
    button.title = 'Règle le stock et les pages lues à vie';
    button.addEventListener('click', () => {
      state.pages = value;
      state.totalPagesRead = value;
    });
    presets.append(button);
  }

  // Production : 10 lecteurs en diagonale = 1 page/s ; 50 atteignent le feuilletage continu.
  const readers = el('input');
  readers.type = 'number';
  readers.min = '0';
  readers.setAttribute('aria-label', 'Lecteurs en diagonale');
  readers.addEventListener('change', () => {
    state.tools.diagonal = Math.max(0, Math.floor(Number(readers.value) || 0));
  });
  const readersLabel = el('label', undefined, 'Diagonale ');
  readersLabel.append(readers);

  // Page du livre en main : 405 pour voir le livre se refermer tout de suite.
  const bookPage = createField(state, 'bookPage', 'Page du livre');
  bookPage.max = '409';
  const bookPageLabel = el('label', undefined, 'Page du livre ');
  bookPageLabel.append(bookPage);

  // Phrase sensée sur chaque nouvelle page (au lieu d'une sur 8).
  const fragments = el('input');
  fragments.type = 'checkbox';
  fragments.addEventListener('change', () => forceFragments(fragments.checked));
  const fragmentsLabel = el('label');
  fragmentsLabel.append(fragments, ' Texte cohérent à chaque page');

  const readout = el('small');
  panel.append(
    el('strong', undefined, 'Débogage'),
    stockLabel,
    totalLabel,
    presets,
    readersLabel,
    bookPageLabel,
    fragmentsLabel,
    readout,
  );
  document.body.append(panel);

  setInterval(() => {
    for (const input of [stock, total, bookPage]) {
      if (document.activeElement !== input) input.value = String(Math.floor(state[input.dataset.field as NumericField]));
    }
    if (document.activeElement !== readers) readers.value = String(state.tools.diagonal);
    readout.textContent = `Livres : ${state.booksFinished} · Découverte : ${clarity(state).toFixed(2)} · Au-delà : ${beyond(state).toFixed(2)}`;
  }, 250);
};
