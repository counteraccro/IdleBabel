import { preparePageTexture, type Paper } from '../../book/pageRender';
import { edgeTexture } from '../../book3d/textures';
import { getLocale } from '../../../i18n';
import { loadPuzzleWords } from '../../../systems/puzzles';
import { loadPuzzleFonts } from './puzzlesDraw';
import { puzzlesBack, puzzlesFront, puzzlesInside, puzzlesSpine } from './puzzlesCover';
import { keyPuzzles, paintPuzzlesPage, pressPuzzles, puzzlesPointable, shownPuzzles } from './puzzlesPages';
import { GOLD } from './puzzlesDraw';
import type { RareBookArt } from '../rareBookArt';

/** Le dos de la maquette : 120 de large pour 800 de haut (le dos s'enroule sur 1,4 fois l'épaisseur). */
const THICKNESS = 120 / 800 / 1.4;

/** Le papier de la maquette, un peu plus jaune en bas. */
const PAPER: Paper = ['#f5f1e6', '#f3efe4', '#eee8d8'];

/**
 * « 410 grilles de JEUX » (maquette .ai/maquette-livre-jeux.html, validée le 20/10/2026) : un cahier de jeux du kiosque.
 * Chaque jour, neuf grilles tirées de la graine de la partie et de la date (systems/puzzles.ts). Dans la bibliothèque, on
 * clique une case puis on tape au clavier, et « Vérifier » rapporte de la lecture et de la Connaissance ; le livre en main
 * montre les grilles telles que le joueur les a laissées.
 */
export const puzzlesArt: RareBookArt = {
  thickness: THICKNESS,
  paper: PAPER,
  look: async () => {
    await loadPuzzleFonts();
    return {
      cover: puzzlesFront(),
      back: puzzlesBack(),
      inside: puzzlesInside(),
      spine: puzzlesSpine(THICKNESS),
      leather: GOLD,
      edge: edgeTexture(PAPER[1], '#ddd5c0'),
      paper: PAPER[0],
      // Un cahier agrafé : ni tranchefiles, ni signet.
    };
  },
  // La réserve de mots de la langue (chargée à part : le reste du jeu n'en a pas besoin), et les lettres du kiosque.
  prepare: async () => {
    await Promise.all([loadPuzzleFonts(), loadPuzzleWords(getLocale())]);
  },
  paint: (page, canvas, spineOnLeft, state) => {
    paintPuzzlesPage(preparePageTexture(canvas, spineOnLeft, PAPER), page, state);
    return true;
  },
  press: (page, x, y, state) => pressPuzzles(page, x, y, state),
  pointable: (page, x, y, state) => puzzlesPointable(page, x, y, state),
  shown: (page) => shownPuzzles(page),
  key: (key, state) => keyPuzzles(key, state),
};
