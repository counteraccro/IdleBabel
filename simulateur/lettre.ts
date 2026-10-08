import { BABEL_ODDS, BABEL_WORD, BOON, BOONS, BREATH_STEP, LETTER_WAIT, UNDERSTOOD_STEP, WATCH_STEP } from '../src/data/letter';
import { EFFECT } from '../src/data/etheriumStars';
import { PLAYER } from './config';
import { lit, product } from './vie';
import type { Run } from './partie';

/**
 * La lettre qui s'échappe (src/data/letter.ts), en moyenne : le bot n'attrape pas chaque lettre (PLAYER.letters, la part
 * attrapée), et chaque bonus compte pour la part du temps où il est en cours. Pendant l'absence, rien.
 */
export interface LetterAverage {
  /** ×lecture des méthodes (la Transe). */
  reading: number;
  /** ×chance de trouvaille (l'Œil vif). */
  finds: number;
  /** ×pages d'un clic (la Main légère). */
  clicks: number;
  /** ×Connaissance par trouvaille (la Mémoire vive). */
  knowledge: number;
  /** ×prix des méthodes (l'Aubaine). */
  price: number;
  /** Secondes de lecture données d'un coup, par seconde de jeu (l'Éclair). */
  flash: number;
  /** Part des pages en réserve donnée par seconde de jeu (le mot BABEL). */
  word: number;
}

const NONE: LetterAverage = { reading: 1, finds: 1, clicks: 1, knowledge: 1, price: 1, flash: 0, word: 0 };

export const letterAverage = (run: Run): LetterAverage => {
  if (PLAYER.letters <= 0) return NONE;
  const level = (id: string): number => run.levels[id] ?? 0;
  const wait = ((LETTER_WAIT.min + LETTER_WAIT.max) / 2) * product(run.life, EFFECT.letterWait) * (1 - WATCH_STEP * level('watch'));
  // Le Souffle retenu et le haut des barbes : une lettre qui reste plus longtemps s'attrape plus souvent (jusqu'à toutes).
  const stays = 8 + BREATH_STEP * level('heldBreath') + (lit(run.life, 'quill.l3') ? 4 : 0);
  const caught = Math.min(1, PLAYER.letters * (stays / 8));
  const perSecond = caught / wait;
  const known = BOONS.filter((boon) => !boon.star || lit(run.life, boon.star));
  const weights = known.reduce((total, boon) => total + boon.weight, 0);
  const length = product(run.life, EFFECT.boonLength) * (1 + UNDERSTOOD_STEP * level('letterUnderstood'));
  const share = (id: string): number => (known.find((boon) => boon.id === id)?.weight ?? 0) / weights;
  /** Part du temps où le bonus est en cours. */
  const uptime = (id: string): number => {
    const seconds = BOONS.find((boon) => boon.id === id)?.seconds ?? 0;
    return Math.min(1, perSecond * (1 - 1 / BABEL_ODDS) * share(id) * seconds * length);
  };
  const trance = Math.max(BOON.trance, ...Object.entries(EFFECT.trance).map(([id, value]) => (lit(run.life, id) ? value : 0)));
  const wordGain = BABEL_WORD.reduce((total, [, part]) => total * (1 + part), 1) - 1;
  return {
    reading: 1 + uptime('trance') * (trance - 1),
    finds: 1 + uptime('eye') * (BOON.eye - 1),
    clicks: 1 + uptime('hand') * (BOON.hand - 1),
    knowledge: 1 + uptime('mind') * (BOON.mind - 1),
    price: 1 - uptime('deal') * (1 - BOON.deal),
    flash: perSecond * (1 - 1 / BABEL_ODDS) * share('flash') * BOON.flash,
    // Le mot entier : une lettre ratée l'arrête (chacune attrapée à la même part).
    word: (perSecond / BABEL_ODDS) * caught ** (BABEL_WORD.length - 1) * wordGain,
  };
};
