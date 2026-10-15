/**
 * Un mod remplace le livre en main (IdleBabel.replaceHeldBook, plan des mods §2 : la liseuse) : sa vue est posée à la
 * place du livre 3D, au même endroit ; le jeu garde le rythme des pages, les trouvailles et la fin du livre. Seulement
 * pour les livres ordinaires : un livre rare, le Grand Livre, et le premier livre tant que son récit n'est pas lu,
 * restent en 3D (demande de l'auteur, 15/10). Un seul remplaçant : le dernier enregistré.
 */

/** Une page du livre, telle qu'un mod la voit : du charabia, et parfois une trouvaille au milieu. */
export interface ModPage {
  before: string;
  /** La trouvaille de la page (à souligner), ou une chaîne vide. */
  find: string;
  after: string;
}

/** Le livre en main, tel que le reçoit le remplaçant. */
export interface ModHeldBook {
  /** Le numéro du livre (0 : le premier de la partie). */
  readonly index: number;
  /** Pages lues : la double page ouverte montre `page` et `page + 1` ; 0, le livre vient d'arriver (la page de titre). */
  readonly page: number;
  /** Pages du livre : 410. */
  readonly pages: number;
  /** Le titre de sa couverture. */
  readonly title: string;
  /** Le texte de la page `page` (2 à 410) ; les autres sont vides. */
  text: (page: number) => ModPage;
  /** Tourne une feuille, comme un clic sur le livre : deux pages lues, leurs trouvailles, le livre suivant au bout. */
  turn: () => void;
}

/** Ce que rend le remplaçant : sa vue, et de quoi la redessiner (appelé à chaque feuille tournée, à la main ou seule). */
export interface ModHeldView {
  root: HTMLElement;
  update?: () => void;
}

export type HeldBookFactory = (book: ModHeldBook) => ModHeldView;

/** Prévient le livre en main qu'un remplaçant vient d'arriver. */
export const HELD_BOOK_REPLACED = 'idle-babel:held-book-replaced';

let replacement: HeldBookFactory | null = null;

export const heldBookReplacement = (): HeldBookFactory | null => replacement;

export const replaceHeldBook = (factory: HeldBookFactory): void => {
  if (typeof factory !== 'function') {
    console.error('[Idle Babel] replaceHeldBook attend une fonction.');
    return;
  }
  if (replacement) console.warn('[Idle Babel] le livre en main était déjà remplacé : le dernier mod l’emporte.');
  replacement = factory;
  window.dispatchEvent(new Event(HELD_BOOK_REPLACED));
};

/** Tests : le livre 3D revient. */
export const clearHeldBookReplacement = (): void => {
  replacement = null;
};
