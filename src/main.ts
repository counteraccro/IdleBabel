import './ui/styles.css';
import { detectLocale, setLocale } from './i18n';
import { loadGame, saveGame } from './core/save';
import { startLoop } from './core/loop';
import { pauseEnded, settleHidden, watchAbsence } from './core/absence';
import { onResume } from './ui/animationClock';
import { mountApp } from './ui/app';
import { COVERS_PER_STEP, countCovers } from './systems/stats';
import { mountSealVisions } from './ui/sealVision';
import { mountTabTitle } from './ui/tabTitle';
import { mountScene } from './scene';
import { sceneShown } from './scene/scenes';
import { beyond } from './systems/perception';
import { mountDebugPanel } from './debug/debugPanel';
import { isDebugEnabled } from './debug/enabled';
import { readStrangeTitleWith } from './systems/coverTitle';
import { anyBonus } from './ui/strangeBook/bonuses';
import { isDeciphered, readBonusesWith } from './systems/decipher';
import { readReaderNameWith } from './systems/readerName';
import { chronicle } from './systems/chronicle';
import { readGameSeedWith } from './core/random';
import { mountModApi } from './mods/api';
import { loadSavedMods } from './mods/loader';
import { loadCatalog } from './mods/catalog';
import { taskTouched } from './systems/tasks';
import { setColoringZones } from './systems/coloring';
import { coloringZones } from './ui/rareBooks/coloring/coloringDrawings';

const AUTOSAVE_MS = 10_000;

const state = loadGame(detectLocale());
readGameSeedWith(() => state.seed);
setLocale(state.locale);
watchAbsence(state);
// Une modale fermée : ses trouvailles, comme pendant une absence (le décor était figé, pas le jeu).
onResume((seconds) => pauseEnded(state, seconds));
// Le livre de la fin est à jour avant qu'une vue ne le lise (sauvegarde d'avant ses moments, absence).
chronicle(state);
readStrangeTitleWith(() => isDeciphered(state, 'contents'));
readBonusesWith(anyBonus);
readReaderNameWith(() => state.playerName);
setColoringZones(coloringZones);
// « Laisse le jeu ouvert 1 h sans rien toucher » : la moindre touche ou le moindre geste la fait repartir de zéro.
for (const type of ['pointerdown', 'keydown', 'wheel'] as const)
  window.addEventListener(type, () => taskTouched(state), { passive: true, capture: true });

const update = mountApp(document.querySelector<HTMLElement>('#app')!, state);
mountSealVisions(state);
mountTabTitle(state);
// Les mods (src/mods) : l'API d'abord, puis ceux de la partie, dans l'ordre ; la liste du cahier à côté.
mountModApi(state);
void loadSavedMods(state);
void loadCatalog();
startLoop(state, update);
// Une partie d'avant le compte des couvertures dans la sauvegarde : il se rattrape par petits bouts, quand le jeu attend
// (sinon, à la première ouverture du Grand Livre, des secondes figées).
const catchUpCovers = (deadline?: IdleDeadline): void => {
  const until = performance.now() + 8;
  while (!countCovers(state, COVERS_PER_STEP)) {
    if (deadline ? deadline.timeRemaining() < 2 : performance.now() > until) return void idle(catchUpCovers);
  }
};
const idle = (step: (deadline?: IdleDeadline) => void): void => {
  if ('requestIdleCallback' in window) requestIdleCallback(step, { timeout: 1000 });
  else setTimeout(step, 50);
};
idle(catchUpCovers);
void mountScene({ beyond: () => beyond(state), wanted: () => sceneShown(state) });
if (isDebugEnabled()) {
  mountDebugPanel(state);
  // Débogage : la partie depuis la console (window.debugState), pour essayer un état à la main.
  (window as unknown as { debugState?: unknown }).debugState = state;
}

// Onglet caché, ce que le livre en main a trouvé est compté avant chaque sauvegarde : rien ne se perd s'il est fermé.
const save = (): void => {
  settleHidden(state);
  saveGame(state);
};
setInterval(save, AUTOSAVE_MS);
window.addEventListener('beforeunload', save);
