import { el } from '../dom';
import { messages, t } from '../../i18n';
import { BRIBE_PAGES } from '../../data/trueStory';
import { S } from '../../data/etheriumStars';
import { starLit, storyBribes } from '../../systems/etherium';
import { tell } from './prestigeStory';
import type { GameState } from '../../core/state';

/** Le temps où la bribe reste à l'écran (fondu compris, voir .bribe-vision dans etherium.css). */
const VISION_MS = 7000;

let shown: HTMLElement | null = null;

/**
 * Une étoile du Rideau vient de s'allumer (maquette .ai/maquette-faux-livre.html) : sa bribe s'annonce en haut de l'écran,
 * comme une vision, sans ouvrir le livre (la vitrine sert à la relire). La dernière raconte aussi la fin, une seule fois :
 * « Pas celui-ci » (texte validé par l'auteur le 14/10, version B), et la lecture double.
 */
export const announceBribe = (state: GameState): void => {
  const index = storyBribes(state) - 1;
  if (index < 0 || index >= BRIBE_PAGES.length) return;
  shown?.remove();
  const vision = el('div', 'bribe-vision');
  vision.setAttribute('aria-live', 'polite');
  vision.append(
    el('small', '', t('etherium.trueStory.vision').replace('{n}', String(BRIBE_PAGES[index]))),
    el('span', '', messages().rareBooks.trueStory.bribes[index]),
  );
  document.body.append(vision);
  shown = vision;
  setTimeout(() => vision.remove(), VISION_MS);
  if (!starLit(state, S.storyEnd)) return;
  const end = messages().etherium.trueStory.end;
  const modal = tell(end.title, end.text, [{ label: end.button, kind: 'primary' }], 'dim', end.gain);
  modal.querySelector('.prestige-warning')?.classList.add('bribe-gain');
};
