import './ui/styles.css';
import { detectLocale, setLocale } from './i18n';
import { loadGame, saveGame } from './core/save';
import { startLoop } from './core/loop';
import { pauseEnded, watchAbsence } from './core/absence';
import { onResume } from './ui/animationClock';
import { mountApp } from './ui/app';
import { mountSealVisions } from './ui/sealVision';
import { mountScene } from './scene';
import { beyond, clarity } from './systems/perception';
import { mountDebugPanel } from './debug/debugPanel';
import { isDebugEnabled } from './debug/enabled';
import { readStrangeTitleWith } from './systems/coverTitle';
import { isDeciphered } from './systems/decipher';
import { readReaderNameWith } from './systems/readerName';
import { chronicle } from './systems/chronicle';
import { readGameSeedWith } from './core/random';

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
readReaderNameWith(() => state.playerName);

const update = mountApp(document.querySelector<HTMLElement>('#app')!, state);
mountSealVisions(state);
startLoop(state, update);
void mountScene({ clarity: () => clarity(state), beyond: () => beyond(state) });
if (isDebugEnabled()) mountDebugPanel(state);

setInterval(() => saveGame(state), AUTOSAVE_MS);
window.addEventListener('beforeunload', () => saveGame(state));
