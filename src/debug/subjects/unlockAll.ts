import { OPEN_STARS } from '../../data/etheriumStars';
import { SENTENCES } from '../../data/sentences';
import { PARTS } from '../../data/decipher';
import { LORE } from '../../data/lore';
import { ETHER_PAGES, ETHERIUM_NAMED_PAGES } from '../../data/etherium';
import { STRANGE_BOOK_INDEX } from '../../systems/strangeBook';
import { sealAll } from '../../systems/seals';
import { rebuildScreen, refreshBook, refreshLibrary, rewriteBigBook } from '../refresh';
import { writeAll } from './allSentences';
import { maxIntuitions } from './intuitions';
import { findAllRareBooks } from './rareBooks';
import type { GameState } from '../../core/state';
import type { DebugSubject } from './subject';

/**
 * Tout d'un coup, comme une partie finie : un prestige fait (avec de quoi lire l'Éther), toutes les étoiles de
 * l'Etherium (l'Âge Automatique compris), toutes les phrases (méthodes, souvenirs, anomalies), les intuitions au
 * maximum, le Grand Livre trouvé et déchiffré, les livres rares, tout le lore lu, la pièce éclairée, les sceaux.
 * Rien n'est repris : pages, Connaissance, Éther et niveaux des méthodes restent tels quels.
 */
export const unlockAll = (state: GameState): void => {
  state.exiles = Math.max(1, state.exiles);
  // Un Éther déjà reçu (la partie « Éther » du Grand Livre) : les pages à vie le méritent.
  state.totalPagesRead = Math.max(state.totalPagesRead, ETHER_PAGES, ETHERIUM_NAMED_PAGES);
  state.etherReceived = Math.max(1, state.etherReceived);
  state.etherium = OPEN_STARS.map((star) => star.id);
  writeAll(state, SENTENCES);
  maxIntuitions(state);
  state.booksFinished = Math.max(state.booksFinished, STRANGE_BOOK_INDEX + 1);
  state.deciphered = [...PARTS];
  findAllRareBooks(state);
  state.loreSeen = [...new Set([...state.loreSeen, ...LORE])];
  state.lorePending = [];
  sealAll(state);
  refreshBook();
  refreshLibrary();
  rewriteBigBook();
  rebuildScreen();
};

/** Une seule ligne, en tête du livre : tout activer d'un coup. */
export const UNLOCK_ALL_SUBJECT: DebugSubject = {
  id: 'unlockAll',
  chapter: 'resources',
  name: 'Tout débloquer',
  description: 'Absolument tout d’un coup : prestige, Etherium, phrases, intuitions, livres, lore, sceaux.',
  build: (kit, state) => {
    kit.info(
      'Ce qui s’active',
      () => 'tout',
      'Un prestige fait, toutes les étoiles, toutes les phrases, les intuitions au maximum, le Grand Livre déchiffré, les livres rares, le lore lu, les sceaux. Pages, Connaissance et méthodes ne changent pas.',
    );
    kit.actions(['Tout débloquer', () => unlockAll(state), { title: 'Rien ne se reprend ensuite : à faire sur une partie d’essai.' }]);
  },
};
