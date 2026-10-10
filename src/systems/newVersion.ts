/** Ce que dit version.json, publié avec chaque build (vite.config.ts). */
export interface PublishedVersion {
  build: string;
  name: string;
}

/**
 * La version en ligne, si elle n'est pas celle qui tourne (`build`, la date de compilation de ce jeu). null si le
 * fichier est illisible (hors ligne, serveur de développement qui renvoie autre chose) ou si c'est la même.
 */
export const newVersion = (published: unknown, build: string): PublishedVersion | null => {
  if (!published || typeof published !== 'object') return null;
  const { build: online, name } = published as Partial<PublishedVersion>;
  if (typeof online !== 'string' || typeof name !== 'string' || online === build) return null;
  return { build: online, name };
};
