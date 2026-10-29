import type { SceneId } from '../scene/scenes';

/**
 * Les reliques (idée de l'auteur le 10/10/2026, tranchée les 11 et 12/10 ; .ai/plan-reliques.md, maquette
 * .ai/maquette-reliques.html) : les instruments d'un chercheur venu avant lui, un par salle. L'Ouest de l'Exploration
 * allumé, la phrase-indice de chacune peut se lire dans le livre blanc (sa salle déjà vue) ; lue, la relique est posée
 * dans sa salle. Un clic : son récit, son sceau, et elle rejoint sa petite case de la vitrine, pour toujours. Une seule
 * agit à la fois ; en changer la fait agir tout de suite, puis plus de changement pendant un temps.
 */
export const RELIC_IDS = ['loupe', 'astrolabe', 'hourglass', 'pencil', 'token', 'compass'] as const;
export type RelicId = (typeof RELIC_IDS)[number];

/** Comment l'objet est posé : couché à plat, ou appuyé (debout, un peu penché en arrière). */
export type RelicPose = 'flat' | 'lean';

export interface RelicDef {
  id: RelicId;
  /** Sa salle (le fond où elle est posée) ; aucune pour le Crayon (la tâche 15, data/tasks.ts) ni le Jeton (la Loterie), qui se gagnent. */
  room?: SceneId;
  /** Sa phrase-indice (famille « hints » du livre blanc) ; aucune pour le Crayon ni le Jeton. */
  hint?: string;
  /** Son sceau (le même nom que l'indice, sans « hint » : data/anomalies.ts, hintSeal). */
  seal: string;
  /** Son moment de lore : le récit, à la trouvaille (data/lore.ts). */
  lore: 'relicLoupe' | 'relicAstrolabe' | 'relicHourglass' | 'relicPencil' | 'relicToken' | 'relicCompass';
  /** Sa petite case de la vitrine (ui/library/bookcase3d.ts : les cases basses et étroites). */
  cell: number;
  /**
   * Sa place dans la salle (choisie par l'auteur le 12/10), en mètres, avec l'appareil photo du fond (data/mimic.ts) :
   * X à droite, Y la hauteur de la surface, Z la distance ; tournée de `yaw` degrés depuis le regard du joueur.
   */
  spot?: { X: number; Y: number; Z: number; yaw: number; pose: RelicPose };
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
    // ×Connaissance de chaque trouvaille (l'auteur, 29/10 : +1, +2, +3 fixes écrasaient tout au début, puis ne valaient plus rien).
    bonus: [1.5, 1.75, 2],
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
  // Le Crayon (17/10, .ai/plan-taches.md) : la récompense de « Fais 30 tâches du jour », sans salle ni phrase-indice ;
  // il rejoint une petite case basse de la colonne du milieu.
  {
    id: 'pencil',
    seal: 'relicPencil',
    lore: 'relicPencil',
    cell: 12,
    // − part de ce que demande une tâche du jour.
    bonus: [0.25, 0.35, 0.5],
  },
  // Le Jeton (18/10, .ai/maquette-relique-jeton.html, piste A) : la Loterie le donne, rouleaux arrêtés sur 4 · 1 · 0
  // (systems/lottery.ts). Il prend la case haute du milieu, celle du livre de la fin parti sur le meuble des fins
  // (FINAL_CELL de ui/library/bookcase3d.ts), debout sur un petit chevalet de bois.
  {
    id: 'token',
    seal: 'relicToken',
    lore: 'relicToken',
    cell: 14,
    // Jetons offerts chaque jour (systems/tokenRelic.ts).
    bonus: [5, 7, 10],
  },
  // La Boussole (24/10, .ai/maquette-relique-boussole.html, piste A « De poche ») : la relique de la salle jour-nuit
  // (Âge Quantique), dans la case basse en haut de la colonne du milieu, au-dessus du Jeton.
  {
    id: 'compass',
    room: 'jour-nuit',
    hint: 'hintRelicCompass',
    seal: 'relicCompass',
    lore: 'relicCompass',
    cell: 15,
    // Le seuil de l'arche de gauche, entre le parquet et le sable (x 250, y 1478, au sol), couchée.
    spot: { X: -3.146, Y: 0, Z: 4.313, yaw: -20, pose: 'flat' },
    // + part d'apparitions de la Mimic (×1,5 : elle vient 50 % plus souvent).
    bonus: [0.5, 0.75, 1],
  },
];

/** Les reliques qui se trouvent dans une salle (la Loupe, l'Astrolabe, le Sablier, la Boussole) : « Trouve les quatre reliques ». */
export type RoomRelic = RelicDef & Required<Pick<RelicDef, 'room' | 'hint' | 'spot'>>;
export const ROOM_RELICS: readonly RoomRelic[] = RELICS.filter((relic): relic is RoomRelic => relic.room !== undefined);

export const relicById = (id: string): RelicDef | undefined => RELICS.find((relic) => relic.id === id);

/** Après un changement de relique, plus de changement pendant tant d'heures (« La patience » : RELIC_PATIENT_HOURS). */
export const RELIC_LOCK_HOURS = 12;
export const RELIC_PATIENT_HOURS = 6;

/** La lumière de chaque salle sur l'objet (comme MIMIC_LIGHT ; la verrière, un peu plus claire que la nuit). */
export const RELIC_LIGHT: Record<SceneId, number> = { desert: 0.8, nuit: 0.62, verriere: 0.75, 'jour-nuit': 0.75 };
