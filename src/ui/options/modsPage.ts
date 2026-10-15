import { el } from '../dom';
import { openModal } from '../modal/modal';
import { getLocale, t } from '../../i18n';
import { catalogEntry, catalogMods } from '../../mods/catalog';
import { loadMod, modStatus, removeMod } from '../../mods/loader';
import { modName } from '../../mods/registry';
import { modText } from '../../mods/modSeals';
import { saveGame } from '../../core/save';
import { BIG_BOOK_REWRITE } from '../book3d/book3dBook';
import type { Writer } from './notebookInk';
import type { GameState } from '../../core/state';

/** Le cahier se réécrit (un mod vient de se charger, ou pas). */
const rewrite = (): void => {
  window.dispatchEvent(new Event(BIG_BOOK_REWRITE));
};

/** Un mod retiré (ou décoché) : la partie est enregistrée sans lui, et la page se recharge (validé le 14/10). */
const reloadWithout = (state: GameState, entry: string): void => {
  removeMod(state, entry);
  saveGame(state);
  window.location.reload();
};

/** Un mod de la liste coché : enregistré, la page se recharge avec lui (comme décocher). */
const reloadWith = (state: GameState, entry: string): void => {
  state.mods.push(entry);
  saveGame(state);
  window.location.reload();
};

/** Ajouter un mod par son adresse : il est chargé aussitôt ; introuvable, la fenêtre le dit et reste ouverte. */
const openAddMod = (state: GameState): void => {
  const field = el('label', 'modal-field');
  const input = document.createElement('input');
  input.type = 'url';
  input.placeholder = 'https://…/mon-mod.js';
  input.spellcheck = false;
  field.append(el('p', '', t('ui.mods.addHint')), input);
  const error = el('p', 'save-code-error', '');
  const modal = openModal({
    title: t('ui.mods.add'),
    body: [field, error],
    actions: [
      {
        label: t('ui.mods.load'),
        kind: 'primary',
        keepOpen: true,
        onClick: () => {
          const address = input.value.trim();
          if (!/^https?:\/\//i.test(address)) {
            error.textContent = t('ui.mods.badAddress');
            return;
          }
          error.textContent = t('ui.mods.loading');
          void loadMod(state, address).then((loaded) => {
            saveGame(state);
            rewrite();
            if (loaded) modal.close();
            else error.textContent = t('ui.mods.missing');
          });
        },
      },
      { label: t('ui.close'), kind: 'secondary' },
    ],
  });
  input.focus();
};

/**
 * La page « Mods » du cahier (plan des mods, §3 et §8) : les mods de la liste, une case chacun ; dessous, ceux ajoutés
 * par leur adresse, à retirer ; la documentation pour en écrire.
 */
export const writeModsPage = (w: Writer, state: GameState): void => {
  const locale = getLocale();
  w.heading(t('ui.mods.title'));
  for (const mod of catalogMods()) {
    const entry = catalogEntry(mod);
    const on = state.mods.includes(entry);
    w.toggle(`${modText(mod.name, locale)} (${mod.author})`, modText(mod.description, locale), on, () =>
      on ? reloadWithout(state, entry) : reloadWith(state, entry),
    );
  }
  const listed = new Set(catalogMods().map(catalogEntry));
  const others = state.mods.filter((entry) => !listed.has(entry));
  if (others.length > 0) w.skip(1);
  for (const entry of others) {
    const status = modStatus(entry);
    const name = status === 'missing' ? t('ui.mods.notFound') : status === 'loading' ? '…' : (modName(entry) ?? entry.split('/').pop()!);
    w.note(`${name} — ${entry}`);
    w.link(t('ui.mods.remove'), () => reloadWithout(state, entry), true);
  }
  w.skip(1);
  w.link(t('ui.mods.add'), () => openAddMod(state));
  w.link(t('ui.mods.write'), () => window.open(`${import.meta.env.BASE_URL}mods/`, '_blank', 'noopener'));
  w.skip(1);
  w.note(t('ui.mods.warning'));
};
