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
  /**
   * Étoile offerte, allumée dès le début (ou dès que sa page est débloquée), qui n'est pas dans les données (l'Âge Manuel,
   * le centre de la Rose des vents, la charnière de la Mimic), et celles qu'elle ouvre.
   */
  given?: { id: string; opens: readonly string[] };
  /** Le dessin de la figure, à peine tracé sous les étoiles (la Rose des vents, la Mimic). */
  sketch?: Sketch;
}

/** Ce qu'une figure dessine en pointillés sous ses étoiles. */
export interface Sketch {
  /** Lignes brisées. */
  lines: readonly (readonly (readonly [number, number])[])[];
  /** Un cercle (centre, rayon). */
  circle?: readonly [number, number, number];
  /** D'autres cercles (les reliques : le verre de la loupe, l'astrolabe et son anneau). */
  rings?: readonly (readonly [number, number, number])[];
  /** Des lettres posées sur la figure (les points cardinaux) : clé de texte, place. */
  labels?: readonly (readonly [string, readonly [number, number]])[];
  /** Un œil en amande, la fente du chat au milieu : centre, demi-largeur, angle (degrés). */
  eye?: readonly [number, number, number, number];
}

const ring = ([cx, cy]: readonly [number, number], r: number, deg: number): readonly [number, number] => [
  Math.round(cx + r * Math.cos((deg * Math.PI) / 180)),
  Math.round(cy + r * Math.sin((deg * Math.PI) / 180)),
];

const lens = (deg: number) => ring([265, 415], 112, deg);
const moonOut = (deg: number) => ring([330, 485], 195, deg);
const moonIn = (deg: number) => ring([430, 485], 172.4, deg);
/** Le point à la fraction t du segment a → b. */
const along = (a: readonly [number, number], b: readonly [number, number], t: number): readonly [number, number] => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
];

// La Rose des vents : le centre, et la longueur de chaque pointe (longues pour les quatre directions).
const ROSE = [320, 480] as const;
const ROSE_R = 40;
const ROSE_LEN: Record<number, number> = { 0: 250, 90: 190, 180: 250, 270: 168, 45: 130, 135: 130, 225: 130, 315: 130 };
const tip = (deg: number, len: number) => ring(ROSE, len, deg);
/** Une pointe de la rose : un losange, du centre à son bout. */
const rosePoint = (deg: number, len: number) => {
  const width = deg % 90 ? ROSE_R * 0.7 : ROSE_R;
  return [tip(deg, len), tip(deg + 90, width), ROSE, tip(deg - 90, width), tip(deg, len)];
};

// La Mimic, de profil : la charnière (le dos), d'où partent les deux mâchoires.
const HINGE = [140, 560] as const;
const UPPER = [510, 360] as const;
const LOWER = [530, 610] as const;

// Les reliques, « Le Cabinet » (maquette .ai/maquette-reliques.html) : le centre en bas, une branche par relique, posée
// sur son dessin (la loupe à gauche, l'astrolabe au milieu, le sablier à droite), « La patience » sous le centre.
const CABINET = [320, 520] as const;
/** Un côté du verre du sablier, du plateau du haut au col puis au plateau du bas (`side` : −1 à gauche, 1 à droite). */
const glassSide = (side: number): (readonly [number, number])[] =>
  [
    [35, 282],
    [33, 310],
    [24, 336],
    [10, 356],
    [0, 366],
    [-10, 376],
    [-24, 396],
    [-33, 422],
    [-35, 450],
  ].map(([dx, y]) => [480 + side * dx, y] as const);

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
    given: { id: 'manual', opens: ['auto'] },
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
  // La Rose des vents (11/10) : le centre offert, une pointe par direction ; la figure se dessine en entier dès le début.
  explore: {
    spots: {
      c: ROSE,
      e: tip(0, ROSE_LEN[0]),
      w: tip(180, ROSE_LEN[180]),
      n: tip(270, ROSE_LEN[270]),
      s: tip(90, ROSE_LEN[90]),
      ...Object.fromEntries([315, 45, 135, 225].map((deg, i) => [`d${i}`, tip(deg, ROSE_LEN[deg])])),
    },
    deco: [],
    given: { id: 'c', opens: ['e', 'w', 'n', 's', 'd0', 'd1', 'd2', 'd3'] },
    sketch: {
      lines: Object.entries(ROSE_LEN).map(([deg, len]) => rosePoint(Number(deg), len + 14)),
      circle: [ROSE[0], ROSE[1], 70],
      labels: [
        ['east', tip(0, 286)],
        ['west', tip(180, 286)],
        ['north', tip(270, 202)],
        ['south', tip(90, 224)],
      ],
    },
  },
  // La Mimic, de profil, la mâchoire ouverte : la charnière offerte, les dents du haut et du bas le long des mâchoires ;
  // l'œil, une étoile dans son amande, sur le plat.
  mimic: {
    spots: {
      hinge: HINGE,
      eye: [336, 372],
      ...Object.fromEntries([0.4, 0.7, 1].map((t, i) => [`t${i + 1}`, along(HINGE, UPPER, t)])),
      ...Object.fromEntries([0.2, 0.4, 0.6, 0.8, 1].map((t, i) => [`b${i + 1}`, along(HINGE, LOWER, t)])),
    },
    deco: [],
    given: { id: 'hinge', opens: ['eye', 't1', 'b1'] },
    sketch: {
      lines: [
        // Le dessus du plat, épais ; le dessous du plat du dessous ; la gorge, dans les pages.
        [HINGE, [UPPER[0] - 4, UPPER[1] - 26], [UPPER[0] + 10, UPPER[1] - 6]],
        [HINGE, [LOWER[0] - 4, LOWER[1] + 26], [LOWER[0] + 10, LOWER[1] + 6]],
        [
          [UPPER[0] - 30, UPPER[1] + 36],
          [LOWER[0] - 30, LOWER[1] - 18],
        ],
      ],
      eye: [336, 372, 34, -28],
    },
  },
  relics: {
    spots: {
      hub: CABINET,
      l1: [250, 456],
      l2: [160, 360],
      a1: [320, 402],
      a2: [320, 336],
      h1: [480, 430],
      h2: [480, 300],
      d: [320, 630],
    },
    deco: [],
    given: { id: 'hub', opens: ['l1', 'a1', 'h1', 'd'] },
    sketch: {
      lines: [
        // Le manche de la loupe ; l'alidade de l'astrolabe ; les plateaux du sablier, et ses deux bulbes de chaque côté.
        [
          [198, 398],
          [262, 470],
        ],
        [
          [262, 370],
          [378, 302],
        ],
        [
          [430, 282],
          [530, 282],
        ],
        [
          [430, 450],
          [530, 450],
        ],
        glassSide(-1),
        glassSide(1),
      ],
      rings: [
        [160, 360, 54],
        [320, 336, 66],
        [320, 336, 44],
        [320, 259, 10],
      ],
    },
  },
};
