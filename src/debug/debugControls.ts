import { el } from '../ui/dom';

/**
 * Briques de la barre de débogage : une ligne « libellé — contrôle aligné à droite », l'aide en
 * infobulle sur le libellé, ouverture des fiches mémorisée.
 */

const OPEN_KEY = 'idle-babel-debug-open';

const readOpen = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(OPEN_KEY) ?? '{}') as Record<string, boolean>;
  } catch {
    return {};
  }
};

/** Mémorise si un élément (fiche ou barre entière) est ouvert. */
export const rememberOpen = (key: string, open: boolean): void => {
  try {
    localStorage.setItem(OPEN_KEY, JSON.stringify({ ...readOpen(), [key]: open }));
  } catch {
    // stockage indisponible : l'élément reprendra son état par défaut au prochain chargement
  }
};

export const wasOpen = (key: string, fallback = true): boolean => readOpen()[key] ?? fallback;

/** Ligne : libellé (plus pâle quand on ne fait que lire), contrôle à droite, aide au survol du libellé. */
export const row = (label: string, control: HTMLElement, hint?: string, readOnly = false): HTMLElement => {
  // Un bloc, pas un <label> : cliquer le libellé d'une ligne de boutons en déclencherait le premier.
  const root = el('div', 'debug-row');
  const name = el('span', readOnly ? 'debug-label read' : 'debug-label', label);
  if (hint) name.dataset.hint = hint;
  root.append(name, control);
  return root;
};

/** Interrupteur (case à cocher habillée). */
export const toggle = (onChange: (checked: boolean) => void): { root: HTMLElement; input: HTMLInputElement } => {
  const input = el('input');
  input.type = 'checkbox';
  input.addEventListener('change', () => onChange(input.checked));
  const root = el('label', 'debug-switch');
  root.append(input, el('span'));
  return { root, input };
};

/** Nombre entier, affiché avec ses espaces (1 000 000), jamais sous 0 ni au-dessus de `max`. */
export const clampCount = (value: number, max?: number): number => Math.min(Math.max(0, Math.floor(value)), max ?? Infinity);

export const showCount = (value: number, decimal = false): string =>
  decimal ? value.toLocaleString('fr-FR', { maximumFractionDigits: 2 }) : Math.floor(value).toLocaleString('fr-FR');

/** Valeur saisie : chiffres seulement, ou avec une virgule (ou un point) si `decimal`. */
const parseCount = (text: string, decimal: boolean): number =>
  decimal ? Math.max(0, Number(text.replace(/[^\d,.]/g, '').replace(',', '.')) || 0) : Number(text.replace(/\D/g, '')) || 0;

export const numberInput = (onChange: (value: number) => void, max?: number, decimal = false): HTMLInputElement => {
  const input = el('input', 'debug-field');
  input.inputMode = decimal ? 'decimal' : 'numeric';
  input.addEventListener('change', () => {
    const value = parseCount(input.value, decimal);
    onChange(decimal ? Math.min(value, max ?? Infinity) : clampCount(value, max));
  });
  return input;
};

/** Petits boutons collés les uns aux autres (préréglages). */
export const chips = (items: [string, () => void][]): HTMLElement => {
  const root = el('div', 'debug-chips');
  for (const [text, action] of items) {
    const button = el('button', undefined, text);
    button.addEventListener('click', action);
    root.append(button);
  }
  return root;
};

/** −10 −1 [champ] +1 +10. */
export const stepper = (input: HTMLInputElement, step: (delta: number) => void): HTMLElement => {
  const root = el('div', 'debug-stepper');
  const button = (delta: number): HTMLElement => {
    const node = el('button', undefined, delta > 0 ? `+${delta}` : `−${-delta}`);
    node.addEventListener('click', () => step(delta));
    return node;
  };
  root.append(button(-10), button(-1), input, button(1), button(10));
  return root;
};

/** Préréglage court : 0, 100, 1k, 10k, 1M. */
export const shortCount = (value: number): string => {
  if (value >= 1_000_000) return `${value / 1_000_000}M`;
  if (value >= 1_000) return `${value / 1_000}k`;
  return String(value);
};
