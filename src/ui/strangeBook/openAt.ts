/**
 * Le Grand Livre demandé sur une page précise (une vision de sceau cliquée, ui/sealVision.ts) : gardée jusqu'à ce que
 * la page du livre s'ouvre (ui/app.ts), qui la prend une fois.
 */
export interface StrangeBookTarget {
  /** La page de la liste. */
  page: number;
  /** Le sceau à mettre en évidence sur sa planche (aucun : plusieurs sceaux, l'introduction). */
  seal?: string;
}

let pending: StrangeBookTarget | undefined;

export const openStrangeBookAt = (target: StrangeBookTarget): void => {
  pending = target;
};

export const takeStrangeBookPage = (): StrangeBookTarget | undefined => {
  const page = pending;
  pending = undefined;
  return page;
};
