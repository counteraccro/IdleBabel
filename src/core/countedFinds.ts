import type { Find, FindKind } from '../data/knowledge';
import { REMOVED_METHODS } from './removedMethods';

/**
 * Les trouvailles, comptées par sorte : le Grand Livre n'en montre que le nombre. Jusqu'au 08/10/2026, la
 * sauvegarde les gardait une à une ; des dizaines de milliers après quelques prestiges, des centaines de milliers
 * après une longue absence, jusqu'à dépasser la place que le navigateur lui laisse : la sauvegarde échouait alors
 * sans rien dire.
 */
export type FindCounts = Record<FindKind, number>;

export const noFinds = (): FindCounts => ({ word: 0, piece: 0, sentence: 0 });

/**
 * Les compteurs d'une sauvegarde, et ses trouvailles d'avant, une à une, s'il en reste : comptées (sans celles
 * d'avant le livre blanc, qui n'avaient pas de phrase, ni celles des méthodes retirées), puis oubliées.
 */
export const countSavedFinds = (counts: Partial<FindCounts> | undefined, finds: readonly Partial<Find>[] | undefined): FindCounts => {
  const total = { ...noFinds(), ...counts };
  for (const find of finds ?? [])
    if (typeof find.sentence === 'string' && !REMOVED_METHODS.includes(find.sentence) && find.kind && find.kind in total)
      total[find.kind] += 1;
  return total;
};
