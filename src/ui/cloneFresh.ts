let cloneCount = 0;

/**
 * Copie d'un élément dont les identifiants internes (dégradés, filtres des SVG) sont renommés : sans
 * ça, la copie et l'original partagent leurs id, et l'original peut se mettre à utiliser les dégradés
 * de la copie (cachée, déplacée), et s'afficher de travers.
 */
export const cloneWithFreshIds = <T extends Element>(node: T): T => {
  const copy = node.cloneNode(true) as T;
  const suffix = `-copy${cloneCount++}`;
  const renamed = new Map<string, string>();
  for (const element of copy.querySelectorAll('[id]')) {
    renamed.set(element.id, element.id + suffix);
    element.id += suffix;
  }
  if (renamed.size === 0) return copy;
  for (const element of [copy, ...copy.querySelectorAll('*')]) {
    for (const attribute of [...element.attributes]) {
      if (!attribute.value.includes('#')) continue;
      const value = attribute.value.replace(/#([\w-]+)/g, (match, id: string) => (renamed.has(id) ? `#${renamed.get(id)}` : match));
      if (value !== attribute.value) element.setAttribute(attribute.name, value);
    }
  }
  return copy;
};
