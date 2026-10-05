import { ETHERIUM, SPENDING_ORDER, type TreeId } from './config';

/** Ce qui survit au prestige : les pages à vie, l'Éther, l'Etherium, la Page Cornée une fois retrouvée. */
export interface Life {
  pages: number;
  etherReceived: number;
  etherFree: number;
  nodes: Record<TreeId, number>;
  secretFound: boolean;
  /** Secondes écoulées depuis le début, absences comprises. */
  clock: number;
}

export const newLife = (): Life => ({
  pages: 0,
  etherReceived: 0,
  etherFree: 0,
  nodes: Object.fromEntries(Object.keys(ETHERIUM).map((id) => [id, 0])) as Record<TreeId, number>,
  secretFound: false,
  clock: 0,
});

/** Conception §4.1 : floor(∛(pages à vie / 1 Md)), moins ce qui est déjà reçu. */
export const etherGain = (life: Life, runPages: number): number =>
  Math.floor(Math.cbrt((life.pages + runPages) / 1e9)) - life.etherReceived;

/** Ce que donne un arbre de l'Etherium au niveau atteint, `none` s'il n'a aucun nœud. */
export const treeValue = (life: Life, tree: TreeId, none: number): number => {
  const level = life.nodes[tree];
  return level === 0 ? none : ETHERIUM[tree].values[level - 1];
};

/** Au réveil : le bot achète dans l'ordre voulu tant qu'il le peut. Rend les nœuds achetés (ex. « reading 2 »). */
export const spendEther = (life: Life): string[] => {
  const bought: string[] = [];
  for (let again = true; again;) {
    again = false;
    for (const tree of SPENDING_ORDER) {
      const cost = ETHERIUM[tree].costs[life.nodes[tree]];
      if (cost === undefined || cost > life.etherFree) continue;
      life.etherFree -= cost;
      life.nodes[tree] += 1;
      bought.push(`${tree} ${life.nodes[tree]}`);
      again = true;
      break;
    }
  }
  return bought;
};
