import * as THREE from 'three';
import { t } from '../../i18n';
import { openModal } from '../modal/modal';
import { FRONT, type BookcaseCell } from '../library/bookcase3d';
import { RELICS, type RelicId } from '../../data/relics';
import { relicFound, relicLockHours, relicWait, setRelic } from '../../systems/relics';
import { relicEnvironment, relicModel } from './relicModels';
import { relicBonusText, relicName, waitText } from './relicText';
import type { CellLights } from '../library/cellLights';
import type { GameState } from '../../core/state';

/**
 * Les reliques trouvées, chacune dans sa petite case de la vitrine (maquette validée le 12/10) : le même modèle que dans
 * la salle, à l'échelle des livres (un livre debout fait 1 ; une vraie loupe, 0,27 m). Seule la case de celle qui agit
 * reste éclairée. Survolée : son nom, ce qu'elle donne, et si elle agit ; cliquée : la poser à la place de l'autre (elle
 * agit tout de suite), puis plus de changement pendant 12 h (6 h avec « La patience »).
 */

/** Une relique de 0,27 m fait 0,65 à l'échelle des livres : elle tient dans sa case basse (0,65 de haut). */
const SHELF_SCALE = 2.4;
/** La loupe, appuyée, est la plus haute : un peu plus petite. */
const LOUPE_SCALE = 0.88;
/** Un peu en avant du milieu de la case, tournée vers le lecteur comme dans la maquette. */
const SET_BACK = 0.42;
const YAW: Record<RelicId, number> = { loupe: 0.75, astrolabe: 0.12, hourglass: 0.3 };

export interface RelicShelf {
  /** La relique sous le rayon (null : aucune). */
  at: (raycaster: THREE.Raycaster) => RelicId | null;
  /** Ce que dit la légende de la relique survolée : son nom, puis une ligne en italique. */
  caption: (id: RelicId) => { name: string; line: string };
  /** Le bord avant de son étagère, au milieu de sa case (pour poser la légende). */
  anchor: (id: RelicId) => THREE.Vector3;
  /** Cliquée : la poser, si elle peut l'être (une fenêtre le demande). */
  choose: (id: RelicId) => void;
}

export const createRelicShelf = (
  state: GameState,
  scene: THREE.Scene,
  cells: BookcaseCell[],
  lights: CellLights,
  renderer: THREE.WebGLRenderer,
  onChange: () => void,
): RelicShelf => {
  const envMap = relicEnvironment(renderer);
  const holders = new Map<RelicId, THREE.Group>();
  for (const relic of RELICS) {
    if (!relicFound(state, relic.id)) continue;
    const cell = cells[relic.cell];
    const model = relicModel(relic.id, relic.id === 'hourglass' ? 'flat' : 'lean', envMap, 0.1);
    model.scale.setScalar(SHELF_SCALE * (relic.id === 'loupe' ? LOUPE_SCALE : 1));
    const holder = new THREE.Group();
    holder.add(model);
    holder.position.set(cell.left + cell.width / 2, cell.floor, FRONT - SET_BACK);
    holder.rotation.y = YAW[relic.id];
    holder.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = object.receiveShadow = true;
    });
    lights.light(holder);
    scene.add(holder);
    holders.set(relic.id, holder);
  }

  /** Seule la case de la relique qui agit garde son spot. */
  const lightCells = (): void => {
    for (const relic of RELICS) lights.setDark(relic.cell, relicFound(state, relic.id) && state.relics.active !== relic.id);
    onChange();
  };
  lightCells();

  return {
    at: (raycaster) => {
      const hit = raycaster.intersectObjects([...holders.values()], true)[0];
      if (!hit) return null;
      for (const [id, holder] of holders) if (holder.getObjectById(hit.object.id)) return id;
      return null;
    },
    caption: (id) => {
      const bonus = relicBonusText(state, id);
      const wait = relicWait(state);
      const line =
        state.relics.active === id
          ? `${bonus} · ${t('ui.relics.acts')}`
          : wait > 0
            ? `${bonus} · ${t('ui.relics.wait').replace('{t}', waitText(wait))}`
            : `${bonus} · ${t('ui.relics.choose')}`;
      return { name: relicName(id), line };
    },
    anchor: (id) => {
      const cell = cells[RELICS.find((relic) => relic.id === id)!.cell];
      return new THREE.Vector3(cell.left + cell.width / 2, cell.floor, FRONT);
    },
    choose: (id) => {
      if (state.relics.active === id || relicWait(state) > 0) return;
      const before = state.relics.active;
      const text = document.createElement('p');
      text.textContent = [
        before ? t('ui.relics.stops').replace('{name}', relicName(before)) : '',
        t('ui.relics.then').replace('{h}', String(relicLockHours(state))),
      ]
        .filter(Boolean)
        .join(' ');
      openModal({
        title: t(`ui.relics.put.${id}`),
        body: [text],
        dismissible: true,
        actions: [
          { label: t('ui.relics.keep') },
          {
            label: t('ui.relics.confirm'),
            kind: 'primary',
            // Refusé (une autre vue l'a changée pendant la question) : la vitrine montre quand même celle qui agit, et
            // sa légende, le délai.
            onClick: () => {
              setRelic(state, id);
              lightCells();
            },
          },
        ],
      });
    },
  };
};
