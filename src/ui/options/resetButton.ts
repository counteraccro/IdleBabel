import { el } from '../dom';
import { t } from '../../i18n';

/** Effacer la sauvegarde, avec une confirmation dans la page (jamais de boîte du navigateur). */
export const createResetButton = (onReset: () => void): HTMLElement => {
  const root = el('div', 'reset');
  const ask = el('button', undefined, t('ui.reset'));
  const confirm = el('div', 'reset-confirm');
  const yes = el('button', 'danger', t('ui.yes'));
  const no = el('button', undefined, t('ui.no'));
  confirm.append(el('p', undefined, t('ui.resetConfirm')), yes, no);
  confirm.hidden = true;

  const showConfirm = (visible: boolean): void => {
    ask.hidden = visible;
    confirm.hidden = !visible;
  };
  ask.addEventListener('click', () => showConfirm(true));
  no.addEventListener('click', () => showConfirm(false));
  yes.addEventListener('click', () => {
    showConfirm(false);
    onReset();
  });
  root.append(ask, confirm);
  return root;
};
