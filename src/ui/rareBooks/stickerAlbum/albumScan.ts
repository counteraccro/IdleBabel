import { ALBUM_STEP, scanAlbum } from '../../../systems/stickerAlbum';
import { idle } from '../slowDrawing';
import type { GameState } from '../../../core/state';

/**
 * L'album passe les livres lus en revue par petits bouts, dans les moments libres, tant qu'il en reste (l'album ouvert, ou
 * une pochette achetée au guichet). La promesse se tient quand tous le sont.
 */
let scanning: Promise<void> | undefined;
export const scanInBackground = (state: GameState): Promise<void> => {
  if (scanAlbum(state, 0)) return Promise.resolve();
  scanning ??= (async (): Promise<void> => {
    while (!scanAlbum(state, ALBUM_STEP)) await idle();
    scanning = undefined;
  })();
  return scanning;
};
