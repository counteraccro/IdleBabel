/**
 * Ce qu'un livre 3D a besoin de savoir de son contenu : combien de pages, et comment dessiner l'une
 * d'elles. Le livre n'en dessine que quelques-unes à la fois (celles qu'on voit et leurs voisines).
 *
 * Numérotation : la double page n° s montre la page 2s à gauche et la page 2s + 1 à droite ; une page
 * paire est donc toujours à gauche (reliure à droite), une page impaire à droite (reliure à gauche).
 * La page 0 est la première à gauche, en face de la page de titre (page 1).
 *
 * Aux deux bouts, un plat : la première double page montre à gauche l'intérieur de la couverture (la
 * page 0 n'y est jamais visible), la dernière montre à droite l'intérieur du plat arrière (la dernière
 * feuille a tourné, sa page de gauche est la dernière du livre).
 */
export interface PageSource {
  /** Nombre de pages (faces imprimées). */
  count: number;
  /**
   * Dessine la page `index` sur le canvas (déjà à la taille d'une page) ; la reliure est à gauche si
   * `spineOnLeft`. false : la page reste vierge (le livre montre son papier nu).
   */
  paint: (index: number, canvas: HTMLCanvasElement, spineOnLeft: boolean) => boolean;
}

/** Nombre de doubles pages d'un livre. */
export const spreadCount = (source: PageSource): number => Math.floor(source.count / 2) + 1;
