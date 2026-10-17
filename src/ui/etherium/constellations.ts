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
  /** Où sont leurs textes (etherium.compass par défaut), et leur taille (14 par défaut), espacées de tant. */
  labelKeys?: string;
  labelSize?: number;
  labelSpacing?: number;
  /** Tracé plus appuyé (la machine de la Loterie, comme dans sa maquette). */
  strong?: boolean;
  /** Des cadres aux coins arrondis (les fenêtres des rouleaux, la fente) : gauche, haut, largeur, hauteur, rayon. */
  boxes?: readonly (readonly [number, number, number, number, number])[];
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

/** Les points d'une courbe du second degré a → b (passant par le contrôle c), pour la tracer en lignes brisées. */
const curve = (
  a: readonly [number, number],
  c: readonly [number, number],
  b: readonly [number, number],
  steps = 16,
): (readonly [number, number])[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const k = i / steps;
    return [
      Math.round((1 - k) ** 2 * a[0] + 2 * (1 - k) * k * c[0] + k ** 2 * b[0]),
      Math.round((1 - k) ** 2 * a[1] + 2 * (1 - k) * k * c[1] + k ** 2 * b[1]),
    ] as const;
  });

// La Loterie, la machine de face (17/10, .ai/maquette-etherium-loterie.html) : la fente, le pivot du levier et sa boule,
// les trois rouleaux.
const SLOT = [310, 632] as const;
const PIVOT = [474, 520] as const;
const BALL = [500, 334] as const;
const REELS = [220, 310, 400] as const;

// Les Tâches, le cadran solaire vu d'en haut (17/10, .ai/maquette-etherium-taches.html) : le pied du style, le rayon du
// jour ; un point du cadran, à tant de degrés (270 : le style, midi) et tant du pied.
const DIAL = [320, 615] as const;
const DIAL_R = 255;
const dial = (deg: number, r: number) => ring(DIAL, r, deg);
/** Un arc du jour, de gauche à droite par le haut, en lignes brisées (un point tous les 3 degrés). */
const dayArc = (r: number) => Array.from({ length: 61 }, (_, i) => dial(180 + i * 3, r));

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

// La Ruche, piste A de la maquette (.ai/maquette-etherium-numerique.html, choix de l'auteur, 13/10) : trois alvéoles en
// ligne, un peu plus petites pour tenir côte à côte.
// L'Atlas, piste B (.ai/maquette-etherium-numerique.html, choix de l'auteur, 13/10) : un géant agenouillé, qui porte une
// salle de la Bibliothèque (l'hexagone, l'hexagone intérieur, une étagère sur chaque mur).
const ROOM = [330, 350] as const;
const roomHex = (r: number) => [0, 1, 2, 3, 4, 5, 6].map((i) => ring(ROOM, r, 30 + i * 60));
const ATLAS_BODY: readonly (readonly (readonly [number, number])[])[] = [
  // La jambe à genou, la jambe pliée devant, le dos, le bras gauche sous le fardeau, le bras droit.
  [
    [130, 660],
    [250, 660],
    [280, 560],
  ],
  [
    [280, 560],
    [400, 545],
    [440, 660],
  ],
  [
    [280, 560],
    [300, 465],
  ],
  [
    [300, 465],
    [235, 430],
    [250, 380],
  ],
  [
    [300, 465],
    [400, 430],
    [415, 382],
  ],
];

const MANUAL_CELL = [120, 470] as const;
const AUTO_CELL = [320, 470] as const;
const DIGITAL_CELL = [520, 470] as const;
const CELL = 80;

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
  // Trois alvéoles pointe en haut, côte à côte ; la dernière méthode d'un Âge mène à la première étoile du suivant.
  memory: {
    spots: {
      ...Object.fromEntries([90, 150, 210, 270, 330, 30].map((deg, i) => [`m${i}`, ring(MANUAL_CELL, CELL, deg)])),
      ...Object.fromEntries([150, 210, 270, 330, 30, 90].map((deg, i) => [`a${i}`, ring(AUTO_CELL, CELL, deg)])),
      ...Object.fromEntries([150, 210, 270, 330, 30, 90].map((deg, i) => [`n${i}`, ring(DIGITAL_CELL, CELL, deg)])),
    },
    deco: [
      ['m5', 'm0'],
      ['a5', 'a0'],
      ['n5', 'n0'],
    ],
  },
  // Du pied à la salle qu'il porte, chaque étoile allège le poids de la Bibliothèque.
  weight: {
    spots: {
      w1: [130, 660],
      w2: [250, 660],
      w3: [280, 560],
      w4: [300, 465],
      w5: [400, 430],
      w6: [415, 382],
      w7: [330, 350],
    },
    deco: [],
    sketch: {
      lines: [
        ...ATLAS_BODY,
        roomHex(92),
        roomHex(58),
        ...[0, 1, 2, 3, 4, 5].map((i) => [ring(ROOM, 60, 30 + i * 60 + 22), ring(ROOM, 84, 30 + i * 60 + 18)]),
      ],
      // La tête, sous la salle.
      rings: [[332, 458, 15]],
    },
  },
  // Le Minitel, descendu sous le texte d'en-tête (maquette : y → 312 + (y − 262) × 0,93) : le boîtier et son écran, le
  // pied, le clavier qui se replie devant, le cordon jusqu'à la prise, quelques lignes de texte à l'écran.
  screen: {
    spots: {
      plug: [95, 640],
      s1: [205, 515],
      s2: [205, 343],
      s3: [435, 343],
      s4: [435, 515],
      k1: [190, 631],
      k2: [275, 631],
      k3: [365, 631],
      k4: [450, 631],
    },
    deco: [['s4', 's1']],
    sketch: {
      lines: [
        [
          [180, 312],
          [460, 312],
          [478, 329],
          [478, 539],
          [460, 554],
          [180, 554],
          [162, 539],
          [162, 329],
          [180, 312],
        ],
        [
          [268, 554],
          [252, 578],
        ],
        [
          [372, 554],
          [388, 578],
        ],
        [
          [150, 591],
          [490, 591],
          [512, 675],
          [128, 675],
          [150, 591],
        ],
        [
          [156, 613],
          [484, 613],
        ],
        [
          [148, 652],
          [492, 652],
        ],
        [
          [95, 640],
          [100, 589],
          [118, 538],
          [162, 505],
        ],
        [
          [228, 381],
          [392, 381],
        ],
        [
          [228, 409],
          [412, 409],
        ],
        [
          [228, 437],
          [348, 437],
        ],
        [
          [228, 465],
          [380, 465],
        ],
      ],
    },
  },
  // Le Rideau (14/10, .ai/maquette-faux-livre.html, à l'identique) : fermé, vu de face, sans courbe ; la tringle et ses deux
  // bouts, les deux pans qui se rejoignent au milieu, d'autres plis droits qui s'évasent un peu, le sol. L'ourlet, festonné
  // par le bas des plis, ne fait que relier.
  curtain: {
    spots: {
      c0: [320, 300],
      lm: [232, 300],
      rm: [408, 300],
      l: [144, 300],
      r: [496, 300],
      blm: [226, 646],
      brm: [414, 646],
      bl: [128, 664],
      br: [512, 664],
    },
    deco: [
      ['bl', 'blm'],
      ['blm', 'brm'],
      ['brm', 'br'],
    ],
    sketch: {
      lines: [
        [
          [104, 300],
          [536, 300],
        ],
        [
          [104, 292],
          [104, 308],
        ],
        [
          [536, 292],
          [536, 308],
        ],
        [
          [320, 304],
          [320, 652],
        ],
        [
          [188, 304],
          [178, 655],
        ],
        [
          [276, 304],
          [272, 650],
        ],
        [
          [364, 304],
          [368, 650],
        ],
        [
          [452, 304],
          [462, 655],
        ],
        [
          [104, 684],
          [536, 684],
        ],
      ],
    },
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
  // La Loterie, « Le Bandit manchot » : la fente offerte ; le levier porte le jeton ; deux étoiles dans la fenêtre de chaque
  // rouleau (le temps, la valeur, la chance), leur nom au-dessus.
  lottery: {
    spots: {
      slot: SLOT,
      j1: PIVOT,
      j2: BALL,
      ...Object.fromEntries(
        ['g', 'm', 'd'].flatMap((branch, i) => [
          [`${branch}1`, [REELS[i], 560]],
          [`${branch}2`, [REELS[i], 430]],
        ]),
      ),
    },
    deco: [],
    given: { id: 'slot', opens: ['j1', 'g1', 'm1', 'd1'] },
    sketch: {
      lines: [
        // Le corps, le haut en arc ; le plateau ; le pied du levier et sa tige.
        [[170, 660], [170, 330], ...curve([170, 330], [310, 262], [450, 330]), [450, 660], [170, 660]],
        [
          [150, 660],
          [470, 660],
        ],
        [
          [156, 676],
          [464, 676],
        ],
        [
          [450, 540],
          [PIVOT[0], 540],
          [PIVOT[0], 500],
          [450, 500],
        ],
        [PIVOT, [BALL[0], BALL[1] + 16]],
      ],
      rings: [[BALL[0], BALL[1], 16]],
      boxes: [...REELS.map((x) => [x - 34, 390, 68, 210, 8] as const), [SLOT[0] - 18, SLOT[1] - 4, 36, 8, 3]],
      labels: [
        ['time', [REELS[0], 372]],
        ['value', [REELS[1], 372]],
        ['luck', [REELS[2], 372]],
      ],
      strong: true,
      labelKeys: 'etherium.pages.lottery.reels',
      labelSize: 11,
      labelSpacing: 1.5,
    },
  },
  // Les Tâches, « Le Cadran solaire » : le pied du style offert ; le style porte le nombre, la ligne d'heure de gauche le
  // gain, celle de droite « une seule fois » ; le nom de chaque branche au bord du cadran.
  tasks: {
    spots: {
      o: DIAL,
      n4: dial(270, 110),
      n5: dial(270, 205),
      g2: dial(210, 120),
      g3: dial(210, 210),
      p1: dial(330, 90),
      p2: dial(330, 155),
      p3: dial(330, 220),
    },
    deco: [],
    given: { id: 'o', opens: ['n4', 'g2', 'p1'] },
    sketch: {
      lines: [
        // Le demi-cercle du jour et son bord intérieur ; les lignes d'heures ; le style, en triangle fin ; la pierre dessous.
        dayArc(DIAL_R),
        dayArc(DIAL_R - 22),
        ...Array.from({ length: 13 }, (_, i) => [dial(180 + i * 15, 40), dial(180 + i * 15, DIAL_R - 22)]),
        [
          [DIAL[0] - 10, DIAL[1]],
          [DIAL[0], DIAL[1] - DIAL_R + 30],
          [DIAL[0] + 10, DIAL[1]],
        ],
        [
          [DIAL[0] - DIAL_R - 20, DIAL[1]],
          [DIAL[0] + DIAL_R + 20, DIAL[1]],
        ],
        [
          [DIAL[0] - DIAL_R - 10, DIAL[1] + 18],
          [DIAL[0] + DIAL_R + 10, DIAL[1] + 18],
        ],
      ],
      labels: [
        ['gain', dial(210, DIAL_R + 30)],
        ['count', dial(270, DIAL_R + 26)],
        ['once', dial(330, DIAL_R + 30)],
      ],
      strong: true,
      labelKeys: 'etherium.pages.tasks.branches',
      labelSize: 11,
      labelSpacing: 1.5,
    },
  },
};
