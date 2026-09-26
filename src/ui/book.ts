import './book.css';
import { el } from './dom';
import { randomBabelText } from '../systems/babelText';

const PAGE_LENGTH = 1100;
const FLIP_MS = 520;

/** Un livre ouvert : cliquer tourne une page (texte de Babel toujours nouveau). */
export const createBook = (label: string, onTurn: () => void): HTMLButtonElement => {
  const book = el('button', 'book');
  book.setAttribute('aria-label', label);

  const cover = el('span', 'book-cover');
  const left = el('span', 'book-page book-left');
  const right = el('span', 'book-page book-right');
  const leaf = el('span', 'book-leaf');
  const leafFront = el('span', 'book-page book-leaf-front');
  const leafBack = el('span', 'book-page book-leaf-back');
  leaf.append(leafFront, leafBack);
  cover.append(left, right, leaf);
  book.append(cover);

  left.textContent = randomBabelText(PAGE_LENGTH);
  right.textContent = randomBabelText(PAGE_LENGTH);

  let settle = 0;
  book.addEventListener('click', () => {
    onTurn();
    // La feuille tournée emporte la page de droite ; son verso devient la nouvelle page de gauche.
    const nextLeft = randomBabelText(PAGE_LENGTH);
    leafFront.textContent = right.textContent;
    leafBack.textContent = nextLeft;
    right.textContent = randomBabelText(PAGE_LENGTH);

    leaf.classList.remove('turning');
    void leaf.offsetWidth; // relance l'animation même en cliquant très vite
    leaf.classList.add('turning');

    window.clearTimeout(settle);
    settle = window.setTimeout(() => {
      left.textContent = nextLeft;
      leaf.classList.remove('turning');
    }, FLIP_MS);
  });

  return book;
};
