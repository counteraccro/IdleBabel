import { markingDebug, recordDebug } from '../core/history';
import { checkSeals } from '../systems/seals';
import { chronicle } from '../systems/chronicle';
import type { GameState } from '../core/state';

/** Ce que l'action a touché, lu dans la fiche : « Ressources · Pages : 1k ». */
const describe = (target: HTMLElement): string => {
  const card = target.closest('.debug-card')?.querySelector('.debug-card-title')?.textContent ?? '';
  const label = target.closest('.debug-row')?.querySelector('.debug-label')?.textContent ?? '';
  const value =
    target instanceof HTMLInputElement
      ? target.type === 'checkbox'
        ? target.checked
          ? 'oui'
          : 'non'
        : target.value
      : target instanceof HTMLSelectElement
        ? (target.selectedOptions[0]?.textContent ?? target.value)
        : (target.textContent ?? '');
  return [card, label].filter(Boolean).join(' · ') + (value ? ` : ${value.trim()}` : '');
};

/**
 * Le livre de la fin n'invente rien : chaque action de la barre de débogage (bouton, champ, case, menu)
 * s'écrit dans l'historique, et les moments qu'elle déclenche aussitôt (sceaux, paliers, premier outil…)
 * en portent la marque. Les boutons de la barre elle-même (réduire, livre, retirer une fiche) ne comptent pas.
 */
export const markDebugActions = (panel: HTMLElement, state: GameState): void => {
  let action: HTMLElement | null = null;
  const start = (event: Event): void => {
    const target = event.target as HTMLElement;
    const control = target.closest('button, input, select') as HTMLElement | null;
    if (!control || control.closest('.debug-header, summary')) return;
    // Une case à cocher ou un champ : son changement, pas le clic qui le précède.
    if (event.type === 'click' && !(control instanceof HTMLButtonElement)) return;
    // Écrite avant ce qu'elle déclenche (le champ, la case : déjà changés quand vient « change »).
    recordDebug(state, describe(control));
    action = control;
    markingDebug(true);
    // Si un gestionnaire arrête l'événement en route, la marque tombe quand même.
    setTimeout(end);
  };
  const end = (): void => {
    if (!action) return;
    checkSeals(state);
    chronicle(state);
    markingDebug(false);
    action = null;
  };
  for (const type of ['click', 'change']) {
    panel.addEventListener(type, start, true);
    panel.addEventListener(type, end);
  }
};
