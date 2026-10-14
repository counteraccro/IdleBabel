import { el } from '../dom';
import { openModal } from '../modal/modal';
import { t } from '../../i18n';
import { exportSave, importSave } from '../../core/save';
import type { GameState } from '../../core/state';

/** Le champ de la chaîne : monospace, plusieurs lignes, coupé n'importe où. */
const codeField = (hint: string, readOnly: boolean): { root: HTMLElement; area: HTMLTextAreaElement } => {
  const root = el('label', 'modal-field save-code');
  const area = document.createElement('textarea');
  area.rows = 6;
  area.spellcheck = false;
  area.readOnly = readOnly;
  root.append(el('p', '', hint), area);
  return { root, area };
};

/**
 * Exporter la sauvegarde (demande de l'auteur, 14/10) : toute la partie (options, avancement, Éther…) en une
 * chaîne, déjà sélectionnée, et un bouton pour la copier.
 */
export const openSaveExport = (state: GameState): void => {
  const field = codeField(t('ui.exportHint'), true);
  field.area.value = exportSave(state);
  const modal = openModal({
    title: t('ui.exportSave'),
    body: [field.root],
    actions: [
      {
        label: t('ui.copy'),
        kind: 'primary',
        keepOpen: true,
        onClick: () => {
          field.area.select();
          void navigator.clipboard?.writeText(field.area.value).then(() => (modal.buttons[0].textContent = t('ui.copied')));
        },
      },
      { label: t('ui.close'), kind: 'secondary' },
    ],
  });
  field.area.focus();
  field.area.select();
};

/**
 * Importer une sauvegarde : la chaîne collée remplace toute la partie, après confirmation ; la page se
 * recharge sur la partie importée. Une chaîne illisible le dit, rien ne change.
 */
export const openSaveImport = (state: GameState): void => {
  const field = codeField(t('ui.importHint'), false);
  const error = el('p', 'save-code-error', '');
  let confirming = false;
  const modal = openModal({
    title: t('ui.importSave'),
    variant: 'danger',
    body: [field.root, error],
    enterConfirms: false,
    actions: [
      {
        label: t('ui.importLoad'),
        kind: 'danger',
        keepOpen: true,
        onClick: () => {
          if (!field.area.value.trim()) return;
          if (!confirming) {
            confirming = true;
            error.textContent = t('ui.importConfirm');
            modal.buttons[0].textContent = t('ui.importYes');
            return;
          }
          if (importSave(field.area.value, state.locale)) window.location.replace(import.meta.env.BASE_URL);
          else {
            confirming = false;
            error.textContent = t('ui.importInvalid');
            modal.buttons[0].textContent = t('ui.importLoad');
          }
        },
      },
      { label: t('ui.no'), kind: 'secondary' },
    ],
  });
  // Une autre chaîne collée : on redemande.
  field.area.addEventListener('input', () => {
    confirming = false;
    error.textContent = '';
    modal.buttons[0].textContent = t('ui.importLoad');
  });
  field.area.focus();
};
