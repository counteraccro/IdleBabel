import { el } from '../ui/dom';
import { beyond, clarity } from '../systems/perception';
import type { GameState } from '../core/state';

/**
 * Mode débogage : s'ouvre en ajoutant ?debug à l'adresse (en local comme en ligne).
 * Outil de développement : textes en français, hors du système de traduction.
 */
export const isDebugEnabled = (): boolean => new URLSearchParams(window.location.search).has('debug');

const PRESETS = [0, 100, 1_000, 10_000, 1_000_000];

export const mountDebugPanel = (state: GameState): void => {
  const panel = el('aside', 'debug');
  panel.append(el('strong', undefined, 'Débogage'));

  const pagesInput = el('input');
  pagesInput.type = 'number';
  pagesInput.min = '0';
  pagesInput.setAttribute('aria-label', 'Pages lues');
  pagesInput.addEventListener('change', () => {
    state.pages = Math.max(0, Number(pagesInput.value) || 0);
  });
  const label = el('label', undefined, 'Pages ');
  label.append(pagesInput);

  const presets = el('div', 'debug-presets');
  for (const value of PRESETS) {
    const button = el('button', undefined, value.toLocaleString('fr-FR'));
    button.addEventListener('click', () => {
      state.pages = value;
    });
    presets.append(button);
  }

  const readout = el('small');
  panel.append(label, presets, readout);
  document.body.append(panel);

  setInterval(() => {
    if (document.activeElement !== pagesInput) pagesInput.value = String(Math.floor(state.pages));
    readout.textContent = `Brume : ${clarity(state).toFixed(2)} · Au-delà : ${beyond(state).toFixed(2)}`;
  }, 250);
};
