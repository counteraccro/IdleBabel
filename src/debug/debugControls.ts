import { el } from '../ui/dom';

/** Briques du panneau de débogage : sections repliables, lignes « libellé — contrôle — aide ». */

const OPEN_KEY = 'idle-babel-debug-open';

const readOpen = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
};

/** Mémorise si un élément (section ou panneau entier) est ouvert. */
export const rememberOpen = (key: string, open: boolean): void => {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify({ ...readOpen(), [key]: open }));
  } catch {
    // stockage indisponible : l'élément reprendra son état par défaut au prochain chargement
  }
};

export const wasOpen = (key: string, fallback = true): boolean => readOpen()[key] ?? fallback;

/** Section repliable ; ouverte ou fermée comme la dernière fois (mémorisé dans ce navigateur). */
export const section = (title: string, ...rows: HTMLElement[]): HTMLElement => {
  const details = el('details', 'debug-section');
  details.open = wasOpen(title);
  details.addEventListener('toggle', () => rememberOpen(title, details.open));
  details.append(el('summary', undefined, title), ...rows);
  return details;
};

/** Ligne : libellé, contrôle, et une courte aide en dessous. */
export const row = (label: string, control: HTMLElement, hint?: string): HTMLElement => {
  // Un bloc, pas un <label> : cliquer le libellé d'une ligne de boutons en déclencherait le premier.
  const root = el('div', 'debug-row');
  root.append(el('span', 'debug-label', label), control);
  if (hint) root.append(el('small', 'debug-hint', hint));
  return root;
};

/** Case à cocher : la case d'abord, puis son libellé. */
export const check = (
  label: string,
  hint: string,
  onChange: (checked: boolean) => void,
): { root: HTMLElement; input: HTMLInputElement } => {
  const input = el('input');
  input.type = 'checkbox';
  input.addEventListener('change', () => onChange(input.checked));
  const root = el('label', 'debug-row debug-check');
  root.append(input, el('span', 'debug-label', label), el('small', 'debug-hint', hint));
  return { root, input };
};

export const numberInput = (onChange: (value: number) => void, max?: number): HTMLInputElement => {
  const input = el('input');
  input.type = 'number';
  input.min = '0';
  if (max !== undefined) input.max = String(max);
  input.addEventListener('change', () => onChange(Math.max(0, Math.floor(Number(input.value) || 0))));
  return input;
};

export const buttons = (...items: [string, () => void][]): HTMLElement => {
  const root = el('div', 'debug-buttons');
  for (const [text, action] of items) {
    const button = el('button', undefined, text);
    button.addEventListener('click', action);
    root.append(button);
  }
  return root;
};
