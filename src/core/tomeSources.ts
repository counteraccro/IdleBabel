import type { GameState } from './state';

/**
 * Le sceau du tome 2 (« Là-bas. », 18/10) devient celui du gros lot, nommé d'après le premier tome qu'il a donné
 * (l'auteur, 18/10) : une partie qui avait gagné le tome 2 l'avait gagné au gros lot, seule source jusque-là ; son sceau
 * et son indice changent de nom.
 */
export const keepJackpotTome = (state: GameState): GameState => {
  const won = state.sagaTomes.includes(2) && state.tomeFrom.jackpot === undefined;
  if (!won && !('overThere' in state.seals) && !('hintOverThere' in state.written)) return state;
  const { overThere, ...seals } = state.seals;
  const { hintOverThere, ...written } = state.written;
  return {
    ...state,
    tomeFrom: won ? { ...state.tomeFrom, jackpot: 2 } : state.tomeFrom,
    seals: overThere === undefined ? seals : { ...seals, tomeJackpot: overThere },
    written: hintOverThere === undefined ? written : { ...written, hintTomeJackpot: hintOverThere },
    newSeals: state.newSeals.map((id) => (id === 'overThere' ? 'tomeJackpot' : id)),
  };
};
