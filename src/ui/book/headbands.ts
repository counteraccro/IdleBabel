import { el } from '../dom';

/**
 * Tranchefiles : les bourrelets de fil tressé en haut et en bas du dos, entre les deux pages.
 * Ils montrent que les pages sont cousues à la reliure (voir bookCover.css).
 */
export const createHeadbands = (): HTMLElement[] => [el('span', 'headband headband-top'), el('span', 'headband headband-bottom')];
