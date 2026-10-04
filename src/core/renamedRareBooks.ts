import type { GameState } from './state';

/**
 * Livres rares remplacés par un autre (ancien id → nouveau). Une partie qui avait trouvé l'ancien a le
 * nouveau à sa place, au chargement : même numéro de livre, même sceau, même moment dans l'histoire.
 * « Le Livre des morts » a laissé sa place aux « Jokes de Papa » (décision de l'auteur, 03/10/2026),
 * « Ta Justification » au « grand livre du X » (04/10/2026).
 */
const RENAMED: Readonly<Record<string, string>> = {
  deadBook: 'dadJokes',
  vindication: 'bigX',
};

const renameKeys = <T>(record: Record<string, T>, rename: (key: string) => string): Record<string, T> =>
  Object.fromEntries(Object.entries(record).map(([key, value]) => [rename(key), value]));

const renameSeal = (id: string): string => (id.startsWith('rare-') ? `rare-${RENAMED[id.slice(5)] ?? id.slice(5)}` : id);

export const renameRareBooks = (state: GameState): GameState => ({
  ...state,
  rareBooks: renameKeys(state.rareBooks, (id) => RENAMED[id] ?? id),
  seals: renameKeys(state.seals, renameSeal),
  newSeals: state.newSeals.map(renameSeal),
  history: state.history.map((entry) =>
    entry.type === 'rareBook' && entry.detail && RENAMED[entry.detail] ? { ...entry, detail: RENAMED[entry.detail] } : entry,
  ),
});
