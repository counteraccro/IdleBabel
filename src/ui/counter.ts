import { el, type Component } from './dom';
import { getLocale, t } from '../i18n';
import { formatNumber } from '../core/format';
import { setNumberText } from './babelDigits';
import { pagesPerSecond } from '../systems/production';
import { boonOn } from '../systems/boons';
import { etherSpendable } from '../systems/prestige';
import { lotteryEffects } from '../systems/lotteryEffects';
import { goldenHere } from '../systems/goldenMimic';
import { mimicHere } from '../systems/mimic';
import type { GameState } from '../core/state';

/**
 * Le compteur du haut : les pages en réserve, la vitesse, la Connaissance. L'Etherium ouvert (`showEther`),
 * l'Éther à dépenser à leur place (demande de l'auteur, 09/10) : on ne savait pas combien il en restait. Dessous, `below`
 * (le bouton du prestige). Les médaillons sont à côté du titre (ui/medalsBar.ts).
 */
export const createCounter = (state: GameState, showEther: () => boolean = () => false, below?: Component): Component => {
  const root = el('section', 'counter');
  const value = el('div', 'value');
  const rate = el('div', 'label');
  // Connaissance : la ligne n'apparaît qu'avec la première trouvaille.
  const knowledge = el('div', 'label knowledge');
  root.append(value, rate, knowledge);
  // Sous l'Éther, le bouton du prestige (l'Etherium consulté).
  if (below) root.append(below.root);
  // Les nombres dans leur propre élément, dorés (classe number).
  const [pages, speed, carried] = [el('span', 'number'), el('span', 'number'), el('span', 'number')];
  const pagesLabel = document.createTextNode('');
  const perSecond = document.createTextNode('');
  const knowledgeLabel = document.createTextNode('');
  value.append(pages);
  rate.append(pagesLabel, speed, perSecond);
  knowledge.append(knowledgeLabel, carried);
  const set = (node: Node, text: string): void => {
    if (node.textContent !== text) node.textContent = text;
  };

  const update = (): void => {
    const ether = showEther();
    root.classList.toggle('ether', ether);
    if (ether) {
      setNumberText(pages, formatNumber(Math.floor(state.ether), getLocale()), 42);
      // Juste après un prestige, il se dépense ; le reste du temps, il attend (le mot de la couverture).
      set(pagesLabel, t(etherSpendable(state) ? 'etherium.ether' : 'etherium.cover.reserve'));
    } else {
      setNumberText(pages, formatNumber(Math.floor(state.pages), getLocale()), 42);
      set(pagesLabel, `${t('ui.pages')} · `);
    }
    speed.hidden = ether;
    set(perSecond, ether ? '' : t('ui.perSecond'));
    if (!ether) setNumberText(speed, formatNumber(pagesPerSecond(state), getLocale()), 14);
    knowledge.hidden = ether || state.lifetimeKnowledge === 0;
    set(knowledgeLabel, `${t('ui.knowledge')} `);
    setNumberText(carried, formatNumber(state.knowledge, getLocale()), 13);
    // Ce que porte un bonus en cours luit : la lecture pendant la Transe, la Connaissance pendant la Mémoire vive.
    speed.classList.toggle('boosted', boonOn('trance'));
    carried.classList.toggle('boosted', boonOn('mind'));
    // Un malus, en cuivre (l'auteur, 19/10, « mimic comprise » ; le cuivre, 21/10) : la vitesse que baissent ÷ 2, une méthode arrêtée ou la
    // Mimic ; la Connaissance que la Mimic avale ; les pages et la Connaissance que la Mimic dorée mange.
    const now = Date.now();
    const golden = goldenHere(state, now);
    const lottery = lotteryEffects(state, now).some((effect) => effect.id === 'half' || effect.id === 'stopped');
    speed.classList.toggle('cursed', lottery || mimicHere(state));
    pages.classList.toggle('cursed', !ether && golden);
    carried.classList.toggle('cursed', golden || mimicHere(state));
    below?.update();
  };
  update();
  return { root, update };
};
