import { el, type Component } from '../dom';
import { getLocale, t } from '../../i18n';
import { formatNumber } from '../../core/format';
import { etherSpendable, feedReady, prestigeEther, prestigeGain } from '../../systems/prestige';
import { feedEtherium } from './prestigeStory';
import type { GameState } from '../../core/state';

/** Une étoile touchée qu'on ne peut pas encore allumer : le bouton luit un instant (constellationPage.ts). */
export const FEED_FLASH = 'etherium-feed-flash';

/**
 * Le bouton sous l'Éther (maquette .ai/maquette-prestige-geste.html, piste A, validée le 14/10) : l'Etherium consulté, le
 * nourrir (le prestige) ; « Le nourrir · +n Éther », ou « Le nourrir encore » sans Éther à gagner mais avec de quoi allumer
 * une étoile. Juste après un prestige, ou sans rien à faire, il n'est pas là. `shown` : l'Etherium ouvert ; `done` : le
 * prestige fait, le livre se redessine.
 */
export const createFeedButton = (state: GameState, shown: () => boolean, done: () => void): Component => {
  const root = el('button', 'etherium-feed');
  root.type = 'button';
  root.addEventListener('click', () => feedEtherium(state, done));
  window.addEventListener(FEED_FLASH, () => {
    root.classList.remove('flash');
    // Relancée même si elle luisait déjà.
    void root.offsetWidth;
    root.classList.add('flash');
  });
  root.addEventListener('animationend', (event) => {
    if (event.animationName === 'etherium-feed-flash') root.classList.remove('flash');
  });
  const update = (): void => {
    const visible = shown() && !etherSpendable(state) && feedReady(state);
    root.hidden = !visible;
    if (!visible) return;
    const text =
      prestigeGain(state) >= 1
        ? t('etherium.feed.button').replace('{n}', formatNumber(prestigeEther(state), getLocale()))
        : t('etherium.feed.again');
    if (root.textContent !== text) root.textContent = text;
  };
  update();
  return { root, update };
};
