import './book.css';
import { el } from '../dom';
import { attachGrab } from './bookGrab';
import { applyBinding, type Binding } from './bindings';
import { createBookClosing } from './bookClose';
import { createLeafRenderer } from './leafRenderer';
import { layoutPage, type PageLines } from './pageLayout';
import { drawPageTexture, renderPageHtml } from './pageRender';
import { createPage } from '../../systems/babelText';

const PAGE_LENGTH = 700;
const TURN_MS = 850;
const RELEASE_MS = 380;
/** Page tenue sans bouger : elle se soulève à peine. */
const HELD_PROGRESS = 0.06;

export interface BookHandlers {
  /** Une page vient d'être tournée (comptée comme lue). */
  onTurn: () => void;
  /** Toute page tournée, lue ou non ; renvoie true si le livre est terminé et doit être refermé. */
  onLeaf: () => boolean;
  /** Phrase sensée éventuelle à cacher dans la prochaine page. */
  nextFragment: () => string | undefined;
  /** Avancement dans le livre en main, de 0 à 1 : épaisseur des tranches. */
  progress: () => number;
  /** Reliure du livre en main. */
  binding: () => Binding;
  /** Le livre suivant attend-il fermé qu'on l'ouvre d'un clic ? */
  stayClosed: () => boolean;
}

/** Le livre, et la page tournée par la production (non comptée : ces pages le sont déjà). */
export interface Book {
  root: HTMLButtonElement;
  /** Tourne une page en `duration` ms ; refuse (false) si une page bouge déjà, est tenue, ou si le livre se referme. */
  autoTurn: (duration: number) => boolean;
}

const easeInOut = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

/**
 * Un livre ouvert tenu en main. Clic : la page tourne. Appui maintenu : on tient la page
 * et on la tourne soi-même ; lâchée après la moitié, elle finit de tourner, sinon elle retombe.
 */
export const createBook = (label: string, handlers: BookHandlers): Book => {
  const book = el('button', 'book');
  book.setAttribute('aria-label', label);
  const cover = el('span', 'book-cover');
  const left = el('span', 'book-page book-left');
  const right = el('span', 'book-page book-right');
  const canvas = el('canvas', 'leaf-canvas');
  cover.append(left, right, canvas);
  book.append(cover);

  const newLines = (fragment?: string): PageLines => layoutPage(createPage(PAGE_LENGTH, fragment));
  let rightLines: PageLines;
  const openNewBook = (): void => {
    applyBinding(book, handlers.binding());
    showProgress();
    rightLines = newLines();
    renderPageHtml(left, newLines());
    renderPageHtml(right, rightLines);
  };
  const showProgress = (): void => {
    book.style.setProperty('--read', handlers.progress().toFixed(3));
  };
  openNewBook();

  const closing = createBookClosing(book, cover, { left, right });
  // Fermeture ou ouverture en cours : aucune page ne tourne. Livre fermé en main : un clic l'ouvre.
  let isClosing = false;
  let isClosed = false;
  const closeBook = (): void => {
    isClosing = true;
    const stayClosed = handlers.stayClosed();
    void closing.play(openNewBook, stayClosed).finally(() => {
      isClosing = false;
      isClosed = stayClosed;
      book.classList.toggle('closed', isClosed);
    });
  };
  const openBook = (): void => {
    if (!isClosed || isClosing) return;
    isClosed = false;
    isClosing = true;
    book.classList.remove('closed');
    void closing.open().finally(() => {
      isClosing = false;
    });
  };

  const renderer = createLeafRenderer(canvas);
  const front = document.createElement('canvas');
  const back = document.createElement('canvas');

  // Feuille en cours : son verso (future page de gauche), la page de droite d'avant,
  // et si elle compte comme lue (tournée par le lecteur) ou non (tournée par la production).
  let turning: { back: PageLines; previousRight: PageLines; counted: boolean } | null = null;
  let progress = 0;
  let animation = 0;

  const show = (value: number): void => {
    progress = value;
    renderer?.draw(value);
    book.style.setProperty('--lift', Math.sin(Math.PI * value).toFixed(3));
  };

  const stop = (): void => {
    cancelAnimationFrame(animation);
    book.classList.remove('turning');
    book.style.removeProperty('--lift');
  };

  /** La feuille est passée à gauche : la page est lue. */
  const finish = (): void => {
    if (!turning) return;
    const { counted } = turning;
    renderPageHtml(left, turning.back);
    turning = null;
    stop();
    if (counted) handlers.onTurn();
    const finished = handlers.onLeaf();
    showProgress();
    if (finished) closeBook();
  };

  /** La feuille retombe à droite : rien n'est lu, la page de droite redevient celle d'avant. */
  const fallBack = (): void => {
    if (!turning) return;
    rightLines = turning.previousRight;
    renderPageHtml(right, rightLines);
    turning = null;
    stop();
  };

  /** Soulève la page de droite : elle part sur la feuille, une nouvelle apparaît dessous. */
  const lift = (counted = true): void => {
    if (turning) finish();
    const backLines = newLines();
    turning = { back: backLines, previousRight: rightLines, counted };
    drawPageTexture(front, rightLines, true);
    drawPageTexture(back, backLines, false);
    renderer?.setPages(front, back);
    rightLines = newLines(handlers.nextFragment());
    renderPageHtml(right, rightLines);
    book.classList.add('turning');
  };

  const animateTo = (target: number, duration: number, done: () => void): void => {
    cancelAnimationFrame(animation);
    const from = progress;
    const start = performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      show(from + (target - from) * easeInOut(t));
      if (t < 1) animation = requestAnimationFrame(step);
      else done();
    };
    animation = requestAnimationFrame(step);
  };

  attachGrab(book, {
    turn: () => {
      if (isClosed) openBook();
      if (isClosed || isClosing) return;
      lift();
      show(0);
      animateTo(1, renderer ? TURN_MS : 0, finish);
    },
    grab: () => {
      if (isClosed) openBook();
      if (isClosed || isClosing) return;
      lift();
      animateTo(HELD_PROGRESS, 120, () => {});
    },
    move: (value) => {
      if (!turning) return;
      cancelAnimationFrame(animation);
      show(HELD_PROGRESS + (1 - HELD_PROGRESS) * value);
    },
    release: (value) => {
      if (!turning) return;
      const completes = HELD_PROGRESS + (1 - HELD_PROGRESS) * value > 0.5;
      const target = completes ? 1 : 0;
      animateTo(target, RELEASE_MS * Math.max(0.3, Math.abs(target - progress)), completes ? finish : fallBack);
    },
  });

  const autoTurn = (duration: number): boolean => {
    // Pages qui tournent seules réactivées pendant que le livre est fermé : on l'ouvre d'abord.
    if (isClosed) openBook();
    if (turning || isClosing) return false;
    lift(false);
    show(0);
    animateTo(1, renderer ? duration : 0, finish);
    return true;
  };

  return { root: book, autoTurn };
};
