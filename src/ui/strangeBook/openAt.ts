/**
 * Le Grand Livre demandé sur une page précise (une vision de sceau cliquée, ui/sealVision.ts) : gardée jusqu'à ce que
 * la page du livre s'ouvre (ui/app.ts), qui la prend une fois.
 */
let pending: number | undefined;

export const openStrangeBookAt = (page: number): void => {
  pending = page;
};

export const takeStrangeBookPage = (): number | undefined => {
  const page = pending;
  pending = undefined;
  return page;
};
