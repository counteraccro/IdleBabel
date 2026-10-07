import { el } from '../../ui/dom';
import { t } from '../../i18n';
import { SENTENCES } from '../../data/sentences';
import { maxTurnsPerSecond, setTurnCap } from '../../systems/knowledge';
import { forceTitles, type TitleOverride } from '../../systems/coverTitle';
import { STRANGE_BOOK_INDEX, revealStats, statsRevealed, strangeBookFound } from '../../systems/strangeBook';
import { completion, currentTarget } from '../../systems/sentences';
import { isDeciphered } from '../../systems/decipher';
import { PARTS } from '../../data/decipher';
import { bigBookOpen, rebuildScreen, refreshBook, rewriteBigBook } from '../refresh';
import { completeSentence } from './methods';
import { remember } from '../remember';
import { format, type DebugSubject } from './subject';

/** Menu des titres de couverture : tels que tirés, ou tous d'une sorte. */
const titlesMenu = (): HTMLElement => {
  const titles = el('select', 'debug-field');
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
  // Le choix gardé vaut dès l'ouverture de la barre.
  remember('titles', titles);
  if (titles.value) forceTitles(titles.value as TitleOverride);
  return titles;
};

export const BOOK_SUBJECTS: DebugSubject[] = [
  {
    id: 'handBook',
    chapter: 'books',
    name: 'Le livre en main',
    description: 'Sa page, son numéro, les titres des couvertures, le défilement.',
    peek: (state) => `livre ${state.booksFinished + 1} · p. ${state.bookPage}`,
    build: (kit, state) => {
      kit.number(
        'Page',
        () => state.bookPage,
        (v) => {
          // Deux pages par feuille : toujours au début d'une double page.
          state.bookPage = Math.min(v - (v % 2), 408);
          refreshBook();
        },
        { hint: '0 à 408, de deux en deux ; 400 : le livre se referme bientôt.', max: 408 },
      );
      kit.number(
        'Livres terminés',
        () => state.booksFinished,
        (v) => {
          state.booksFinished = v;
          refreshBook();
        },
        { hint: 'Numéro du livre : couverture, reliure.', steps: true },
      );
      kit.row('Titres', titlesMenu(), 'Titres des couvertures.');
      kit.number('Défilement', () => maxTurnsPerSecond(state), setTurnCap, {
        hint: 'Feuilles/s au plus quand elles tournent seules (Lecture rapide par défaut ; 0 : remettre).',
      });
    },
  },
  {
    id: 'whiteBook',
    chapter: 'books',
    name: 'Le livre blanc',
    description: 'Ce qui est écrit, la phrase en cours.',
    peek: (state) => `${format(completion(state) * 100)} %`,
    build: (kit, state) => {
      kit.info('Écrit', () => `${format(completion(state) * 100)} % des morceaux`);
      kit.info(
        'Phrase en cours',
        () => {
          const tool = SENTENCES.find((sentence) => sentence.id === currentTarget(state))?.tool;
          return tool ? t(`tools.${tool}.name`) : 'aucune';
        },
        'Celle de la méthode à découvrir. Aucune : toutes les méthodes sont trouvées.',
      );
      kit.actions(
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
          { danger: true },
        ],
      );
    },
  },
  {
    id: 'strangeBook',
    chapter: 'books',
    name: 'Le Grand Livre',
    description: 'Trouvé ou non, statistiques en clair, déchiffrage.',
    peek: (state) => (strangeBookFound(state) ? 'trouvé' : 'pas trouvé'),
    build: (kit, state) => {
      kit.check('Statistiques visibles', 'Livre accessible, tout débloqué, titre et légendes en clair.', statsRevealed, (on) => {
        revealStats(on);
        refreshBook();
        // Livre étrange déjà ouvert : il se réécrit à la même page ; sinon l'écran est reconstruit.
        if (bigBookOpen()) rewriteBigBook();
        else rebuildScreen();
      });
      kit.info('Trouvé', () => (strangeBookFound(state) ? 'oui' : `au livre n° ${STRANGE_BOOK_INDEX + 1}`));
      kit.progress('Déchiffré', () => {
        return [PARTS.filter((part) => isDeciphered(state, part)).length, PARTS.length];
      });
      kit.actions(
        [
          'Le prendre en main',
          () => {
            state.booksFinished = STRANGE_BOOK_INDEX;
            state.bookPage = 0;
            refreshBook();
          },
          { title: 'Le rend aussi accessible' },
        ],
        ['L’ouvrir en grand', () => (window.location.hash = '#livre')],
        [
          'Tout déchiffrer',
          () => {
            state.deciphered = [...PARTS];
            rewriteBigBook();
          },
        ],
        [
          'Oublier le déchiffrage',
          () => {
            state.deciphered = [];
            rewriteBigBook();
          },
          { danger: true },
        ],
      );
    },
  },
];
