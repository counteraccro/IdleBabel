import { el } from '../../../dom';
import { button, dialog, stack, traps, type Trap } from './trapStage';

/** Le compte à rebours, en secondes : arrivé à zéro, il repart (« prolongation exceptionnelle »). */
const COUNTDOWN = 10;

/**
 * L'urgence bienveillante : une offre, deux pages en stock, un compte à rebours qui ne finit jamais. Refuser se
 * dit « Non merci, je préfère rester ignorant », puis il faut l'assumer.
 */
export const urgencyTrap: Trap = ({ show, done, every, stopTimers }) => {
  const text = traps().urgency;

  const offer = (): void => {
    const timer = el('div', 'dp-timer', `00:${COUNTDOWN}`);
    const note = el('p', undefined, text.watching);
    show(
      dialog(
        text.title,
        undefined,
        el('div', 'dp-stock', text.stock),
        timer,
        note,
        stack(
          button('hot', text.yes, () => done(false, text.taken)),
          button('link', text.no, shame),
        ),
      ),
    );
    let left = COUNTDOWN;
    every(() => {
      left--;
      if (left < 0) {
        left = COUNTDOWN;
        note.textContent = text.extended;
      }
      timer.textContent = `00:${String(left).padStart(2, '0')}`;
    }, 1000);
  };

  const shame = (): void => {
    stopTimers();
    show(
      dialog(
        text.really,
        text.reallyText,
        stack(
          button('hot', text.changeMind, offer),
          button('link', text.assume, () => done(true, text.free)),
        ),
      ),
    );
  };

  offer();
};
