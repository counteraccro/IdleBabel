import type { PageId } from '../../data/etheriumStars';

/**
 * Les figures des constellations, telles que l'auteur les a validées (.ai/maquette-etherium-constellations.html,
 * 06/10/2026) : la place de chaque étoile sur la page (repère 640 × 800), les traits dessinés pour la figure qui n'ouvrent
 * rien, et les cercles de la lune. L'ordre et les prix sont dans data/etheriumStars.ts.
 */
export interface Figure {
  /** La place de chaque étoile, par son nom court (celui de data/etheriumStars.ts, sans la page). */
  spots: Record<string, readonly [number, number]>;
  /** Traits de la figure qui n'ouvrent rien (en pointillés plus fins). */
  deco: readonly (readonly [string, string])[];
  /** Cercles (centre, rayon) sur lesquels les traits suivent un arc, pas une droite (la lune). */
  circles?: readonly (readonly [number, number, number])[];
  /** Étoile offerte, allumée dès le début, qui n'est pas dans les données (l'Âge Manuel), et celle qu'elle ouvre. */
  given?: { id: string; opens: string };
}

const ring = ([cx, cy]: readonly [number, number], r: number, deg: number): readonly [number, number] => [
  Math.round(cx + r * Math.cos((deg * Math.PI) / 180)),
  Math.round(cy + r * Math.sin((deg * Math.PI) / 180)),
];

const lens = (deg: number) => ring([265, 415], 112, deg);
const moonOut = (deg: number) => ring([330, 485], 195, deg);
const moonIn = (deg: number) => ring([430, 485], 172.4, deg);
const MANUAL_CELL = [190, 470] as const;
const AUTO_CELL = [450, 470] as const;
const CELL = 88;

export const FIGURES: Record<PageId, Figure> = {
  // Le livre vu de face : le dos au milieu ; chaque page part du haut du dos, suit le haut de la page, puis le bord
  // jusqu'au coin du bas.
  reading: {
    spots: {
      s0: [320, 620],
      s1: [320, 400],
      l1: [228, 362],
      l2: [135, 378],
      l3: [145, 595],
      r1: [412, 362],
      r2: [505, 378],
      r3: [495, 595],
    },
    deco: [
      ['l3', 's0'],
      ['r3', 's0'],
    ],
  },
  hands: {
    spots: {
      w: [469, 662],
      p: [398, 560],
      t: [254, 581],
      i: [242, 468],
      i2: [171, 401],
      m: [292, 408],
      m2: [235, 328],
      a: [364, 382],
      o: [448, 396],
    },
    deco: [],
  },
  knowledge: {
    spots: {
      f: [320, 670],
      b: [320, 565],
      wl: [205, 525],
      el: [265, 425],
      al: [225, 320],
      wr: [435, 525],
      er: [375, 425],
      ar: [415, 320],
      k: [320, 470],
    },
    deco: [
      ['el', 'k'],
      ['k', 'er'],
      ['wl', 'f'],
      ['wr', 'f'],
    ],
  },
  finds: {
    spots: {
      h0: [475, 680],
      h1: [420, 605],
      g0: lens(45),
      g1: lens(110),
      g2: lens(170),
      g3: lens(228),
      r1: lens(350),
      r2: lens(300),
      r3: [252, 326],
      c: [262, 438],
    },
    deco: [['g3', 'r3']],
  },
  // Le croissant : deux cercles qui se coupent aux deux pointes ; leurs traits suivent les cercles.
  away: {
    spots: {
      d0: moonOut(62),
      d1: moonOut(120),
      d2: moonOut(172),
      d3: moonOut(228),
      c1: moonIn(132),
      c2: moonIn(196),
      tip: moonOut(298),
      x: [505, 420],
    },
    deco: [['d3', 'tip']],
    circles: [
      [330, 485, 195],
      [430, 485, 172.4],
    ],
  },
  start: {
    spots: {
      sill: [320, 680],
      l1: [225, 613],
      l2: [225, 497],
      l3: [225, 387],
      top: [320, 305],
      r1: [415, 613],
      r2: [415, 497],
      r3: [415, 387],
      k: [375, 536],
    },
    deco: [['top', 'r3']],
  },
  // Deux alvéoles pointe en haut, côte à côte ; la dernière méthode d'un Âge mène à la première étoile du suivant.
  memory: {
    spots: {
      ...Object.fromEntries([90, 150, 210, 270, 330, 30].map((deg, i) => [`m${i}`, ring(MANUAL_CELL, CELL, deg)])),
      ...Object.fromEntries([150, 210, 270, 330, 30, 90].map((deg, i) => [`a${i}`, ring(AUTO_CELL, CELL, deg)])),
    },
    deco: [
      ['m5', 'm0'],
      ['a5', 'a0'],
    ],
  },
  ages: {
    spots: { manual: [320, 665], auto: [440, 575], quantum: [215, 490], dim: [410, 405], inf: [280, 325] },
    deco: [],
    given: { id: 'manual', opens: 'auto' },
  },
  // La Plume, penchée : le bec en bas à gauche, la tige jusqu'à la pointe en haut à droite ; les barbes de chaque côté,
  // que deux traits referment vers la pointe (Alpha 1.1, 08/10).
  quill: {
    spots: {
      nib: [200, 680],
      t1: [252, 608],
      t2: [317, 518],
      p1: [387, 421],
      p2: [452, 331],
      l1: [229, 537],
      l2: [277, 462],
      l3: [333, 393],
      r1: [301, 643],
      r2: [348, 595],
      r3: [391, 544],
      r4: [430, 490],
      r5: [465, 433],
      r6: [484, 381],
    },
    deco: [
      ['l3', 'p2'],
      ['r6', 'p2'],
    ],
  },
};
