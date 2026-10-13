import { sealEvent } from './seals';
import { COLORING_DRAWINGS } from '../data/coloring';
import type { GameState } from '../core/state';

/**
 * « Colorie la Bibliothèque » (livre rare, décidé avec l'auteur le 13/10/2026) : un cahier de coloriage pour enfants,
 * neuf grands dessins. Dans la bibliothèque, on touche un crayon puis une zone : elle prend sa couleur (la gomme
 * l'efface). Les couleurs restent dans la partie, prestige compris. Le premier dessin fini : le sceau « Sans dépasser » ;
 * tous : le sceau secret « Le cahier est plein ».
 */

export const COLORING_ID = 'coloring';

/** Les zones de chaque dessin (ui/rareBooks/coloring) : un dessin est fini quand toutes ont une couleur. */
export type ColoringZones = Readonly<Record<string, readonly string[]>>;

export const drawingDone = (state: GameState, drawing: string, zones: ColoringZones): boolean =>
  (zones[drawing] ?? []).every((zone) => state.coloring[drawing]?.[zone] !== undefined);

/** La zone `zone` du dessin `drawing` prend la couleur `color` (null : la gomme). Renvoie true si elle a changé. */
export const colorZone = (state: GameState, drawing: string, zone: string, color: string | null, zones: ColoringZones): boolean => {
  const colors = (state.coloring[drawing] ??= {});
  if ((colors[zone] ?? null) === color) return false;
  if (color === null) delete colors[zone];
  else colors[zone] = color;
  if (drawingDone(state, drawing, zones)) {
    sealEvent(state, 'coloringFirst');
    if (COLORING_DRAWINGS.every(({ id }) => drawingDone(state, id, zones))) sealEvent(state, 'coloringAll');
  }
  return true;
};
