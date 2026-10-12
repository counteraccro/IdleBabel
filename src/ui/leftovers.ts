/**
 * Ce que les composants de l'écran du jeu laissent derrière eux (écouteurs sur la fenêtre, rendus WebGL, textures) une
 * fois l'écran quitté. Avant (revue de code, 12/10), chacun ne faisait son ménage qu'au clic suivant : plusieurs
 * retours à l'écran sans clic, et les rendus s'empilaient. Maintenant, la mise à jour suivante d'un autre écran du jeu
 * (sweepLeftovers) s'en charge.
 */
interface Leftover {
  root: HTMLElement;
  release: () => void;
  /** Déjà vu dans la page : un composant pas encore posé n'est pas un reste. */
  seen: boolean;
}

const leftovers = new Set<Leftover>();

/** Inscrit le ménage d'un composant ; renvoie de quoi le faire tout de suite (et une seule fois). */
export const leaveWith = (root: HTMLElement, release: () => void): (() => void) => {
  const entry: Leftover = { root, release, seen: root.isConnected };
  leftovers.add(entry);
  return () => {
    if (!leftovers.delete(entry)) return;
    entry.release();
  };
};

/** Fait le ménage des composants dont l'écran a quitté la page. */
export const sweepLeftovers = (): void => {
  for (const entry of leftovers) {
    if (entry.root.isConnected) entry.seen = true;
    else if (entry.seen) {
      leftovers.delete(entry);
      entry.release();
    }
  }
};
