/**
 * Choix des menus de la barre de débogage, gardés dans ce navigateur d'une session à l'autre (comme les
 * fiches choisies, pins.ts) : un menu rouvert ou la page rechargée retrouvent ce qu'on avait pris.
 */
const KEY = 'idle-babel-debug-choices';

const read = (): Record<string, string> => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return value && typeof value === 'object' ? (value as Record<string, string>) : {};
  } catch {
    return {};
  }
};

export const rememberedChoice = (id: string): string | undefined => read()[id];

/** Le menu `menu` reprend le choix gardé sous `id` (s'il existe encore), et garde chaque nouveau choix. */
export const remember = (id: string, menu: HTMLSelectElement): void => {
  const saved = rememberedChoice(id);
  if (saved !== undefined && [...menu.options].some((option) => option.value === saved)) menu.value = saved;
  menu.addEventListener('change', () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ ...read(), [id]: menu.value }));
    } catch {
      // stockage indisponible : le choix vaut pour cette session seulement
    }
  });
};
