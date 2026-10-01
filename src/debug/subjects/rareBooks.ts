import { el } from '../../ui/dom';
import { t } from '../../i18n';
import { RARE_BOOKS } from '../../data/rareBooks';
import { forceRareBook, isRareBookFound, rareBookAt } from '../../systems/rareBooks';
import { refreshBook } from '../refresh';
import { RARE_BOOK_HASH } from '../enabled';
import { remember } from '../remember';
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
        },
        { title: 'Passe au livre suivant, qui sera celui-ci.' },
      ],
      ['L’ouvrir en grand', () => (window.location.hash = `${RARE_BOOK_HASH}${menu.value}`), { title: 'Comme dans la bibliothèque.' }],
      [
        'Tout oublier',
        () => {
          state.rareBooks = {};
          for (const book of RARE_BOOKS) delete state.seals[`rare-${book.id}`];
          state.newSeals = state.newSeals.filter((id) => !id.startsWith('rare-'));
          refreshBook();
        },
        { danger: true, title: 'Livres trouvés et leurs sceaux' },
      ],
    );
  },
};
