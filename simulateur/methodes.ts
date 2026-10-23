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

/** Les méthodes dans l'ordre où leurs phrases se trouvent, selon les Âges achetés. */
export const methodSequence = (life: Life): Method[] => [
  ...MANUAL,
  ...(lit(life, S.age) ? AUTOMATIC : []),
  ...(lit(life, S.age) && lit(life, DIGITAL_AGE) ? DIGITAL : []),
  ...(lit(life, QUANTUM_AGE) ? QUANTUM : []),
];

/** Méthodes gardées par la Mémoire des méthodes (une étoile de la Ruche chacune). */
export const keptMethods = (life: Life): string[] => {
  return Object.keys(KEEPS).filter((id) => lit(life, KEEPS[id]));
};
