/** Crée un élément HTML avec classe et contenu texte optionnels. */
export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

/** Un composant s'affiche une fois, puis se met à jour à chaque tick. */
export interface Component {
  root: HTMLElement;
  update: () => void;
}
