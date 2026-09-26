import './ui/styles.css';
import { detectLocale, setLocale } from './i18n';
import { loadGame, saveGame } from './core/save';
import { startLoop } from './core/loop';
import { mountApp } from './ui/app';

const AUTOSAVE_MS = 10_000;

const state = loadGame(detectLocale());
setLocale(state.locale);
state.lastTick = Date.now(); // pas encore de gains hors-ligne dans le prototype

const update = mountApp(document.querySelector<HTMLElement>('#app')!, state);
startLoop(state, update);

setInterval(() => saveGame(state), AUTOSAVE_MS);
window.addEventListener('beforeunload', () => saveGame(state));
