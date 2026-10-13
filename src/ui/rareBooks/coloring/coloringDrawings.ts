import { COLORING_DRAWINGS, type ColoringDrawingId } from '../../../data/coloring';
import { clock } from './drawings/clock';
import { desert } from './drawings/desert';
import { lamp } from './drawings/lamp';
import { letter } from './drawings/letter';
import { mimic } from './drawings/mimic';
import { night } from './drawings/night';
import { rabbit } from './drawings/rabbit';
import { shelf } from './drawings/shelf';
import { tower } from './drawings/tower';
import type { ColoringZones } from '../../../systems/coloring';
import type { Drawing } from './coloringShapes';

const MAKERS: Record<ColoringDrawingId, () => Drawing> = { tower, lamp, letter, rabbit, shelf, desert, clock, night, mimic };

const built = new Map<ColoringDrawingId, Drawing>();

/** Le dessin `id`, tracé une fois puis gardé. */
export const coloringDrawing = (id: ColoringDrawingId): Drawing => {
  let drawing = built.get(id);
  if (!drawing) {
    drawing = MAKERS[id]();
    built.set(id, drawing);
  }
  return drawing;
};

let zones: ColoringZones | null = null;

/** Les zones de chaque dessin, pour savoir s'il est fini (systems/coloring.ts). */
export const coloringZones = (): ColoringZones =>
  (zones ??= Object.fromEntries(COLORING_DRAWINGS.map(({ id }) => [id, coloringDrawing(id).zones.map((zone) => zone.id)])));

let probe: CanvasRenderingContext2D | null = null;

/** La zone du dessin sous (x, y), aux unités de la page : la plus haute, celle posée en dernier. */
export const zoneAt = (id: ColoringDrawingId, x: number, y: number): string | undefined => {
  const context = (probe ??= document.createElement('canvas').getContext('2d')!);
  return [...coloringDrawing(id).zones].reverse().find(({ path }) => context.isPointInPath(path, x, y))?.id;
};
