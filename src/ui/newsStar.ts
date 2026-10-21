/**
 * L'étoile des nouveautés d'un médaillon de l'en-tête (l'auteur, 21/10 : la lueur en boucle « finit par n'être plus prise en
 * compte ») : quand une nouveauté arrive, le médaillon sursaute une fois, puis une étoile fixe reste jusqu'à ce qu'on ouvre
 * le livre. Ouvert, l'étoile s'éteint même si la nouveauté attend encore (le livre la montre à l'intérieur) ; elle ne
 * revient qu'avec une nouveauté suivante (la précédente finie, une autre arrive).
 */
export interface NewsStar {
  /** La nouveauté attend-elle ? true au moment où elle arrive : le médaillon sursaute. */
  update: (waiting: boolean) => boolean;
  /** Le livre est ouvert : l'étoile s'éteint. */
  seen: () => void;
  /** L'étoile est-elle allumée ? */
  readonly lit: boolean;
}

export const createNewsStar = (): NewsStar => {
  let waiting = false;
  let seen = false;
  return {
    update: (now) => {
      const arrived = now && !waiting;
      if (!now) seen = false;
      waiting = now;
      return arrived;
    },
    seen: () => {
      if (waiting) seen = true;
    },
    get lit() {
      return waiting && !seen;
    },
  };
};
