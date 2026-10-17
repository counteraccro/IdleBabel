import type { GameState } from './state';
import { produce } from '../systems/production';
import { trackPlay } from '../systems/stats';
import { checkSeals } from '../systems/seals';
import { chronicle } from '../systems/chronicle';
import { remember } from '../systems/reminiscence';
import { runHooks } from '../mods/hooks';
import { settleLottery } from '../systems/lottery';
import { tickTasks } from '../systems/tasks';

/** La partie avance par pas de tant (le compteur aussi : les pages qui tournent seules, ui/book3d/autoTurn3d.ts). */
export const TICK_MS = 100;

/** Onglet caché, la partie avance au plus une fois par tant (le navigateur ralentit encore, le temps écoulé est compté). */
const HIDDEN_TICK_MS = 1000;

/**
 * Boucle de jeu : avance la simulation selon le temps réellement écoulé. Onglet caché, le jeu tourne au
 * ralenti (demande de l'auteur, 14/10) : les compteurs restent justes, l'écran n'est pas redessiné. Seul le
 * jeu fermé compte comme une absence, au prochain chargement (core/absence.ts).
 */
export const startLoop = (state: GameState, onTick: () => void): void => {
  let previous = Date.now();
  setInterval(() => {
    const now = Date.now();
    if (document.hidden && now - previous < HIDDEN_TICK_MS) return;
    produce(state, (now - state.lastTick) / 1000);
    state.lastTick = now;
    const elapsed = (now - previous) / 1000;
    trackPlay(state, elapsed);
    runHooks('tick', elapsed);
    previous = now;
    remember(state);
    // Un tirage de la Loterie dont la machine n'a pas vu la fin (bibliothèque quittée, onglet caché, jeu rechargé).
    settleLottery(state, Math.random, now);
    tickTasks(state, elapsed, !document.hidden, now);
    checkSeals(state, now);
    chronicle(state, now);
    if (document.hidden) return;
    onTick();
    runHooks('draw');
  }, TICK_MS);
};
