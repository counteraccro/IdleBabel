import './traps.css';
import { el } from '../../../dom';
import { messages } from '../../../../i18n';

/**
 * La scène d'un piège des « Dark patterns par l'exemple » : par-dessus tout l'écran (le livre ouvert reste derrière
 * un voile), rien d'autre ne se clique tant qu'on n'en est pas sorti. Chaque piège a deux sorties qui marchent :
 * la grande porte (`done(false)`, il reviendra) et la vraie, cachée (`done(true)`, il est déjoué). Maquette
 * .ai/maquette-dark-patterns-pages.html.
 */

/** Le temps de lire le mot de la fin, avant que la scène s'efface. */
const RESULT_MS = 2600;

export interface TrapKit {
  /** Là où le piège pose ses fenêtres (vidé à chaque étape par `show`). */
  layer: HTMLElement;
  /** Remplace ce que montre le piège. */
  show: (...nodes: HTMLElement[]) => void;
  /** Sortie : `foiled` par la vraie sortie ; `message`, le mot de la fin. */
  done: (foiled: boolean, message: string) => void;
  /** Minuteurs du piège, arrêtés à la sortie. */
  later: (run: () => void, ms: number) => void;
  every: (run: () => void, ms: number) => void;
  stopTimers: () => void;
  /** Écouteurs du piège, retirés à la sortie. */
  signal: AbortSignal;
}

export type Trap = (kit: TrapKit) => void;

export const traps = () => messages().rareBooks.darkPatterns.traps;

/** Un bouton ; `kind` : 'big' (la grande porte, colorée), 'hot' (dégradé rose-orangé), 'link' (petit, gris). */
export const button = (kind: 'big' | 'hot' | 'link' | 'ghost', label: string, click: () => void): HTMLButtonElement => {
  const node = el('button', `dp-${kind}`, label);
  node.type = 'button';
  node.addEventListener('click', click);
  return node;
};

/** Une fenêtre blanche arrondie : titre, texte, puis ce qu'on y ajoute. */
export const dialog = (title: string, body?: string, ...nodes: HTMLElement[]): HTMLElement => {
  const box = el('div', 'dp-dialog');
  box.append(el('h3', undefined, title));
  if (body) box.append(el('p', undefined, body));
  box.append(...nodes);
  return box;
};

/** Des boutons l'un sous l'autre, centrés. */
export const stack = (...nodes: HTMLElement[]): HTMLElement => {
  const column = el('div', 'dp-stack');
  column.append(...nodes);
  return column;
};

/** Le piège ouvert (un seul à la fois). */
let current: (() => void) | null = null;

export const trapOpen = (): boolean => current !== null;

/** Ouvre le piège `trap` ; `onExit(foiled)` à la sortie, une fois le mot de la fin effacé. */
export const openTrap = (trap: Trap, onExit: (foiled: boolean) => void): void => {
  if (current) return;
  const root = el('div', 'dp-trap');
  const layer = el('div', 'dp-layer');
  root.append(el('div', 'dp-veil'), layer);
  document.body.append(root);
  const lifetime = new AbortController();
  let timers: number[] = [];
  const stopTimers = (): void => {
    timers.forEach((timer) => (window.clearTimeout(timer), window.clearInterval(timer)));
    timers = [];
  };
  let ended = false;
  const close = (): void => {
    stopTimers();
    lifetime.abort();
    root.remove();
    current = null;
  };
  const done = (foiled: boolean, message: string): void => {
    if (ended) return;
    ended = true;
    stopTimers();
    const result = el('div', 'dp-result');
    result.append(el('b', undefined, message), el('small', undefined, foiled ? traps().foiled : traps().notFoiled));
    layer.replaceChildren(result);
    window.setTimeout(() => {
      close();
      onExit(foiled);
    }, RESULT_MS);
  };
  // Quitté autrement (bouton précédent du navigateur) : le piège s'efface, sans être déjoué.
  window.addEventListener('hashchange', close, { signal: lifetime.signal });
  current = close;
  trap({
    layer,
    show: (...nodes) => layer.replaceChildren(...nodes),
    done,
    later: (run, ms) => void timers.push(window.setTimeout(run, ms)),
    every: (run, ms) => void timers.push(window.setInterval(run, ms)),
    stopTimers,
    signal: lifetime.signal,
  });
};

/** Le piège ouvert, refermé sans être déjoué (la page du livre quittée). */
export const closeTrap = (): void => current?.();

/** Une page web : son titre, une phrase, puis `lines` lignes de texte grisées. */
export const site = (title: string, body: string | undefined, lines: number): HTMLElement => {
  const page = el('div', 'dp-site');
  page.append(el('h3', undefined, title));
  if (body) page.append(el('p', undefined, body));
  for (let line = 0; line < lines; line++) page.append(el('div', 'dp-lines'));
  return page;
};
