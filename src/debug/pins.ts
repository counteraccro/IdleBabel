/**
 * Sujets choisis dans le livre de débogage : ils s'affichent dans la barre de débogage, dans l'ordre du
 * livre. Gardés dans ce navigateur d'une session à l'autre (outil de développement : pas
 * dans la sauvegarde de la partie).
 */
const PINS_KEY = 'idle-babel-debug-pins';

type PinsListener = () => void;
const listeners = new Set<PinsListener>();

const read = (): string[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(PINS_KEY) ?? '[]');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
};

let pins = read();

const store = (): void => {
  try {
    localStorage.setItem(PINS_KEY, JSON.stringify(pins));
  } catch {
    // stockage indisponible : le choix vaut pour cette session seulement
  }
  listeners.forEach((listener) => listener());
};

export const pinnedSubjects = (): readonly string[] => pins;

export const isPinned = (id: string): boolean => pins.includes(id);

/** Choisit le sujet, ou le retire s'il l'était déjà. */
export const togglePin = (id: string): void => {
  pins = isPinned(id) ? pins.filter((pin) => pin !== id) : [...pins, id];
  store();
};

export const unpin = (id: string): void => {
  if (!isPinned(id)) return;
  pins = pins.filter((pin) => pin !== id);
  store();
};

/** Prévient quand le choix change (livre ou barre). Renvoie de quoi se désabonner. */
export const onPinsChange = (listener: PinsListener): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
