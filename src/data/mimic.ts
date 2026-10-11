/**
 * La Mimic (idée de l'auteur le 10/10/2026, tranchée le 11/10 ; .ai/plan-mimic.md) : un livre ordinaire qui apparaît dans
 * la salle. Tant qu'elle est là, elle avale toutes les connaissances gagnées ; elle ne part jamais d'elle-même. Deux clics :
 * elle mord, puis disparaît et rend tout, plus un bonus. Elle se débloque à l'Est de l'Exploration (Etherium) ; les dents
 * de sa constellation la font venir plus souvent et rendre plus.
 */

/** Une apparition par heure de jeu, en moyenne (au hasard), sans les dents du haut. */
export const MIMIC_EVERY = 3600;

/** Ce qu'elle rend en plus de ce qu'elle a avalé, sans les dents du bas. */
export const MIMIC_BONUS = 0.1;

/**
 * L'appareil photo de chaque salle (maquette .ai/maquette-mimic.html), en pixels de l'image (2688 × 1536) et en mètres :
 * le point de fuite de scenes.ts, l'œil à 1,6 m, une focale commune. x = vx + f·X/Z, y = vy + f·(œil − Y)/Z.
 */
export const ROOM_IMAGE = { w: 2688, h: 1536 } as const;
export const EYE_HEIGHT = 1.6;
export const FOCAL = 1500;

/** La lumière de chaque salle sur le livre (maquette : le filtre « Lumière »). */
export const MIMIC_LIGHT: Record<string, number> = { desert: 0.8, nuit: 0.62 };

/** Un vrai livre : les livres peints sur les rayons font 0,24 à 0,27 m ; même rapport que les couvertures (800 × 1000). */
export const MIMIC_BOOK = { w: 0.22, h: 0.275, t: 0.06 } as const;

/** Où elle se pose : une surface (sa hauteur), un point dessus, l'écart de sa bouche au regard du joueur, redressée ou non. */
export interface MimicSpot {
  /** Hauteur de la surface (m) : 0 le sol, 0,45 un banc. */
  surface: number;
  X: number;
  Z: number;
  /** « Tourné » : écart de la bouche au regard du joueur (degrés). */
  yaw: number;
  /** « Redressé » : contre les rayons (degrés). */
  pitch?: number;
  /** La bouche : la tranche (par défaut) ou le bas du livre (redressée contre les rayons). */
  mouth?: 'fore' | 'tail';
}

/** Les places de chaque salle, dessinées à la main (maquette), jamais sous le grand livre ni sous les compteurs. */
export const MIMIC_SPOTS: Record<string, readonly MimicSpot[]> = {
  desert: [
    // Le parquet, à gauche ; le banc de gauche ; le banc de droite ; le coin du tapis ; contre les rayons.
    { surface: 0, X: -2.2, Z: 3.9, yaw: 12 },
    { surface: 0.45, X: -3.75, Z: 5.4, yaw: -15 },
    { surface: 0.45, X: 3.45, Z: 5.2, yaw: 15 },
    { surface: 0, X: 1.95, Z: 3.8, yaw: 8 },
    { surface: 0, X: 3.0, Z: 7.4, yaw: 0, pitch: 78, mouth: 'tail' },
  ],
  nuit: [
    // Le parquet, à gauche ; au pied des rayons de droite ; le parquet, à droite ; contre les rayons de gauche.
    { surface: 0, X: -2.0, Z: 4.5, yaw: 10 },
    { surface: 0, X: 2.6, Z: 5.5, yaw: -8 },
    { surface: 0, X: 1.9, Z: 4.2, yaw: -12 },
    { surface: 0, X: -3.0, Z: 6.4, yaw: 0, pitch: 80, mouth: 'tail' },
  ],
};

/**
 * Ce que l'interface couvre (relevé dans le jeu, écran 1400 × 854, fond en « cover ») : le grand livre en bas au milieu,
 * le compteur en haut, les intuitions à gauche, les livres rares en haut à droite. En fractions de l'écran (sur cet écran,
 * presque celles de l'image) : l'interface se place par rapport à l'écran, pas au fond.
 */
export const MIMIC_FORBIDDEN = [
  { x: 0.32, y: 0.64, w: 0.36, h: 0.36 },
  { x: 0.39, y: 0, w: 0.22, h: 0.1 },
  { x: 0.02, y: 0.2, w: 0.1, h: 0.2 },
  { x: 0.88, y: 0, w: 0.12, h: 0.09 },
] as const;
