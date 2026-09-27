import { el } from '../ui/dom';
import { beyond, clarity } from '../systems/perception';
import { forceFragments } from '../systems/fragments';
import { forceTitles, type TitleOverride } from '../systems/coverTitle';
import { DEBUG_BOOK_EVENT } from './events';
import { createFpsMeter } from '../ui/fpsMeter';
import type { GameState } from '../core/state';

/**
 * Mode débogage : s'ouvre en ajoutant ?debug à l'adresse (en local comme en ligne).
 * Outil de développement : textes en français, hors du système de traduction.
 */
export const isDebugEnabled = (): boolean => new URLSearchParams(window.location.search).has('debug');

const PRESETS = [0, 100, 1_000, 10_000, 1_000_000];

type NumericField = 'pages' | 'totalPagesRead' | 'bookPage' | 'booksFinished';

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
  bookPage.addEventListener('change', () => window.dispatchEvent(new Event(DEBUG_BOOK_EVENT)));
  const bookPageLabel = el('label', undefined, 'Page du livre ');
  bookPageLabel.append(bookPage);

  // Numéro du livre (livres terminés) : la couverture du prochain livre en dépend.
  const books = createField(state, 'booksFinished', 'Livres terminés');
  books.addEventListener('change', () => window.dispatchEvent(new Event(DEBUG_BOOK_EVENT)));
  const booksLabel = el('label', undefined, 'Livres terminés ');
  booksLabel.append(books);

  // Phrase sensée sur chaque nouvelle page (au lieu d'une sur 8).
  const fragments = el('input');
  fragments.type = 'checkbox';
  fragments.addEventListener('change', () => forceFragments(fragments.checked));
  const fragmentsLabel = el('label');
  fragmentsLabel.append(fragments, ' Texte cohérent à chaque page');

  // Titre des couvertures : tel que tiré, ou imposé (charabia, un vrai mot, titre entier).
  const titles = el('select');
  for (const [value, text] of [['', 'tel que tiré'], ['none', 'charabia'], ['word', 'un vrai mot'], ['title', 'titre entier']]) {
    const option = el('option', undefined, text);
    option.value = value;
    titles.append(option);
  }
  titles.addEventListener('change', () => {
    forceTitles((titles.value || undefined) as TitleOverride);
    window.dispatchEvent(new Event(DEBUG_BOOK_EVENT));
  });
  const titlesLabel = el('label', undefined, 'Titres ');
  titlesLabel.append(titles);

  const readout = el('small');
  panel.append(
    el('strong', undefined, 'Débogage'),
    createFpsMeter('debug-fps', true),
    stockLabel,
    totalLabel,
    presets,
    readersLabel,
    bookPageLabel,
    booksLabel,
    fragmentsLabel,
    titlesLabel,
    readout,
  );
  document.body.append(panel);

  setInterval(() => {
    for (const input of [stock, total, bookPage, books]) {
      if (document.activeElement !== input) input.value = String(Math.floor(state[input.dataset.field as NumericField]));
    }
    if (document.activeElement !== readers) readers.value = String(state.tools.diagonal);
    readout.textContent = `Livres : ${state.booksFinished} · Découverte : ${clarity(state).toFixed(2)} · Au-delà : ${beyond(state).toFixed(2)}`;
  }, 250);
};
