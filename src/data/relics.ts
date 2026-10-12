import type { SceneId } from '../scene/scenes';

/**
 * Les reliques (idée de l'auteur le 10/10/2026, tranchée les 11 et 12/10 ; .ai/plan-reliques.md, maquette
 * .ai/maquette-reliques.html) : les instruments d'un chercheur venu avant lui, un par salle. L'Ouest de l'Exploration
 * allumé, la phrase-indice de chacune peut se lire dans le livre blanc (sa salle déjà vue) ; lue, la relique est posée
 * dans sa salle. Un clic : son récit, son sceau, et elle rejoint sa petite case de la vitrine, pour toujours. Une seule
 * agit à la fois ; en changer la fait agir tout de suite, puis plus de changement pendant un temps.
 */
export const RELIC_IDS = ['loupe', 'astrolabe', 'hourglass'] as const;
export type RelicId = (typeof RELIC_IDS)[number];

/** Comment l'objet est posé : couché à plat, ou appuyé (debout, un peu penché en arrière). */
export type RelicPose = 'flat' | 'lean';

export interface RelicDef {
  id: RelicId;
  /** Sa salle (le fond où elle est posée). */
  room: SceneId;
  /** Sa phrase-indice (famille « hints » du livre blanc). */
  hint: string;
  /** Son sceau (le même nom que l'indice, sans « hint » : data/anomalies.ts, hintSeal). */
  seal: string;
  /** Son moment de lore : le récit, à la trouvaille (data/lore.ts). */
  lore: 'relicLoupe' | 'relicAstrolabe' | 'relicHourglass';
  /** Sa petite case de la vitrine (ui/library/bookcase3d.ts : les cases basses et étroites). */
  cell: number;
  /**
   * Sa place dans la salle (choisie par l'auteur le 12/10), en mètres, avec l'appareil photo du fond (data/mimic.ts) :
   * X à droite, Y la hauteur de la surface, Z la distance ; tournée de `yaw` degrés depuis le regard du joueur.
   */
  spot: { X: number; Y: number; Z: number; yaw: number; pose: RelicPose };
  /** Son bonus, sans étoile, puis avec la 1re et la 2e étoile de sa branche (page « Les reliques » de l'Etherium). */
  bonus: readonly [number, number, number];
}

/**
 * Les places de la maquette (pixels de l'image 2688 × 1536 et hauteur de la surface), passées en mètres par
 * l'appareil photo de la salle : Z = focale × (œil − Y) / (y − point de fuite), X = (x − point de fuite) × Z / focale.
 */
export const RELICS: readonly RelicDef[] = [
  {
    id: 'loupe',
    room: 'desert',
    hint: 'hintRelicLoupe',
    seal: 'relicLoupe',
    lore: 'relicLoupe',
    cell: 21,
    // Le rebord de la fenêtre de gauche (x 230, y 1085, à 0,85 m), appuyée.
    spot: { X: -3.479, Y: 0.85, Z: 4.684, yaw: -30, pose: 'lean' },
    // + connaissances à chaque trouvaille.
    bonus: [1, 2, 3],
  },
  {
    id: 'astrolabe',
    room: 'nuit',
    hint: 'hintRelicAstrolabe',
    seal: 'relicAstrolabe',
    lore: 'relicAstrolabe',
    cell: 22,
    // Le rayon du bas, à droite (x 2300, y 1185 ; posé à 0,56 m, sur la planche vue dans le jeu), appuyé contre les livres.
    spot: { X: 3.557, Y: 0.56, Z: 5.581, yaw: -20, pose: 'lean' },
    // + part d'apparition de la lettre.
    bonus: [0.4, 0.6, 0.8],
  },
  {
    id: 'hourglass',
    room: 'verriere',
    hint: 'hintRelicHourglass',
    seal: 'relicHourglass',
    lore: 'relicHourglass',
    cell: 6,
    // Au bord de la tache de lumière, sous la verrière (x 1870, y 1450, au sol).
    spot: { X: 1.674, Y: 0, Z: 4.542, yaw: 0, pose: 'flat' },
    // + part de pages lues (méthodes et clics).
    bonus: [0.2, 0.35, 0.5],
  },
];

export const relicById = (id: string): RelicDef | undefined => RELICS.find((relic) => relic.id === id);

/** Après un changement de relique, plus de changement pendant tant d'heures (« La patience » : RELIC_PATIENT_HOURS). */
export const RELIC_LOCK_HOURS = 12;
export const RELIC_PATIENT_HOURS = 6;

/** La lumière de chaque salle sur l'objet (comme MIMIC_LIGHT ; la verrière, un peu plus claire que la nuit). */
export const RELIC_LIGHT: Record<SceneId, number> = { desert: 0.8, nuit: 0.62, verriere: 0.75 };
