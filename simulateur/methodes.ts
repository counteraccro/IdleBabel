import { TOOLS } from '../src/data/tools';
import { AUTOMATIC, SECRET_MANUAL } from './config';
import { KEEPS, S } from '../src/data/etheriumStars';
import { lit, type Life } from './vie';

/** Une méthode pour le simulateur : celles du jeu (src/data/tools.ts), puis celles proposées (config.ts). */
export interface Method {
  id: string;
  baseCost: number;
  pagesPerSecond: number;
  pieces: number;
  /** Son intuition (les méthodes de l'Âge Manuel) : production ×2 par niveau. */
  gesture?: string;
  manual?: boolean;
}

/** Morceaux des phrases des méthodes du jeu (whiteBook.sentences, en français). */
const PIECES: Record<string, number> = { diagonal: 4, finger: 4, voice: 4, lectern: 5, ladder: 7 };

const MANUAL: Method[] = TOOLS.map((tool) => ({
  id: tool.id,
  baseCost: tool.baseCost,
  pagesPerSecond: tool.pagesPerSecond,
  pieces: PIECES[tool.id] ?? 5,
  gesture: `${tool.id}Gesture`,
  manual: true,
}));

export const SECRET: Method = { ...SECRET_MANUAL };

/** Les méthodes dans l'ordre où leurs phrases se trouvent, selon les Âges achetés. */
export const methodSequence = (life: Life): Method[] => (lit(life, S.age) ? [...MANUAL, ...AUTOMATIC] : MANUAL);

/** Méthodes gardées par la Mémoire des méthodes (une étoile de la Ruche chacune). */
export const keptMethods = (life: Life): string[] => Object.keys(KEEPS).filter((id) => lit(life, KEEPS[id]));
