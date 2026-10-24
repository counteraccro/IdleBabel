import { AUTOMATIC_AGE, DIGITAL_AGE, METHOD_CHAIN, TOOLS } from '../src/data/tools';
import { KEEPS, S } from '../src/data/etheriumStars';
import { lit, type Life } from './vie';
import { PLAYER } from './config';

/** Une méthode pour le simulateur : celles du jeu (src/data/tools.ts). */
export interface Method {
  id: string;
  baseCost: number;
  pagesPerSecond: number;
  pieces: number;
  /** Son intuition : production ×2 par niveau. */
  gesture?: string;
  manual?: boolean;
  /** L'Âge où elle se découvre (rien : le Manuel) ; la première d'un Âge n'attend que la phrase de la dernière d'avant. */
  age?: string;
}

/** Morceaux des phrases des méthodes du jeu (whiteBook.sentences, en français). */
const PIECES: Record<string, number> = { diagonal: 4, finger: 4, voice: 4, lectern: 5, ladder: 7, cornee: 5 };

const method = (tool: (typeof TOOLS)[number]): Method => ({
  id: tool.id,
  baseCost: PLAYER.methods[tool.id]?.baseCost ?? tool.baseCost,
  pagesPerSecond:
    (PLAYER.methods[tool.id]?.pagesPerSecond ?? tool.pagesPerSecond) *
    PLAYER.reading[tool.age === DIGITAL_AGE ? 'num' : tool.age ? 'auto' : 'manual'],
  pieces: PIECES[tool.id] ?? 5,
  gesture: `${tool.id}Gesture`,
  manual: !tool.age,
  age: tool.age,
});

const MANUAL: Method[] = METHOD_CHAIN.filter((tool) => !tool.age).map(method);

/** L'Âge Automatique (src/data/tools.ts) : ses méthodes ne se trouvent qu'une fois l'Âge acheté. */
export const AUTOMATIC: Method[] = METHOD_CHAIN.filter((tool) => tool.age === AUTOMATIC_AGE).map(method);

/** La Page Cornée, méthode secrète de l'Âge Manuel (dans le jeu : src/data/tools.ts). */
export const SECRET: Method = method(TOOLS.find((tool) => tool.id === 'cornee')!);

/** L'Âge Numérique (src/data/tools.ts). */
export { DIGITAL_AGE };
export const DIGITAL: Method[] = METHOD_CHAIN.filter((tool) => tool.age === DIGITAL_AGE).map(method);

/** Le Bit, méthode secrète de l'Âge Numérique. */
export const BIT: Method = method(TOOLS.find((tool) => tool.id === 'bit')!);

/**
 * L'Âge Quantique (23/10, essai : pas encore dans le jeu) : ses cinq méthodes, prix et lecture proposés (--methode=
 * microscope:5e21:2.5e11 pour en essayer d'autres). Intuitions : --intuitions-quantiques (intuitions.ts) ; pas de
 * méthode secrète pour l'instant.
 */
export const QUANTUM_AGE = 'ages.quantic';
const QUANTUM_TOOLS: { id: string; baseCost: number; pagesPerSecond: number }[] = [
  { id: 'microscope', baseCost: 5e21, pagesPerSecond: 6.7e12 },
  { id: 'entangled', baseCost: 4e22, pagesPerSecond: 1.8e13 },
  { id: 'teleportation', baseCost: 3.2e23, pagesPerSecond: 4.8e13 },
  { id: 'grover', baseCost: 2.5e24, pagesPerSecond: 1.25e14 },
  { id: 'quantumComputer', baseCost: 2e25, pagesPerSecond: 3.3e14 },
];
export const QUANTUM: Method[] = QUANTUM_TOOLS.map((tool) => ({
  id: tool.id,
  baseCost: PLAYER.methods[tool.id]?.baseCost ?? tool.baseCost,
  pagesPerSecond: (PLAYER.methods[tool.id]?.pagesPerSecond ?? tool.pagesPerSecond) * PLAYER.reading.quant,
  pieces: 5,
  ...(PLAYER.quantumGestures ? { gesture: `${tool.id}Gesture` } : {}),
  age: QUANTUM_AGE,
}));

/**
 * Le Qubit, méthode secrète de l'Âge Quantique (24/10, essai, --qubit), sur le modèle du Bit : prix des Livres Intriqués ×5,12,
 * lecture de Grover ×1,6. Comme le Bit, une fois trouvé il reste (dans le jeu : la 1re étoile de l'alvéole Quantique).
 */
export const QUBIT: Method = {
  id: 'qubit',
  baseCost: PLAYER.methods.qubit?.baseCost ?? 2.048e23,
  pagesPerSecond: (PLAYER.methods.qubit?.pagesPerSecond ?? 2e15) * PLAYER.reading.quant,
  pieces: 5,
  ...(PLAYER.quantumGestures ? { gesture: 'qubitGesture' } : {}),
  age: QUANTUM_AGE,
};

/**
 * Le Lustre, page de l'Âge Quantique dans l'Etherium (24/10, essai : pas encore dans le jeu ; --lustre) : le crochet, puis
 * les tubes de gauche (lecture des méthodes Quantiques) et ceux de droite (Connaissance), comme le Minitel.
 */
export const QUBIT_STAR = 'chandelier.chip';
export const CHANDELIER: { id: string; after: string | null; cost: number }[] = [
  { id: 'chandelier.hook', after: null, cost: 20_000 },
  ...['q', 'k'].flatMap((side) =>
    [50_000, 100_000, 250_000, 500_000].map((cost, i) => ({
      id: `chandelier.${side}${i + 1}`,
      after: i === 0 ? 'chandelier.hook' : `chandelier.${side}${i}`,
      cost,
    })),
  ),
  // La puce, au bout de la tige du milieu : elle fait trouver le Qubit (--qubit).
  ...(PLAYER.qubit ? [{ id: QUBIT_STAR, after: 'chandelier.hook', cost: 200_000 }] : []),
];
export const CHANDELIER_READING: Record<string, number> = {
  'chandelier.hook': 1.1,
  'chandelier.q1': 1.25,
  'chandelier.q2': 1.25,
  'chandelier.q3': 1.5,
  'chandelier.q4': 2,
};
export const CHANDELIER_KNOWLEDGE: Record<string, number> = {
  'chandelier.k1': 1.25,
  'chandelier.k2': 1.5,
  'chandelier.k3': 1.5,
  'chandelier.k4': 2,
};

/** Les méthodes dans l'ordre où leurs phrases se trouvent, selon les Âges achetés. */
export const methodSequence = (life: Life): Method[] => [
  ...MANUAL,
  ...(lit(life, S.age) ? AUTOMATIC : []),
  ...(lit(life, S.age) && lit(life, DIGITAL_AGE) ? DIGITAL : []),
  ...(lit(life, QUANTUM_AGE) ? QUANTUM : []),
];

/**
 * L'alvéole Quantique de la Ruche (24/10, essai, --ruche-quantique) : après l'Algorithme de Babel (memory.n5), le Qubit puis
 * les cinq méthodes ; chacune garde sa phrase au prestige. Prix ×10 de l'alvéole Numérique.
 */
export const QUANTUM_HIVE: { id: string; after: string; cost: number; method: string }[] = PLAYER.quantumHive
  ? ['qubit', 'microscope', 'entangled', 'teleportation', 'grover', 'quantumComputer'].map((method, i) => ({
      id: `memory.q${i}`,
      after: i === 0 ? 'memory.n5' : `memory.q${i - 1}`,
      cost: [1000, 1000, 2000, 4000, 8000, 16_000][i],
      method,
    }))
  : [];

/** Méthodes gardées par la Mémoire des méthodes (une étoile de la Ruche chacune). */
export const keptMethods = (life: Life): string[] => [
  ...Object.keys(KEEPS).filter((id) => lit(life, KEEPS[id])),
  ...QUANTUM_HIVE.filter((star) => star.method !== 'qubit' && lit(life, star.id)).map((star) => star.method),
];
