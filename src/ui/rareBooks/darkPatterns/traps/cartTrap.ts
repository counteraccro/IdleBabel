import './cartTrap.css';
import { el } from '../../../dom';
import { button, dialog, traps, type Trap } from './trapStage';

/**
 * Le panier attentionné : trois articles cochés d'avance à côté du livre ; en décocher un en fait apparaître un
 * autre, coché lui aussi, sous « Vous aimerez aussi » (quatre au plus). Sous le total, en tout petit, un arrondi
 * solidaire déjà coché. La grande porte : payer ce qu'on voit. La vraie sortie : tout décocher, l'arrondi compris,
 * puis « Payer 1 page ».
 */
export const cartTrap: Trap = ({ show, done }) => {
  const text = traps().cart;
  const more = [...text.more] as [string, number][];
  const pages = (count: number): string => (count > 1 ? text.pages : text.page).replace('{n}', String(count));
  const extras: [HTMLInputElement, number][] = [];
  const list = el('div');
  const also = el('div');
  const total = el('b');

  const row = (name: string, price: number, into: HTMLElement, fixed: boolean, fresh = false): void => {
    const line = el('label', `dp-cart-row${fixed ? ' dp-fixed' : ''}${fresh ? ' dp-new' : ''}`);
    const box = el('input');
    box.type = 'checkbox';
    box.checked = true;
    box.disabled = fixed;
    line.append(box, el('span', undefined, name), el('span', undefined, pages(price)));
    into.append(line);
    if (fixed) return;
    extras.push([box, price]);
    box.addEventListener('change', () => {
      const next = more.shift();
      if (!box.checked && next) {
        if (!also.childElementCount) also.append(el('p', 'dp-also', text.alsoLike));
        row(...next, also, false, true);
      }
      sum();
    });
  };

  const [book, ...rest] = text.items as [string, number][];
  row(...book, list, true);
  for (const item of rest) row(...item, list, false);
  // La case cachée : sous le total, en tout petit.
  const round = el('label', 'dp-round');
  const roundBox = el('input');
  roundBox.type = 'checkbox';
  roundBox.checked = true;
  roundBox.addEventListener('change', () => sum());
  round.append(roundBox, document.createTextNode(text.round));
  const totalRow = el('div', 'dp-total');
  totalRow.append(el('span', undefined, text.total), total);

  let count = 0;
  const pay = button('big', '', () => (count === 1 ? done(true, text.free) : done(false, text.bought.replace('{n}', String(count)))));
  pay.classList.add('dp-pay');
  const sum = (): void => {
    count = book[1] + extras.reduce((all, [box, price]) => all + (box.checked ? price : 0), 0) + (roundBox.checked ? 1 : 0);
    total.textContent = pages(count);
    pay.textContent = text.pay.replace('{total}', pages(count));
  };
  sum();
  const box = dialog(text.title, undefined, list, also, totalRow, round, pay);
  box.classList.add('dp-cart');
  show(box);
};
