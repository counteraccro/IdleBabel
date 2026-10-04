import { el } from '../ui/dom';
import { createFpsMeter } from '../ui/fpsMeter';
import { rememberOpen, wasOpen } from './debugControls';
import { BOOK_ORDER, subjectById } from './subjects/catalog';
import { createKit, subjectName } from './subjects/subject';
import { onPinsChange, pinnedSubjects, unpin } from './pins';
import { DEBUG_BOOK_HASH } from './enabled';
import { markDebugActions } from './debugMark';
import { setDebugState } from './debugState';
import type { GameState } from '../core/state';

const icon = (path: string): string =>
  `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="${path}"/></svg>`;
const BOOK = icon('M8 3.5C6.5 2.5 4 2.3 2 2.8v10c2-.5 4.5-.3 6 .7 1.5-1 4-1.2 6-.7v-10c-2-.5-4.5-.3-6 .7zM8 3.5v10');
const MINUS = icon('M4 8h8');
const PLUS = icon('M4 8h8M8 4v8');

interface Card {
  id: string;
  root: HTMLDetailsElement;
  update: () => void;
}

/** La fiche d'un sujet : son nom, une croix pour le retirer, puis ce qu'on sait de lui. */
const createCard = (id: string, state: GameState): Card | null => {
  const subject = subjectById(id);
  if (!subject) return null;
  const root = el('details', 'debug-card');
  root.open = wasOpen(`card:${id}`);
  root.addEventListener('toggle', () => rememberOpen(`card:${id}`, root.open));
  const summary = el('summary');
  // Repliée, la fiche garde sa valeur clé en tête ; la croix n'apparaît qu'au survol.
  const peek = el('span', 'debug-peek');
  const close = el('button', 'debug-icon debug-unpin', '✕');
  close.title = 'Retirer de la barre';
  close.addEventListener('click', (event) => {
    event.preventDefault();
    unpin(id);
  });
  summary.append(el('span', 'debug-card-title', subjectName(subject)), peek, close);
  const { rows, kit, update } = createKit();
  subject.build(kit, state);
  root.append(summary, rows);
  const refresh = (): void => {
    if (root.open) update();
    else if (subject.peek) {
      const text = subject.peek(state);
      if (peek.textContent !== text) peek.textContent = text;
    }
  };
  root.addEventListener('toggle', refresh);
  refresh();
  return { id, root, update: refresh };
};

/**
 * La barre de débogage : les fiches des sujets choisis dans le livre de débogage (et seulement eux),
 * dans l'ordre où on les a choisis. Vide, elle invite à ouvrir le livre.
 */
export const mountDebugPanel = (state: GameState): void => {
  setDebugState(state);
  const panel = el('aside', 'debug');
  const header = el('div', 'debug-header');
  // Barre réduite : il ne reste que son titre et les FPS, un clic la rouvre.
  const toggle = el('button', 'debug-icon');
  const setOpen = (open: boolean): void => {
    panel.classList.toggle('collapsed', !open);
    toggle.innerHTML = open ? MINUS : PLUS;
    toggle.title = open ? 'Réduire la barre' : 'Ouvrir la barre';
    rememberOpen('panel', open);
  };
  toggle.addEventListener('click', () => setOpen(panel.classList.contains('collapsed')));
  const book = el('button', 'debug-icon');
  book.innerHTML = BOOK;
  book.title = 'Ouvrir le livre de débogage : choisir ce qui s’affiche ici';
  book.addEventListener('click', () => (window.location.hash = DEBUG_BOOK_HASH));
  header.append(el('strong', undefined, 'Débogage'), createFpsMeter('debug-fps', true), book, toggle);
  setOpen(wasOpen('panel'));
  const empty = el('p', 'debug-empty', 'Rien de choisi : ouvre le livre de débogage (dans la pile) et coche ce que tu veux suivre.');
  panel.append(header);
  document.body.append(panel);
  markDebugActions(panel, state);

  // Les fiches déjà construites sont gardées : les champs en cours de saisie ne sont pas perdus.
  let cards: Card[] = [];
  const layout = (): void => {
    // Dans l'ordre du livre, pas dans celui où on les a choisis.
    const ids = BOOK_ORDER.filter((id) => pinnedSubjects().includes(id));
    cards = ids.map((id) => cards.find((card) => card.id === id) ?? createCard(id, state)).filter((card): card is Card => card !== null);
    panel.replaceChildren(header, ...(cards.length > 0 ? cards.map((card) => card.root) : [empty]));
  };
  layout();
  onPinsChange(layout);

  setInterval(() => {
    for (const card of cards) card.update();
  }, 250);
};
