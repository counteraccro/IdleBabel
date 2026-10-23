import { el } from '../../ui/dom';
import { RARE_BOOKS } from '../../data/rareBooks';
import { forceRareBook, isRareBookFound, rareBookAt } from '../../systems/rareBooks';
import { forceReadingTome } from '../../systems/endings';
import { refreshBook, refreshLibrary } from '../refresh';
import { RARE_BOOK_HASH } from '../enabled';
import { remember } from '../remember';
import { CATCHES } from '../../systems/rabbit';
import { resetEndlessTrail } from '../../systems/endlessBook';
import { rabbitCrossNow } from '../../ui/rareBooks/rabbit/rabbitHunt';
import { BIG_BOOK_REWRITE } from '../../ui/book3d/book3dBook';
import { COLORING_DRAWINGS } from '../../data/coloring';
import { colorZone, drawingDone } from '../../systems/coloring';
import { coloringZones } from '../../ui/rareBooks/coloring/coloringDrawings';
import { PUZZLE_GRIDS } from '../../data/puzzles';
import { expected } from '../../systems/puzzleGrids';
import { loadPuzzleWords, refreshPuzzles, todayGrids, writeCell } from '../../systems/puzzles';
import { forgetPuzzleSession } from '../../ui/rareBooks/puzzles/puzzlesPages';
import { getLocale, t } from '../../i18n';
import type { DebugSubject } from './subject';
import type { GameState } from '../../core/state';

const rareName = (id: string): string => t(`rareBooks.${id}.name`);

/** Menu des livres rares, trouvés cochés. */
const rareMenu = (state: GameState): HTMLSelectElement => {
  const menu = el('select', 'debug-field');
  // Rempli de nouveau à l'ouverture (les coches suivent la partie), sans perdre le livre choisi.
  const fill = (): void => {
    const chosen = menu.value;
    menu.replaceChildren(
      ...RARE_BOOKS.map((book) => {
        const option = el('option', undefined, `${isRareBookFound(state, book.id) ? '✓ ' : ''}${rareName(book.id)}`);
        option.value = book.id;
        return option;
      }),
    );
    if (chosen) menu.value = chosen;
  };
  fill();
  remember('rareBook', menu);
  menu.addEventListener('focus', fill);
  return menu;
};

/** Chacun « trouvé » dans un livre à lui, loin devant : la vitrine se remplit, rien d'autre ne change. */
export const findAllRareBooks = (state: GameState): void => {
  RARE_BOOKS.forEach((book, index) => (state.rareBooks[book.id] ??= -1 - index));
  refreshBook();
  refreshLibrary();
};

export const RARE_BOOK_SUBJECT: DebugSubject = {
  id: 'rareBooks',
  chapter: 'books',
  name: 'Les livres rares',
  description: 'Trouvés, le livre en main, en prendre un.',
  peek: (state) => `${Object.keys(state.rareBooks).length} / ${RARE_BOOKS.length}`,
  build: (kit, state) => {
    kit.progress('Trouvés', () => [Object.keys(state.rareBooks).length, RARE_BOOKS.length]);
    kit.info('En main', () => {
      const id = rareBookAt(state, state.booksFinished);
      return id ? rareName(id) : 'un livre ordinaire';
    });
    const menu = rareMenu(state);
    kit.row('Livre', menu, 'Le livre à prendre en main.');
    kit.actions(
      [
        'Le prendre en main',
        () => {
          // Unique : déjà trouvé, il est d'abord oublié. Il arrive comme livre suivant, fermé.
          delete state.rareBooks[menu.value];
          state.booksFinished += 1;
          state.bookPage = 0;
          forceRareBook(state.booksFinished, menu.value);
          refreshBook();
          refreshLibrary();
        },
        { title: 'Passe au livre suivant, qui sera celui-ci.' },
      ],
      [
        'Un tome en lisant',
        () => {
          // La lecture redonne son tome : le suivant de « L'histoire de Babel » arrive comme livre suivant, fermé.
          delete state.tomeFrom.reading;
          state.tomeBook = null;
          state.booksFinished += 1;
          state.bookPage = 0;
          forceReadingTome(state.booksFinished);
          refreshBook();
          refreshLibrary();
        },
        { title: 'Le livre suivant sera le tome suivant de la saga (le tome 1 acheté).' },
      ],
      ['L’ouvrir en grand', () => (window.location.hash = `${RARE_BOOK_HASH}${menu.value}`), { title: 'Comme dans la bibliothèque.' }],
      ['Tout trouver', () => findAllRareBooks(state), { title: 'Remplit la vitrine de la bibliothèque (sans les sceaux).' }],
      [
        'Tout oublier',
        () => {
          state.rareBooks = {};
          for (const book of RARE_BOOKS) delete state.seals[`rare-${book.id}`];
          state.newSeals = state.newSeals.filter((id) => !id.startsWith('rare-'));
          refreshBook();
          refreshLibrary();
        },
        { danger: true, title: 'Livres trouvés et leurs sceaux' },
      ],
    );
    kit.info('Lapin blanc', () => `${state.rabbitCaught} / ${CATCHES} prises`);
    kit.actions(
      [
        'Faire passer le Lapin blanc',
        () => rabbitCrossNow(state),
        { title: 'Le Lapin de garenne ouvert en grand : il traverse la double page.' },
      ],
      [
        'Lapin : prises à zéro',
        () => {
          state.rabbitCaught = 0;
          delete state.seals.rabbitHome;
          window.dispatchEvent(new Event(BIG_BOOK_REWRITE));
        },
        { title: 'Il ressort de ses planches (et le sceau secret est repris).' },
      ],
    );
    kit.info('Livre sans fin', () => `${['endlessEnding', 'endlessCheat'].filter((id) => id in state.seals).length} / 2 sceaux`);
    kit.actions([
      'Livre sans fin : sceaux repris',
      () => {
        delete state.seals.endlessEnding;
        delete state.seals.endlessCheat;
        resetEndlessTrail();
      },
      { title: 'La seule fin et le tricheur, à retrouver ; le chemin suivi est oublié.' },
    ]);
    kit.info(
      'Colorie la Bibliothèque',
      () =>
        `${COLORING_DRAWINGS.filter(({ id }) => drawingDone(state, id, coloringZones())).length} / ${COLORING_DRAWINGS.length} dessins finis`,
    );
    kit.actions(
      [
        'Cahier : tout colorier',
        () => {
          // Chaque zone d'une couleur de sa boîte, au hasard ; les sceaux tombent comme en jeu.
          for (const { id, palette } of COLORING_DRAWINGS)
            for (const zone of coloringZones()[id])
              colorZone(state, id, zone, palette[Math.floor(Math.random() * palette.length)], coloringZones());
          window.dispatchEvent(new Event(BIG_BOOK_REWRITE));
        },
        { title: 'Les neuf dessins coloriés (et les deux sceaux).' },
      ],
      [
        'Cahier : tout effacer',
        () => {
          state.coloring = {};
          delete state.seals.coloringFirst;
          delete state.seals.coloringAll;
          window.dispatchEvent(new Event(BIG_BOOK_REWRITE));
        },
        { title: 'Les dessins redeviennent blancs (et les deux sceaux sont repris).' },
      ],
    );
    kit.info(
      '410 grilles de JEUX',
      () =>
        `${state.puzzles.solved} grilles résolues depuis toujours, ${Object.values(state.puzzles.grids).filter((grid) => grid.solved !== undefined).length} aujourd'hui`,
    );
    kit.actions(
      [
        'Jeux : tout remplir',
        () =>
          void loadPuzzleWords(getLocale()).then(() => {
            // Les grilles du jour remplies justes, sans les vérifier : il reste à appuyer sur « Vérifier ».
            refreshPuzzles(state);
            const grids = todayGrids(state, getLocale());
            if (!grids) return;
            for (const id of PUZZLE_GRIDS) for (const [cell, value] of expected(grids[id])) writeCell(state, id, getLocale(), cell, value);
            window.dispatchEvent(new Event(BIG_BOOK_REWRITE));
          }),
        { title: 'Les neuf grilles du jour remplies justes, pas encore vérifiées (les gains et les sceaux tombent à « Vérifier »).' },
      ],
      [
        'Jeux : tout effacer',
        () => {
          state.puzzles.grids = {};
          for (const id of ['puzzlesFirst', 'puzzlesAll', 'puzzlesNoEraser', 'puzzlesGlory']) delete state.seals[id];
          forgetPuzzleSession();
          window.dispatchEvent(new Event(BIG_BOOK_REWRITE));
        },
        { title: 'Les grilles du jour redeviennent blanches (et les quatre sceaux sont repris).' },
      ],
    );
  },
};
