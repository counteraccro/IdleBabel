import './notify.css';
import { el } from '../ui/dom';

/** Le temps qu'une annonce reste à l'écran. */
const SHOWN_MS = 6000;
/** Le temps qu'elle met à s'effacer (voir .mod-notice). */
const FADE_MS = 600;

let stack: HTMLElement | null = null;

/** Une annonce d'un mod en bas de l'écran (comme Game.Notify de Cookie Clicker) : du texte seul, jamais du HTML. */
export const notify = (title: string, text = ''): void => {
  if (!stack?.isConnected) {
    stack = el('div', 'mod-notices');
    document.body.append(stack);
  }
  const notice = el('div', 'mod-notice');
  notice.append(el('div', 'mod-notice-title', String(title)));
  if (text) notice.append(el('div', 'mod-notice-text', String(text)));
  stack.append(notice);
  const close = (): void => {
    notice.classList.add('gone');
    window.setTimeout(() => notice.remove(), FADE_MS);
  };
  notice.addEventListener('click', close);
  window.setTimeout(close, SHOWN_MS);
};
