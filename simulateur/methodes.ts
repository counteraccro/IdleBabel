import { METHOD_CHAIN, TOOLS } from '../src/data/tools';
import { KEEPS, S } from '../src/data/etheriumStars';
import { lit, type Life } from './vie';

/** Une méthode pour le simulateur : celles du jeu (src/data/tools.ts). */
export interface Method {
  id: string;
  baseCost: number;
  pagesPerSecond: number;
  pieces: number;
  /** Son intuition : production ×2 par niveau. */
  gesture?: string;
  manual?: boolean;
}

/** Morceaux des phrases des méthodes du jeu (whiteBook.sentences, en français). */
const PIECES: Record<string, number> = { diagonal: 4, finger: 4, voice: 4, lectern: 5, ladder: 7, cornee: 5 };

const method = (tool: (typeof TOOLS)[number]): Method => ({
  id: tool.id,
  baseCost: tool.baseCost,
  pagesPerSecond: tool.pagesPerSecond,
  pieces: PIECES[tool.id] ?? 5,
  gesture: `${tool.id}Gesture`,
  manual: !tool.age,
});

const MANUAL: Method[] = METHOD_CHAIN.filter((tool) => !tool.age).map(method);

/** L'Âge Automatique (src/data/tools.ts) : ses méthodes ne se trouvent qu'une fois l'Âge acheté. */
export const AUTOMATIC: Method[] = METHOD_CHAIN.filter((tool) => tool.age).map(method);

/** La Page Cornée, méthode secrète de l'Âge Manuel (dans le jeu : src/data/tools.ts). */
export const SECRET: Method = method(TOOLS.find((tool) => tool.secret)!);

/** Les méthodes dans l'ordre où leurs phrases se trouvent, selon les Âges achetés. */
export const methodSequence = (life: Life): Method[] => (lit(life, S.age) ? [...MANUAL, ...AUTOMATIC] : MANUAL);

/** Méthodes gardées par la Mémoire des méthodes (une étoile de la Ruche chacune). */
export const keptMethods = (life: Life): string[] => Object.keys(KEEPS).filter((id) => lit(life, KEEPS[id]));
