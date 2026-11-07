/**
 * Le Livre d'or (.ai/plan-livre-dor.md, maquette .ai/maquette-livre-dor.html) : des lettres dorées montent du livre, on les
 * attrape, de plus en plus vite. Chiffres de la maquette, à caler en jouant.
 */

/** L'étoile qui l'ouvre : le Sud de la Rose des vents (à la place de l'atelier, l'auteur, 02/11). */
export const GOLD_BOOK_STAR = 'explore.s';

/** Ce que vaut une lettre (× le combo) : dorée, d'or pur ; le mot BABEL écrit en entier. */
export const LETTER_POINTS = 10;
export const PURE_POINTS = 50;
export const WORD_POINTS = 500;
export const WORD = 'babel';

/** Les chances de chaque sorte de lettre ; l'encre n'arrive qu'après 15 lettres, le mot après 10. */
export const PURE_CHANCE = 0.08;
export const INK_CHANCE = 0.12;
export const INK_AFTER = 15;
export const WORD_CHANCE = 0.012;
export const WORD_AFTER = 10;
/** Une lettre d'or pur monte deux fois plus vite ; une lettre du mot, un peu moins vite. */
export const PURE_LIFE = 0.5;
export const WORD_LIFE = 1.3;

/** Les erreurs permises (des gouttes) : une lettre dorée éteinte, une lettre d'encre touchée. */
export const LIVES = 3;

/**
 * Le combo (l'auteur, 07/11) : ×1 de plus toutes les 10 lettres, jusqu'à ×8 ; il casse si aucune lettre n'est attrapée dans sa
 * fenêtre, 3 s au début, 1,5 s quand le rythme est au plus haut.
 */
export const COMBO_STEP = 10;
export const COMBO_CAP = 8;
export const WINDOW_START = 3000;
export const WINDOW_END = 1500;

/**
 * Le rythme (ms) : une lettre toutes les 1 100 ms au début, 280 ms au plus vite ; elle met 3 600 ms à monter et s'éteindre au
 * début, 1 600 ms à la fin ; le plus vite, vers 160 lettres. La première arrive au bout de 600 ms.
 */
export const GAP_START = 1100;
export const GAP_END = 280;
export const LIFE_START = 3600;
export const LIFE_END = 1600;
export const FULL_SPEED_AT = 160;
export const FIRST_LETTER = 600;

/** Une faveur parmi trois toutes les 25 lettres, le temps de la partie. */
export const FAVOR_EVERY = 25;
export const FAVOR_CHOICES = 3;

export type FavorId = 'slow' | 'pardon' | 'breath' | 'vein' | 'inkPact' | 'ceiling' | 'name' | 'mend';
/**
 * Les faveurs : le Ralenti (lettres 15 % moins vite), le Pardon (une erreur de plus), la Longue haleine (combo 0,5 s de plus),
 * le Filon (deux fois plus d'or pur), le Pacte d'encre (points ×2, deux fois plus d'encre), le Plafond levé (combo deux crans
 * plus haut), le Nom (BABEL trois fois plus souvent), la Reprise (toutes les erreurs rendues).
 */
export const FAVORS: readonly FavorId[] = ['slow', 'pardon', 'breath', 'vein', 'inkPact', 'ceiling', 'name', 'mend'];
export const FAVOR_SLOW = 1.15;
export const FAVOR_BREATH = 500;
export const FAVOR_CEILING = 2;
export const FAVOR_NAME = 3;

/** Fin de partie, « Le lire » : √score ÷ 4 minutes de lecture, trois fois par jour (remis à minuit). */
export const READS_PER_DAY = 3;
export const READ_DIVISOR = 4;
/** « Nourrir l'arbre » : le score ÷ 100 en poussière d'or, sans limite. */
export const DUST_DIVISOR = 100;

/**
 * Les étoiles de « La Lettrine », la page du Livre d'or dans l'Etherium (07/11) : une 4e puis une 5e lecture par jour, la
 * poussière d'or ×1,5, un départ plus lent (les 30 premières lettres 15 % moins vite).
 */
export const READ_STARS = ['goldBook.r4', 'goldBook.r5'] as const;
export const DUST_STAR = 'goldBook.d';
export const DUST_STAR_FACTOR = 1.5;
export const SLOW_START_STAR = 'goldBook.s';
export const SLOW_START_LETTERS = 30;
export const SLOW_START_FACTOR = 1.15;

/** Le score d'une partie qui donne le tome suivant de « L'histoire de Babel » (l'auteur, 07/11 ; à caler en jouant). */
export const TOME_SCORE = 50_000;

/** Ce que font les cases de l'arbre : la plupart s'ajoutent, `word` et `babel` se multiplient. */
export interface TreeEffects {
  /** Points en plus (une part). */
  points?: number;
  /** Fenêtre du combo en plus (ms). */
  window?: number;
  /** Chance d'or pur en plus. */
  pure?: number;
  lives?: number;
  /** Le combo part de ×n. */
  startMult?: number;
  /** Le combo monte de n crans de plus. */
  cap?: number;
  /** BABEL vient n fois plus souvent. */
  word?: number;
  /** Une lettre d'or pur vaut n de plus. */
  pureValue?: number;
  /** BABEL vaut n fois plus. */
  babel?: number;
  /** Les lettres viennent moins vite (une part). */
  calm?: number;
  /** Une faveur de plus au choix. */
  choice?: number;
  /** « Le lire » donne une part de minutes en plus. */
  read?: number;
}

export interface TreeCase {
  cost: number;
  /** Les cases qui paraissent quand elle est achetée (rien ne l'annonce). */
  kids?: readonly string[];
  fx: TreeEffects;
}

/**
 * L'arbre (l'auteur, 02/11 : « là c'est très bien ») : il pousse du centre ; acheter une case en fait paraître 0 à 3 autres. Les
 * bouts de branche gardent les plus beaux effets. Noms : le Trait (points), le Fil (combo), la Paillette (or pur), et aux bouts
 * la Reliure, l'Élan, la Voûte, le Nom, l'Or massif, le Mot d'or, le Calme, le Quatrième, la Marge, le Lecteur.
 */
export const TREE: Readonly<Record<string, TreeCase>> = {
  root: { cost: 10, kids: ['a', 'b', 'c'], fx: { points: 0.03 } },
  a: { cost: 30, kids: ['a1', 'a2'], fx: { window: 200 } },
  a1: { cost: 90, kids: ['a1x'], fx: { points: 0.05 } },
  a2: { cost: 150, fx: { lives: 1 } },
  a1x: { cost: 300, kids: ['a1x1', 'a1x2'], fx: { window: 300 } },
  a1x1: { cost: 1200, fx: { startMult: 2 } },
  a1x2: { cost: 900, fx: { cap: 2 } },
  b: { cost: 30, kids: ['b1'], fx: { pure: 0.03 } },
  b1: { cost: 100, kids: ['b1x', 'b1y', 'b1z'], fx: { points: 0.05 } },
  b1x: { cost: 400, fx: { word: 2 } },
  b1y: { cost: 350, kids: ['b1y1'], fx: { pure: 0.03 } },
  b1y1: { cost: 1100, fx: { pureValue: 50 } },
  b1z: { cost: 800, fx: { babel: 3 } },
  c: { cost: 40, kids: ['c1', 'c2'], fx: { points: 0.04 } },
  c1: { cost: 160, kids: ['c1a'], fx: { calm: 0.1 } },
  c1a: { cost: 420, kids: ['c1a1'], fx: { points: 0.06 } },
  c1a1: { cost: 1500, fx: { choice: 1 } },
  c2: { cost: 120, kids: ['c2a', 'c2b'], fx: { window: 200 } },
  c2a: { cost: 600, fx: { lives: 1 } },
  c2b: { cost: 380, kids: ['c2b1'], fx: { points: 0.06 } },
  c2b1: { cost: 1300, fx: { read: 0.25 } },
};
export const TREE_ROOT = 'root';
