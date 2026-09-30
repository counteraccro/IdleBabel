import './gameTitle.css';
import { el } from './dom';
import { LETTERS } from '../systems/babelText';

/** Symboles de la Bibliothèque qui prennent un instant la place des lettres. */
const SYMBOLS = `${LETTERS},.`;
/** Au survol : chaque lettre part un peu après la précédente, reste brouillée ce temps, puis revient. */
const LETTER_DELAY_MS = 90;
const SCRAMBLED_MS = 700;
/** Temps du fondu (gameTitle.css) : le titre ne se rebrouille pas avant que tout soit revenu. */
const FADE_MS = 900;

/**
 * Le titre du jeu, en haut à gauche : l'hexagone doré des galeries de Babel, « Babel » en or gravé (grand B,
 * petites capitales), « Idle » discret calé après le B. Au survol, les lettres de « Babel » se changent une à
 * une en symboles de la Bibliothèque, puis reviennent ; immobile le reste du temps.
 */
export const createGameTitle = (): HTMLElement => {
  const root = el('h1', 'game-title');
  root.setAttribute('aria-label', 'Idle Babel');
  // Le même dessin que le favicon (public/favicon.svg).
  const seal = el('img', 'game-title-seal');
  seal.src = `${import.meta.env.BASE_URL}favicon.svg`;
  seal.alt = '';
  const stack = el('span', 'game-title-stack');
  const idle = el('span', 'game-title-idle', 'Idle');
  const babel = el('span', 'game-title-babel');
  // Chaque lettre en double : la vraie, et par-dessus le symbole qui la remplace un instant (en fondu).
  const letters = [...'Babel'].map((char) => {
    const letter = el('span', 'game-title-letter');
    letter.append(el('span', 'game-title-real', char), el('span', 'game-title-symbol'));
    babel.append(letter);
    return letter;
  });
  stack.append(idle, babel);
  for (const part of [seal, stack]) part.setAttribute('aria-hidden', 'true');
  root.append(seal, stack);

  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  let busy = false;
  root.addEventListener('mouseenter', () => {
    if (busy || still.matches) return;
    busy = true;
    letters.forEach((letter, i) =>
      window.setTimeout(() => {
        letter.lastElementChild!.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        letter.classList.add('scrambled');
        window.setTimeout(() => letter.classList.remove('scrambled'), SCRAMBLED_MS);
      }, i * LETTER_DELAY_MS),
    );
    window.setTimeout(() => (busy = false), letters.length * LETTER_DELAY_MS + SCRAMBLED_MS + FADE_MS);
  });
  return root;
};
