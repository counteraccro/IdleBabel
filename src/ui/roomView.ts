import { MIMIC_FORBIDDEN, ROOM_IMAGE } from '../data/mimic';

/**
 * Ce que l'écran montre de la salle (le fond), pour y poser quelque chose (la Mimic, les reliques) : le fond « cover »,
 * et la lumière du shader à un point de l'écran.
 */

/** Le fond « cover » : l'image remplit l'écran sans être déformée (comme src/scene/renderer.ts). */
export const cover = () => {
  const scale = Math.max(window.innerWidth / ROOM_IMAGE.w, window.innerHeight / ROOM_IMAGE.h);
  return {
    scale,
    left: (window.innerWidth - ROOM_IMAGE.w * scale) / 2,
    top: (window.innerHeight - ROOM_IMAGE.h * scale) / 2,
  };
};
export type RoomView = ReturnType<typeof cover>;

/** Un carré, en pixels d'image ou d'écran. */
export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** Ce qu'on pose dans la salle n'y est que s'il tient à l'écran, à cette distance des bords (px). */
const MARGIN = 8;

/**
 * Le carré à l'écran d'un objet de la salle (`box` en pixels d'image) : null s'il dépasse de l'écran ou passe sous
 * l'interface (MIMIC_FORBIDDEN). La Mimic et les reliques y prennent leur place, ou vont au bord de l'écran.
 */
export const screenBox = (box: Box, view: RoomView): Box | null => {
  const W = window.innerWidth;
  const H = window.innerHeight;
  const [x0, y0, x1, y1] = [box.x0, box.y0, box.x1, box.y1].map((value, i) => value * view.scale + (i % 2 ? view.top : view.left));
  if (x0 < MARGIN || y0 < MARGIN || x1 > W - MARGIN || y1 > H - MARGIN) return null;
  const hidden = MIMIC_FORBIDDEN.some(
    (zone) => x0 < (zone.x + zone.w) * W && x1 > zone.x * W && y0 < (zone.y + zone.h) * H && y1 > zone.y * H,
  );
  return hidden ? null : { x0, y0, x1, y1 };
};

/** Le haut de la ruche des méthodes (px), où se range au bord droit ce qui n'a pas de place dans la salle. */
export const hiveTop = (): number => {
  const hive = document.querySelector('.method-hive')?.getBoundingClientRect();
  return hive && hive.height > 0 ? hive.top : window.innerHeight * 0.4;
};

/**
 * La lumière du fond à ce point de l'écran (src/scene/shaders.ts) : la vignette, et le haut assombri pour le compteur.
 * Ce qu'on pose dans la salle la reçoit comme elle.
 */
export const shaderLight = (x: number, y: number): number => {
  const u = x / window.innerWidth;
  // Le shader compte de bas en haut.
  const v = 1 - y / window.innerHeight;
  const vignette = 1 - ((u - 0.5) ** 2 + (v - 0.5) ** 2) * 0.9;
  const s = Math.min(1, Math.max(0, (v - 0.7) / 0.3));
  return vignette * (1 - 0.55 * s * s * (3 - 2 * s));
};
