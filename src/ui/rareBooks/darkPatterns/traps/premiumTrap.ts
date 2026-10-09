import { el } from '../../../dom';
import { button, dialog, stack, traps, type Trap } from './trapStage';

/** Le faux prélèvement : la barre se remplit, puis le mot rassurant. */
const PAYING_MS = 2700;

/**
 * L'offre premium : trois formules payantes, la plus chère mise en avant, et en tout petit, presque invisible,
 * « Continuer avec la version limitée (déconseillé) ». Choisir une formule fait semblant de prélever des pages :
 * rien n'est pris (décision de l'auteur, 09/10). La vraie sortie : la version limitée, assumée.
 */
export const premiumTrap: Trap = ({ show, done, later }) => {
  const text = traps().premium;

  const pay = (): void => {
    const bar = el('div', 'dp-bar');
    const fill = el('div');
    bar.append(fill);
    show(dialog(text.welcome, undefined, bar, el('p', undefined, text.paying)));
    requestAnimationFrame(() => requestAnimationFrame(() => (fill.style.width = '100%')));
    later(() => done(false, text.paid), PAYING_MS);
  };

  const plans = (): void => {
    const page = el('div', 'dp-plans');
    const cards = el('div', 'dp-cards');
    text.plans.forEach((plan, index) => {
      const best = index === 1;
      const card = el('div', best ? 'dp-card dp-best' : 'dp-card');
      if (best) card.append(el('div', 'dp-tag', text.best));
      const price = el('div', 'dp-price', plan.price);
      price.append(el('small', undefined, ` ${text.perMonth}`));
      const perks = el('ul');
      for (const perk of plan.perks) perks.append(el('li', undefined, `✓ ${perk}`));
      card.append(el('b', undefined, plan.name), price, perks, button(best ? 'hot' : 'big', text.trial, pay));
      cards.append(card);
    });
    page.append(
      el('h3', undefined, text.title),
      el('p', 'dp-sub', text.sub),
      cards,
      el('div', 'dp-fine', text.fine),
      button('ghost', text.limited, lose),
    );
    show(page);
  };

  const lose = (): void => {
    const losses = el('ul', 'dp-losses');
    for (const loss of text.losses) losses.append(el('li', undefined, `✗ ${loss}`));
    show(
      dialog(
        text.lose,
        undefined,
        losses,
        stack(
          button('hot', text.keep, pay),
          button('link', text.goLimited, () => done(true, text.free)),
        ),
      ),
    );
  };

  plans();
};
