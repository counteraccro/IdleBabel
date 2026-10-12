import { ROOM_IMAGE } from '../data/mimic';

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
