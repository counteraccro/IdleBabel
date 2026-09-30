import './ui/styles.css';
import { detectLocale, setLocale } from './i18n';
import { loadGame, saveGame } from './core/save';
import { startLoop } from './core/loop';
import { watchAbsence } from './core/absence';
import { mountApp } from './ui/app';
import { mountSealVisions } from './ui/sealVision';
import { mountScene } from './scene';
import { beyond, clarity } from './systems/perception';
import { mountDebugPanel } from './debug/debugPanel';
import { isDebugEnabled } from './debug/enabled';
import { readStrangeTitleWith } from './systems/coverTitle';
import { isDeciphered } from './systems/decipher';

const AUTOSAVE_MS = 10_000;

const state = loadGame(detectLocale());
setLocale(state.locale);
watchAbsence(state);
readStrangeTitleWith(() => isDeciphered(state, 'contents'));
state.lastTick = Date.now(); // pas encore de pages lues hors-ligne dans le prototype

const update = mountApp(document.querySelector<HTMLElement>('#app')!, state);
mountSealVisions();
startLoop(state, update);
void mountScene({ clarity: () => clarity(state), beyond: () => beyond(state) });
if (isDebugEnabled()) mountDebugPanel(state);

setInterval(() => saveGame(state), AUTOSAVE_MS);
window.addEventListener('beforeunload', () => saveGame(state));
