import { el } from '../dom';
import { openModal } from '../modal/modal';
import { getLocale, t } from '../../i18n';
import { catalogEntry, catalogMods } from '../../mods/catalog';
import { loadMod, modStatus, removeMod, switchMod } from '../../mods/loader';
import { openModCatalog } from './modCatalogModal';
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

/** La partie enregistrée, la page se recharge : un mod en code ne se défait pas à chaud (validé le 14/10). */
const reload = (state: GameState): void => {
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

/** Le nom d'un mod de la liste du joueur, et sa ligne au crayon : sa description, ou son adresse. */
const describe = (state: GameState, entry: string): { name: string; hint: string } => {
  const locale = getLocale();
  const listed = catalogMods().find((mod) => catalogEntry(mod) === entry);
  const status = modStatus(entry);
  const name = listed ? modText(listed.name, locale) : (modName(entry) ?? entry.split('/').pop()!);
  const hint = listed ? modText(listed.description, locale) : entry;
  if (status === 'missing') return { name: `${name} (${t('ui.mods.notFound')})`, hint };
  if (state.modsOff.includes(entry)) return { name: `${name} (${t('ui.mods.off')})`, hint };
  return { name, hint };
};

/**
 * La page « Mods » du cahier (demande de l'auteur, 15/10) : seulement les mods du joueur, chacun avec sa case (décochée :
 * désactivé, gardé dans la liste) et « supprimer » ; dessous, la liste des mods du jeu (une fenêtre), l'ajout par
 * adresse, la documentation. Activer, désactiver ou supprimer recharge la page.
 */
export const writeModsPage = (w: Writer, state: GameState): void => {
  w.heading(t('ui.mods.title'));
  w.note(t(state.mods.length === 0 ? 'ui.mods.none' : 'ui.mods.howTo'));
  w.skip(1);
  for (const entry of state.mods) {
    const { name, hint } = describe(state, entry);
    const on = !state.modsOff.includes(entry);
    w.toggle(name, hint, on, () => {
      switchMod(state, entry, !on);
      reload(state);
    });
    w.link(
      t('ui.mods.remove'),
      () => {
        removeMod(state, entry);
        reload(state);
      },
      true,
    );
    w.skip(1);
  }
  w.skip(1);
  w.link(t('ui.mods.catalog'), () =>
    openModCatalog(state, () => {
      saveGame(state);
      rewrite();
    }),
  );
  w.link(t('ui.mods.add'), () => openAddMod(state));
  w.link(t('ui.mods.write'), () => window.open(`${import.meta.env.BASE_URL}mods/index.html`, '_blank', 'noopener'));
  w.skip(1);
  w.note(t('ui.mods.warning'));
};
