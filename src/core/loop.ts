import type { GameState } from './state';
import { produce } from '../systems/production';
import { trackPlay } from '../systems/stats';
import { checkSeals } from '../systems/seals';
import { chronicle } from '../systems/chronicle';
import { remember } from '../systems/reminiscence';
import { runHooks } from '../mods/hooks';

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
    trackPlay(state, (now - previous) / 1000);
    runHooks('tick', (now - previous) / 1000);
    previous = now;
    remember(state);
    checkSeals(state, now);
    chronicle(state, now);
    if (document.hidden) return;
    onTick();
    runHooks('draw');
  }, TICK_MS);
};
