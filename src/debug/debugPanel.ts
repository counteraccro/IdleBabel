import { el } from '../ui/dom';
import { beyond, clarity } from '../systems/perception';
import type { GameState } from '../core/state';

/**
 * Mode débogage : s'ouvre en ajoutant ?debug à l'adresse (en local comme en ligne).
 * Outil de développement : textes en français, hors du système de traduction.
 */
export const isDebugEnabled = (): boolean => new URLSearchParams(window.location.search).has('debug');

const PRESETS = [0, 100, 1_000, 10_000, 1_000_000];

type NumericField = 'pages' | 'totalPagesRead';

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

  const readout = el('small');
  panel.append(el('strong', undefined, 'Débogage'), stockLabel, totalLabel, presets, readout);
  document.body.append(panel);

  setInterval(() => {
    for (const input of [stock, total]) {
      if (document.activeElement !== input) input.value = String(Math.floor(state[input.dataset.field as NumericField]));
    }
    readout.textContent = `Découverte : ${clarity(state).toFixed(2)} · Au-delà : ${beyond(state).toFixed(2)}`;
  }, 250);
};
