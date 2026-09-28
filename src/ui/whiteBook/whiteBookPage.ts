import './whiteBook.css';
import { el, type Component } from '../dom';
import { createBigBookPage } from '../strangeBook/strangeBookPage';
import { createVellum } from './vellum';
import { createWhiteBookPages } from './pages';
import type { Binding } from '../book/bindings';
import type { Paper } from '../book/pageRender';
import type { GameState } from '../../core/state';

/** Vélin : une peau crème, plus chaude sur les bords. */
const WHITE_BINDING: Binding = { dark: '#c9b890', leather: '#e3d7b8', deep: '#9c8a62' };
export const WHITE_PAPER: Paper = ['#f3eee2', '#e9e2d1', '#dcd4bf'];

/** Plats : rien d'écrit ; devant, un hexagone frappé à froid au centre. */
const cover = (seed: number, stamped: boolean): HTMLElement => {
  const root = el('span', 'cover-art cover-blank');
  root.append(createVellum(seed, stamped));
  return root;
};

export const createWhiteBookPage = (state: GameState, onBack: () => void): Component =>
  createBigBookPage(
    {
      pages: (goTo) => createWhiteBookPages(state, goTo),
      paper: WHITE_PAPER,
      covers: {
        binding: WHITE_BINDING,
        // Tranche dorée : le livre est précieux.
        edge: { paper: '#d6ae5a', line: '#a47d2e' },
        dress: ({ front, back }) => {
          front.replaceChildren(cover(3, true));
          back.replaceChildren(cover(11, false));
        },
      },
      className: 'wb-page',
    },
    onBack,
  );
