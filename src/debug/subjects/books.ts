import { el } from '../../ui/dom';
import { row } from '../debugControls';
import { maxTurnsPerSecond, setTurnCap } from '../../systems/knowledge';
import { forceTitles, type TitleOverride } from '../../systems/coverTitle';
import { STRANGE_BOOK_INDEX, revealStats, statsRevealed, strangeBookFound } from '../../systems/strangeBook';
import { completion, currentTarget } from '../../systems/sentences';
import { isDeciphered } from '../../systems/decipher';
import { PARTS, type PartId } from '../../data/decipher';
import { bigBookOpen, rebuildScreen, refreshBook, rewriteBigBook } from '../refresh';
import { completeSentence } from './methods';
import { format, type DebugSubject } from './subject';

/** Menu des titres de couverture : tels que tirés, ou tous d'une sorte. */
const titlesMenu = (): HTMLElement => {
  const titles = el('select');
  for (const [value, text] of [
    ['', 'tels que tirés'],
    ['none', 'charabia'],
    ['word', 'un vrai mot'],
    ['title', 'titre entier'],
  ]) {
    const option = el('option', undefined, text);
    option.value = value;
    titles.append(option);
  }
  titles.addEventListener('change', () => {
    forceTitles((titles.value || undefined) as TitleOverride);
    refreshBook();
  });
  return row('Titres des couvertures', titles);
};

export const BOOK_SUBJECTS: DebugSubject[] = [
  {
    id: 'handBook',
    chapter: 'books',
    name: 'Le livre en main',
    description: 'Sa page, son numéro, les titres des couvertures, le défilement.',
    build: (kit, state) => {
      kit.number(
        'Page',
        () => state.bookPage,
        (v) => {
          state.bookPage = Math.min(v, 409);
          refreshBook();
        },
        '0 à 409 ; 405 : le livre se referme bientôt',
        409,
      );
      kit.number(
        'Livres terminés',
        () => state.booksFinished,
        (v) => {
          state.booksFinished = v;
          refreshBook();
        },
        'numéro du livre : couverture, reliure',
      );
      kit.custom(titlesMenu());
      kit.number('Défilement', maxTurnsPerSecond, setTurnCap, 'pages/s au plus quand elles tournent seules (8 par défaut ; 0 : remettre)');
    },
  },
  {
    id: 'whiteBook',
    chapter: 'books',
    name: 'Le livre blanc',
    description: 'Ce qui est écrit, la phrase en cours.',
    build: (kit, state) => {
      kit.info('Écrit', () => `${format(completion(state) * 100)} % des morceaux`);
      kit.info('Phrase en cours', () => currentTarget(state) ?? 'aucune (toutes les méthodes trouvées)');
      kit.buttons('', [
        [
          'Compléter la phrase en cours',
          () => {
            const target = currentTarget(state);
            if (target) completeSentence(state, target);
          },
        ],
        ['L’ouvrir', () => (window.location.hash = '#blanc')],
        [
          'Tout effacer',
          () => {
            state.written = {};
            rewriteBigBook();
          },
        ],
      ]);
    },
  },
  {
    id: 'strangeBook',
    chapter: 'books',
    name: 'Le livre étrange',
    description: 'Trouvé ou non, statistiques en clair, déchiffrage.',
    build: (kit, state) => {
      kit.info('Trouvé', () => (strangeBookFound(state) ? 'oui' : `au livre n° ${STRANGE_BOOK_INDEX + 1}`));
      kit.check('Statistiques visibles', 'livre accessible, tout débloqué, titre et légendes en clair', statsRevealed, (on) => {
        revealStats(on);
        refreshBook();
        // Livre étrange déjà ouvert : il se réécrit à la même page ; sinon l'écran est reconstruit.
        if (bigBookOpen()) rewriteBigBook();
        else rebuildScreen();
      });
      kit.buttons(
        'Raccourcis',
        [
          [
            'Le prendre en main',
            () => {
              state.booksFinished = STRANGE_BOOK_INDEX;
              state.bookPage = 0;
              refreshBook();
            },
          ],
          ['L’ouvrir en grand', () => (window.location.hash = '#livre')],
        ],
        'le prendre en main le rend aussi accessible',
      );
      kit.info('Déchiffré', () => {
        const parts = Object.keys(PARTS) as PartId[];
        return `${parts.filter((part) => isDeciphered(state, part)).length} / ${parts.length} parties`;
      });
      kit.buttons('', [
        [
          'Tout déchiffrer',
          () => {
            state.deciphered = Object.keys(PARTS) as PartId[];
            rewriteBigBook();
          },
        ],
        [
          'Oublier le déchiffrage',
          () => {
            state.deciphered = [];
            rewriteBigBook();
          },
        ],
      ]);
    },
  },
];
