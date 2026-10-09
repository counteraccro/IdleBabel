import { el } from '../../../dom';
import { button, dialog, stack, traps, type Trap } from './trapStage';

/**
 * Le désabonnement sans fin : réservé aux abonnés ; gérer ses abonnements ; « Êtes-vous sûr ? », « Vraiment sûr ? »
 * (les boutons changent de place) ; pourquoi partez-vous ; puis une case déjà cochée, « Je ne souhaite pas ne pas
 * rester abonné » : confirmée cochée, on est réabonné et tout recommence ; décochée, on est libre. À chaque étape,
 * la grande porte : rester abonné.
 */
export const unsubscribeTrap: Trap = ({ show, done }) => {
  const text = traps().unsubscribe;
  const stay = (): void => done(false, text.stayed);

  /** Une étape : le gros bouton, le petit lien ; `flipped` : le lien passe au-dessus. */
  const step = (
    title: string,
    body: string,
    big: [string, () => void],
    small: [string, () => void],
    flipped = false,
    ...extra: HTMLElement[]
  ): HTMLButtonElement => {
    const link = button('link', ...small);
    const column = stack(button('big', ...big), link);
    if (flipped) column.classList.add('dp-flipped');
    show(dialog(title, body, ...extra, column));
    return link;
  };

  const start = (again: boolean): void => {
    step(text.title, again ? `${text.again} ${text.text}` : text.text, [text.stay, stay], [text.manage, sure]);
  };
  const sure = (): void => void step(text.sure, text.sureText, [text.no, stay], [text.yes, surer]);
  const surer = (): void => void step(text.surer, text.surerText, [text.yesStay, stay], [text.noLeave, why], true);

  const why = (): void => {
    const form = el('div', 'dp-form');
    let chosen: number | null = null;
    // La dernière raison demande 410 caractères : elle ne mène nulle part.
    const last = text.reasons.length - 1;
    text.reasons.forEach((reason, index) => {
      const label = el('label');
      const input = el('input');
      input.type = 'radio';
      input.name = 'dp-why';
      input.addEventListener('change', () => {
        chosen = index;
        next.disabled = index === last;
      });
      label.append(input, document.createTextNode(reason));
      form.append(label);
    });
    const next = step(
      text.why,
      text.whyText,
      [text.finallyStay, stay],
      [text.continue, () => chosen !== null && chosen !== last && confirm()],
      false,
      form,
    );
    next.disabled = true;
  };

  const confirm = (): void => {
    const label = el('label', 'dp-check');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = true;
    label.append(box, document.createTextNode(text.box));
    step(
      text.last,
      text.lastText,
      [text.confirm, () => (box.checked ? start(true) : done(true, text.free))],
      [text.cancel, stay],
      false,
      label,
    );
  };

  start(false);
};
