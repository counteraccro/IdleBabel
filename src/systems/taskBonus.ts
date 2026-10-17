import type { GameState } from '../core/state';

/** Les bonus pour toujours des tâches « une seule fois » (systems/tasks.ts) : ×lecture des méthodes, ×Connaissance par trouvaille. */
export const taskReading = (state: GameState): number => 1 + state.tasks.bonus.reading;
export const taskKnowledge = (state: GameState): number => 1 + state.tasks.bonus.knowledge;
