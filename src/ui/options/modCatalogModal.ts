import './modCatalog.css';
import { el } from '../dom';
import { openModal } from '../modal/modal';
import { getLocale, t } from '../../i18n';
import { catalogEntry, catalogMods } from '../../mods/catalog';
import { loadMod } from '../../mods/loader';
import { modText } from '../../mods/modSeals';
import type { GameState } from '../../core/state';

/**
 * La liste des mods du jeu (demande de l'auteur, 15/10) : rien n'est montré au cahier tant qu'on ne l'ouvre pas. Chaque
 * mod a son nom, son auteur, sa description ; « Ajouter » le charge aussitôt et le met dans la liste du joueur.
 */
export const openModCatalog = (state: GameState, onAdded: () => void): void => {
  const locale = getLocale();
  const list = el('div', 'mod-catalog');
  if (catalogMods().length === 0) list.append(el('p', 'mod-catalog-empty', t('ui.mods.catalogEmpty')));
  for (const mod of catalogMods()) {
    const entry = catalogEntry(mod);
    const item = el('div', 'mod-catalog-item');
    const title = el('div');
    title.append(el('span', 'mod-catalog-name', modText(mod.name, locale)), el('span', 'mod-catalog-author', mod.author));
    const add = el('button', 'modal-button', t('ui.mods.addThis'));
    add.type = 'button';
    const added = (): void => {
      add.textContent = t('ui.mods.added');
      add.disabled = true;
    };
    if (state.mods.includes(entry)) added();
    add.addEventListener('click', () => {
      add.disabled = true;
      add.textContent = t('ui.mods.loading');
      void loadMod(state, entry).then((loaded) => {
        if (loaded) {
          added();
          onAdded();
        } else {
          add.textContent = t('ui.mods.notFound');
        }
      });
    });
    item.append(title, add, el('div', 'mod-catalog-text', modText(mod.description, locale)));
    list.append(item);
  }
  openModal({ title: t('ui.mods.catalog'), body: [list], dismissible: true, actions: [{ label: t('ui.close'), kind: 'secondary' }] });
};
