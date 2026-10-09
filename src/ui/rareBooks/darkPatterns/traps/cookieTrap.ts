import { el } from '../../../dom';
import { button, dialog, stack, traps, type Trap } from './trapStage';

/** Partenaires dans la liste des préférences : les noms donnés, puis des numéros. */
const PARTNERS = 40;

/**
 * Le mur de cookies : « Tout accepter » en grand ; « Tout refuser » derrière « Paramétrer », au bout de quarante
 * partenaires cochés d'avance ; puis « Avant de partir… », dont la croix est minuscule et presque blanche.
 * La vraie sortie : tout refuser, enregistrer, et trouver la croix.
 */
export const cookieTrap: Trap = ({ show, done }) => {
  const text = traps().cookies;
  const accept = (): void => done(false, text.thanks);

  const banner = (): void => {
    const bar = el('div', 'dp-banner');
    const actions = el('div', 'dp-banner-actions');
    actions.append(button('link', text.settings, settings), button('big', text.acceptAll, accept));
    bar.append(el('p', undefined, text.banner), actions);
    show(bar);
  };

  const settings = (): void => {
    const panel = el('div', 'dp-panel');
    const head = el('div', 'dp-panel-head');
    head.append(el('b', undefined, text.preferences), button('big', text.acceptAll, accept));
    const list = el('div', 'dp-list');
    const switches: HTMLButtonElement[] = [];
    for (let index = 0; index < PARTNERS; index++) {
      const item = el('div', 'dp-item');
      const name = text.partners[index] ?? text.partner.replace('{n}', String(index + 1));
      const toggle = button('link', '', () => toggle.classList.toggle('off'));
      toggle.className = 'dp-switch';
      toggle.setAttribute('aria-label', name);
      switches.push(toggle);
      item.append(el('span', undefined, name), toggle);
      list.append(item);
    }
    // « Tout refuser » : tout en bas de la liste, après les quarante partenaires.
    list.append(button('link', text.refuseAll, () => switches.forEach((toggle) => toggle.classList.add('off'))));
    const foot = el('div', 'dp-panel-foot');
    foot.append(
      button('big', text.save, () =>
        switches.every((toggle) => toggle.classList.contains('off')) ? beforeLeaving() : done(false, text.saved),
      ),
    );
    panel.append(head, list, foot);
    show(panel);
  };

  const beforeLeaving = (): void => {
    const box = dialog(text.leaving, text.leavingText, stack(button('big', text.keepReading, () => done(false, text.kept))));
    const cross = button('link', '×', () => done(true, text.free));
    cross.className = 'dp-close';
    box.prepend(cross);
    show(box);
  };

  banner();
};
