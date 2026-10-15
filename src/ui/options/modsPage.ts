import { el } from '../dom';
import { openModal } from '../modal/modal';
import { getLocale, t } from '../../i18n';
import { catalogEntry, catalogMods } from '../../mods/catalog';
import { loadMod, modStatus, removeMod, switchMod } from '../../mods/loader';
import { openModCatalog } from './modCatalogModal';
import { modName, modVersion } from '../../mods/registry';
import { modText } from '../../mods/modSeals';
import { saveGame } from '../../core/save';
import { BIG_BOOK_REWRITE } from '../book3d/book3dBook';
import { createWriter, type Writer } from './notebookInk';
import { GRID } from './notebookPaper';
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

/** Le nom d'un mod de la liste du joueur (et sa version), et sa ligne au crayon : sa description, ou son adresse. */
const describe = (state: GameState, entry: string): { name: string; hint: string } => {
  const locale = getLocale();
  const listed = catalogMods().find((mod) => catalogEntry(mod) === entry);
  const status = modStatus(entry);
  const version = listed?.version ?? modVersion(entry);
  const bare = listed ? modText(listed.name, locale) : (modName(entry) ?? entry.split('/').pop()!);
  const name = version ? `${bare} ${t('ui.mods.version').replace('{v}', version)}` : bare;
  const hint = listed ? modText(listed.description, locale) : entry;
  if (status === 'missing') return { name: `${name} (${t('ui.mods.notFound')})`, hint };
  if (state.modsOff.includes(entry)) return { name: `${name} (${t('ui.mods.off')})`, hint };
  return { name, hint };
};

/** Bas de l'écriture d'une page : sous cette ligne, un mod passe à la page suivante. */
const PAGE_BOTTOM = 800 - 3 * GRID;

/** Un mod de la liste du joueur : sa case (décochée : désactivé, gardé dans la liste) et « supprimer ». */
const writeEntry = (w: Writer, state: GameState, entry: string): void => {
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
};

/**
 * Le haut de la page « Mods » (demande de l'auteur, 15/10) : la liste des mods du jeu (une fenêtre), l'ajout par adresse,
 * la documentation, l'avertissement ; ils passent avant les mods du joueur, pour ne jamais tomber hors de la page.
 */
const writeHead = (w: Writer, state: GameState): void => {
  w.heading(t('ui.mods.title'));
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
  w.skip(1);
  w.note(t(state.mods.length === 0 ? 'ui.mods.none' : 'ui.mods.howTo'));
  w.skip(1);
};

/** Le titre d'une page de suite. */
const writeContinued = (w: Writer): void => w.heading(`${t('ui.mods.title')} (${t('ui.mods.continued')})`);

/**
 * Les pages « Mods » : les mods du joueur répartis de page en page, autant que chacune en tient (mesurés avec la plume
 * sur `draft`, un brouillon). Rend une fonction d'écriture par page, la première d'abord.
 */
export const modsPages = (state: GameState, draft: CanvasRenderingContext2D): ((w: Writer) => void)[] => {
  const pages: string[][] = [[]];
  let w = createWriter(draft, 0);
  writeHead(w, state);
  for (const entry of state.mods) {
    writeEntry(w, state, entry);
    if (w.at() > PAGE_BOTTOM && pages.at(-1)!.length > 0) {
      // Il ne tient plus : il ouvre la page suivante.
      w = createWriter(draft, 0);
      writeContinued(w);
      writeEntry(w, state, entry);
      pages.push([]);
    }
    pages.at(-1)!.push(entry);
  }
  return pages.map((entries, i) => (page: Writer) => {
    if (i === 0) writeHead(page, state);
    else writeContinued(page);
    for (const entry of entries) writeEntry(page, state, entry);
  });
};
