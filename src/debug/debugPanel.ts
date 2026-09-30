import { el } from '../ui/dom';
import { createFpsMeter } from '../ui/fpsMeter';
import { rememberOpen, wasOpen } from './debugControls';
import { subjectById } from './subjects/catalog';
import { createKit, subjectName } from './subjects/subject';
import { onPinsChange, pinnedSubjects, unpin } from './pins';
import { DEBUG_BOOK_HASH } from './enabled';
import type { GameState } from '../core/state';

interface Card {
  id: string;
  root: HTMLDetailsElement;
  update: () => void;
}

/** La fiche d'un sujet : son nom, une croix pour le retirer, puis ce qu'on sait de lui. */
const createCard = (id: string, state: GameState): Card | null => {
  const subject = subjectById(id);
  if (!subject) return null;
  const root = el('details', 'debug-section debug-card');
  root.open = wasOpen(`card:${id}`);
  root.addEventListener('toggle', () => rememberOpen(`card:${id}`, root.open));
  const summary = el('summary', undefined, subjectName(subject));
  const close = el('button', 'debug-unpin', '✕');
  close.title = 'Retirer de la barre';
  close.addEventListener('click', (event) => {
    event.preventDefault();
    unpin(id);
  });
  summary.append(close);
  const { rows, kit, update } = createKit();
  subject.build(kit, state);
  root.append(summary, rows);
  update();
  return { id, root, update };
};

/**
 * La barre de débogage : les fiches des sujets choisis dans le livre de débogage (et seulement eux),
 * dans l'ordre où on les a choisis. Vide, elle invite à ouvrir le livre.
 */
export const mountDebugPanel = (state: GameState): void => {
  const panel = el('aside', 'debug');
  const header = el('div', 'debug-header');
  // Barre réduite : il ne reste que son titre et les FPS, un clic la rouvre.
  const toggle = el('button', 'debug-toggle');
  const setOpen = (open: boolean): void => {
    panel.classList.toggle('collapsed', !open);
    toggle.textContent = open ? '−' : '+';
    toggle.title = open ? 'Réduire la barre' : 'Ouvrir la barre';
    rememberOpen('panel', open);
  };
  toggle.addEventListener('click', () => setOpen(panel.classList.contains('collapsed')));
  const book = el('button', 'debug-open-book', 'Livre');
  book.title = 'Ouvrir le livre de débogage : choisir ce qui s’affiche ici';
  book.addEventListener('click', () => (window.location.hash = DEBUG_BOOK_HASH));
  header.append(el('strong', undefined, 'Débogage'), createFpsMeter('debug-fps', true), book, toggle);
  setOpen(wasOpen('panel'));
  const empty = el('p', 'debug-empty', 'Rien de choisi : ouvre le livre de débogage (dans la pile) et coche ce que tu veux suivre.');
  panel.append(header);
  document.body.append(panel);

  // Les fiches déjà construites sont gardées : les champs en cours de saisie ne sont pas perdus.
  let cards: Card[] = [];
  const layout = (): void => {
    const ids = pinnedSubjects();
    cards = ids.map((id) => cards.find((card) => card.id === id) ?? createCard(id, state)).filter((card): card is Card => card !== null);
    panel.replaceChildren(header, ...(cards.length > 0 ? cards.map((card) => card.root) : [empty]));
  };
  layout();
  onPinsChange(layout);

  setInterval(() => {
    for (const card of cards) if (card.root.open) card.update();
  }, 250);
};
