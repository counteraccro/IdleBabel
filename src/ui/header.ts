import './ribbons.css';
import { el } from './dom';
import { t } from '../i18n';
import type { Component } from './dom';

export interface HeaderHandlers {
  onOptions: () => void;
  onWhiteBook: () => void;
  onStrangeBook: () => void;
  /** Le livre étrange a-t-il été trouvé ? Son signet n'apparaît qu'ensuite. */
  strangeBookFound: () => boolean;
  /** Des sceaux obtenus attendent d'être vus : le signet du livre étrange luit. */
  hasNewSeals: () => boolean;
}

/** Bouton de cuir, avec un petit signet de tissu qui dépasse dessous, comme d'un livre fermé. */
const ribbon = (text: string, variant: string, onClick: () => void): HTMLButtonElement => {
  const button = el('button', `ribbon ribbon-${variant}`, text);
  button.append(el('span', 'ribbon-tail'));
  button.addEventListener('click', onClick);
  return button;
};

export const createHeader = (handlers: HeaderHandlers): Component => {
  const root = el('header');
  const ribbons = el('nav', 'ribbons');
  const strangeBook = ribbon(t('ui.strangeBook'), 'strange', handlers.onStrangeBook);
  // Le livre blanc, le chercheur l'a sur lui dès son réveil ; le livre étrange se trouve plus tard.
  ribbons.append(ribbon(t('ui.options'), 'options', handlers.onOptions), ribbon(t('ui.whiteBook'), 'white', handlers.onWhiteBook), strangeBook);
  // Déjà trouvé à l'affichage : le bouton est là. Trouvé pendant la partie : il apparaît et son signet se déroule.
  strangeBook.hidden = !handlers.strangeBookFound();
  const update = (): void => {
    const found = handlers.strangeBookFound();
    if (found && strangeBook.hidden) strangeBook.classList.add('unroll');
    strangeBook.hidden = !found;
    strangeBook.classList.toggle('news', handlers.hasNewSeals());
  };
  root.append(el('h1', undefined, 'Idle Babel'), ribbons);
  return { root, update };
};
