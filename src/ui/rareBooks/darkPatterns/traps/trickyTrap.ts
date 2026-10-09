import './trickyTrap.css';
import { el } from '../../../dom';
import { button, dialog, traps, type Trap } from './trapStage';

/**
 * Pour chaque tournure de `traps.tricky.ways` (même ordre dans les deux langues) : cochée, la case fait-elle
 * recevoir ? « Ne décochez pas cette case si vous ne voulez pas ne pas recevoir » : oui.
 */
export const TRICKY_RECEIVES = [true, true, false, true, false, true, false];

/**
 * La question bien tournée : trois cases à régler pour ne rien recevoir, chacune dite avec une tournure tirée au
 * sort parmi sept, et jamais déjà bien réglées. Une nouvelle donne à chaque ouverture. La grande porte : valider
 * tel quel. La vraie sortie : les trois bonnes.
 */
export const trickyTrap: Trap = ({ show, done }) => {
  const text = traps().tricky;
  const ways = text.ways.map((way, index) => [way, TRICKY_RECEIVES[index]] as const).sort(() => Math.random() - 0.5);
  const boxes = text.what.map((what, index) => {
    const [way, receives] = ways[index];
    const label = el('label');
    const box = el('input');
    box.type = 'checkbox';
    box.checked = Math.random() < 0.5;
    label.append(box, document.createTextNode(way.replace('{x}', what)));
    return { label, box, receives: () => box.checked === receives };
  });
  // Jamais déjà bien réglé : sinon, la première case se retourne.
  if (!boxes.some(({ receives }) => receives())) boxes[0].box.checked = !boxes[0].box.checked;
  const validate = button('big', text.validate, () => {
    const count = boxes.filter(({ receives }) => receives()).length;
    if (!count) done(true, text.free);
    else done(false, count === 1 ? text.one : text.many.replace('{n}', String(count)));
  });
  validate.classList.add('dp-validate');
  show(dialog(text.title, text.text, ...boxes.map(({ label }) => label), validate));
};
