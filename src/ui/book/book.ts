import './book.css';
import { el } from '../dom';
import { attachGrab } from './bookGrab';
import { applyBinding, type Binding } from './bindings';
import { createBookClosing } from './bookClose';
import { stackDepths } from './bookBlock';
import type { CoverDesign } from '../../systems/coverDesign';
import { createLeafRenderer } from './leafRenderer';
import { layoutPage } from './pageLayout';
import { MODERN_PAPER, OLD_PAPER, gutterCss, paperCss, textPage, type PageView, type Paper } from './pageRender';
import { createHeadbands } from './headbands';
import { drawTitlePageTexture, renderTitlePageHtml } from './titlePage';
import type { PageContent } from '../../systems/babelText';

const PAGE_LENGTH = 700;
export const TURN_MS = 850;
export const RELEASE_MS = 380;
/** Page tenue sans bouger : elle se soulève à peine. */
export const HELD_PROGRESS = 0.06;
/** Perspective du livre (voir .book dans book.css). */
const PERSPECTIVE_PX = 1400;
/** Écart entre le haut d'une pile et la feuille qui en part ou s'y pose. */
const LEAF_GAP_PX = 3;

export interface BookHandlers {
  /** Une page vient d'être tournée (comptée comme lue). */
  onTurn: () => void;
  /** Toute page tournée, lue ou non ; renvoie true si le livre est terminé et doit être refermé. */
  onLeaf: () => boolean;
  /** Contenu d'une nouvelle page du livre en main, avec la phrase sensée éventuelle. */
  page: (length: number, fragment?: string) => PageContent;
  /**
   * Page toute faite à la place du texte (le livre étrange reprend celles du grand livre), selon sa place
   * dans le livre : 0 pour la page de gauche après la première page tournée, 1 pour celle de droite, etc.
   */
  special?: (position: number) => PageView | undefined;
  /** Pages déjà tournées dans le livre en main. */
  turned: () => number;
  /** Papier des pages, s'il n'est pas celui de la couverture (jauni, ou blanc pour un livre moderne). */
  paper?: () => Paper | undefined;
  /** Phrase sensée éventuelle à cacher dans la prochaine page. */
  nextFragment: () => string | undefined;
  /** Avancement dans le livre en main, de 0 à 1 : épaisseur des tranches. */
  progress: () => number;
  /** La page de droite est-elle la dernière du livre ? Dessous, il n'y a plus que la couverture. */
  lastLeaf: () => boolean;
  /** Reliure et couverture du livre en main. */
  binding: () => Binding;
  cover: () => CoverDesign;
  /** Le livre suivant attend-il fermé qu'on l'ouvre d'un clic ? */
  stayClosed: () => boolean;
}

/** Le livre, et la page tournée par la production (non comptée : ces pages le sont déjà). */
export interface Book {
  root: HTMLButtonElement;
  /** Tourne une page en `duration` ms ; refuse (false) si une page bouge déjà, est tenue, ou si le livre se referme. */
  autoTurn: (duration: number) => boolean;
  /** Redessine le livre en main d'après l'état (débogage) : à la page 0, un livre neuf, fermé s'il le faut. */
  refresh: () => void;
}

export const easeInOut = (t: number): number => -(Math.cos(Math.PI * t) - 1) / 2;

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
  cover.append(left, right, ...createHeadbands(), canvas);
  // Même ombre de gouttière que la feuille qui tourne : dos à droite pour la page de gauche, et inversement.
  book.style.setProperty('--gutter-left', gutterCss('270deg'));
  book.style.setProperty('--gutter-right', gutterCss('90deg'));
  book.append(cover);

  /** Page à la place `position` dans l'ordre de lecture (voir BookHandlers.special). */
  const newPage = (position: number, fragment?: string): PageView =>
    handlers.special?.(position) ?? textPage(layoutPage(handlers.page(PAGE_LENGTH, fragment)));
  // Page de droite : une page, ou la page de titre (première page d'un livre, rightPage vaut alors null).
  let rightPage: PageView | null = null;
  const showRight = (page: PageView | null): void => {
    rightPage = page;
    if (page) page.html(right);
    else renderTitlePageHtml(right, design);
  };
  // Couverture et papier du livre en main : papier blanc pour un livre moderne, jauni sinon.
  let design = handlers.cover();
  let paper = OLD_PAPER;
  const openNewBook = (): void => {
    book.classList.remove('last-page');
    applyBinding(book, handlers.binding());
    design = handlers.cover();
    closing.dress(design);
    paper = handlers.paper?.() ?? (design.modern ? MODERN_PAPER : OLD_PAPER);
    book.style.setProperty('--paper', paperCss(paper));
    showProgress();
    // Après n pages tournées : à gauche la page 2n - 2, à droite la page 2n - 1.
    const turned = handlers.turned();
    newPage(2 * turned - 2).html(left);
    showRight(handlers.progress() === 0 ? null : newPage(2 * turned - 1));
  };
  // Hauteur des piles de pages ; première page : pas encore de page à gauche.
  const showProgress = (): void => {
    const progress = handlers.progress();
    const depths = stackDepths(progress);
    book.style.setProperty('--left-depth', `${depths.left.toFixed(2)}px`);
    book.style.setProperty('--right-depth', `${depths.right.toFixed(2)}px`);
    book.style.setProperty('--read', progress.toFixed(3));
    book.classList.toggle('first-page', progress === 0);
  };
  const closing = createBookClosing(book, cover, { left, right });
  openNewBook();
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
  let turning: { back: PageView; previousRight: PageView | null; counted: boolean } | null = null;
  let progress = 0;
  let animation = 0;

  const show = (value: number): void => {
    progress = value;
    renderer?.draw(value);
    book.style.setProperty('--lift', Math.sin(Math.PI * value).toFixed(3));
    // La feuille va du haut de la pile de droite à celui de gauche. Son canevas est plat : placé à
    // mi-hauteur, la page de droite, plus haute, le cacherait. Il reste donc au-dessus des deux piles,
    // réduit pour garder la taille qu'il aurait à sa vraie hauteur malgré la perspective.
    const depths = stackDepths(handlers.progress());
    const top = Math.max(depths.left, depths.right) + LEAF_GAP_PX;
    const height = depths.right + (depths.left - depths.right) * value + LEAF_GAP_PX;
    book.style.setProperty('--leaf-z', `${top.toFixed(2)}px`);
    book.style.setProperty('--leaf-scale', ((PERSPECTIVE_PX - top) / (PERSPECTIVE_PX - height)).toFixed(4));
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
    turning.back.html(left);
    turning = null;
    stop();
    if (counted) handlers.onTurn();
    // Livre terminé : il garde son allure de fin (pages à gauche) jusqu'à ce que le suivant soit pris.
    if (handlers.onLeaf()) closeBook();
    else showProgress();
  };

  /** La feuille retombe à droite : rien n'est lu, la page de droite redevient celle d'avant. */
  const fallBack = (): void => {
    if (!turning) return;
    showRight(turning.previousRight);
    book.classList.remove('last-page');
    turning = null;
    stop();
  };

  /** Soulève la page de droite : elle part sur la feuille, une nouvelle apparaît dessous. */
  const lift = (counted = true): void => {
    if (turning) finish();
    // Les deux faces de la feuille peuvent cacher une phrase sensée : le verso deviendra la page de gauche.
    // Après n pages tournées, la feuille découvre les pages 2n (son verso, à gauche) et 2n + 1 (à droite).
    const turned = handlers.turned();
    const backPage = newPage(2 * turned, handlers.nextFragment());
    turning = { back: backPage, previousRight: rightPage, counted };
    if (rightPage) rightPage.texture(front, true, paper);
    else drawTitlePageTexture(front, design, paper);
    backPage.texture(back, false, paper);
    renderer?.setPages(front, back);
    showRight(newPage(2 * turned + 1, handlers.nextFragment()));
    // Dernière feuille : elle découvre l'intérieur de la couverture arrière, sans page.
    book.classList.toggle('last-page', handlers.lastLeaf());
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

  const refresh = (): void => {
    if (turning || isClosing) return;
    closing.reset();
    openNewBook();
    isClosed = handlers.progress() === 0 && handlers.stayClosed();
    if (isClosed) closing.presentClosed();
    book.classList.toggle('closed', isClosed);
  };

  return { root: book, autoTurn, refresh };
};
