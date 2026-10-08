import { SEALS } from '../src/data/seals';
import { createInitialState } from '../src/core/state';
import type { GameState } from '../src/core/state';
import { PAGES_PER_BOOK } from '../src/systems/books';
import { PLAYER } from './config';
import type { Run } from './partie';

/**
 * Les sceaux du jeu (src/data/seals.ts), obtenus comme en jeu (revue du 08/10) : à chaque vérification, une partie
 * du jeu est remplie avec ce que sait le bot, et chaque sceau pas encore obtenu regarde s'il est atteint. Les planches
 * des livres rares et des secrets n'en sont pas (le hasard, l'heure, les gestes) : PLAYER.otherSeals les remplace.
 */
const FOLLOWED = SEALS.filter((seal) => seal.plate !== 'rare' && seal.plate !== 'secrets');

const asState = (run: Run): GameState => {
  const { life } = run;
  const now = Date.now();
  const state = createInitialState('fr', now - life.clock * 1000);
  state.totalPagesRead = life.pages + run.read;
  state.pages = run.pages;
  state.pagesByMethods = life.methodPages;
  state.pagesByHand = life.handPages;
  state.stats = { clicks: life.clicks, playSeconds: life.clock, bestPagesPerSecond: life.bestSpeed, fragments: life.finds };
  state.booksFinished = Math.floor(life.turned / PAGES_PER_BOOK);
  state.lifetimeKnowledge = life.knowledge;
  for (const [id, count] of Object.entries(run.owned)) (state.tools as Record<string, number>)[id] = count;
  state.methodPages = { ...run.methodPages };
  state.technologies = { ...run.levels };
  state.exiles = life.prestiges;
  state.etherReceived = life.etherReceived;
  state.etherium = [...life.stars];
  return state;
};

/** Scelle ce que la partie vient d'atteindre (les sceaux restent pour toujours, comme en jeu). */
export const checkSeals = (run: Run): void => {
  if (PLAYER.seals !== 'jeu') return;
  const state = asState(run);
  for (const seal of FOLLOWED) if (!run.life.seals.has(seal.id) && seal.reached(state)) run.life.seals.add(seal.id);
};

/** Sceaux qui comptent pour la chance de trouvaille. */
export const sealCount = (run: Run): number => (PLAYER.seals === 'jeu' ? run.life.seals.size + PLAYER.otherSeals : PLAYER.seals);

/** Sceaux obtenus, par planche. */
export const sealsPerPlate = (seals: Set<string>): string => {
  const plates = [...new Set(FOLLOWED.map((seal) => seal.plate))];
  return plates
    .map((plate) => {
      const all = FOLLOWED.filter((seal) => seal.plate === plate);
      return `${plate} ${all.filter((seal) => seals.has(seal.id)).length}/${all.length}`;
    })
    .join(', ');
};
