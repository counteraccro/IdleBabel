import { createDigitPage } from '../../systems/strangeBook';
import { hashText, seeded } from '../../core/random';
import { createPages, type LeafPage } from '../strangeBook/pages';
import { STRANGE_PAPER } from '../strangeBook/pageItems';
import { layoutPage } from '../book/pageLayout';
import { drawPageTexture } from '../book/pageRender';
import type { GameState } from '../../core/state';

/** Longueur d'une page de chiffres, comme une page de charabia du livre en main. */
const PAGE_LENGTH = 700;
/** Place en 3D de la première page du grand livre : au dos de la page de titre. */
const FIRST_PAGE = 2;

/**
 * Le livre étrange tenu en main : après sa page de titre, les pages du
 * grand livre (garde, sommaire, chiffres, sceaux), en petit et sans rien de cliquable ; ensuite, des
 * chiffres jusqu'au bout. Le sommaire et les chapitres sont ceux du moment où le livre est ouvert ; chaque
 * page garde les valeurs du moment où elle est dessinée. Renvoie de quoi dessiner une page (à partir de 2).
 */
export const strangeHandPages = (state: GameState) => {
  let pages: LeafPage[] | null = null;
  return (page: number, canvas: HTMLCanvasElement, spineOnLeft: boolean): void => {
    pages ??= createPages(state, () => {}, FIRST_PAGE);
    const leaf = pages[page - FIRST_PAGE];
    if (leaf) return leaf.paint(canvas, spineOnLeft, STRANGE_PAPER);
    // Même page, mêmes chiffres (elle se redessine à l'identique).
    const random = seeded(hashText(`étrange:${page}`));
    drawPageTexture(canvas, layoutPage(createDigitPage(PAGE_LENGTH, random)), spineOnLeft, STRANGE_PAPER);
  };
};
