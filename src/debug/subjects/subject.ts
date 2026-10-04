import { el } from '../../ui/dom';
import { currentNotation, formatNumber } from '../../core/format';
import { chips, clampCount, numberInput, row, shortCount, showCount, stepper, toggle } from '../debugControls';
import type { GameState } from '../../core/state';

/**
 * Un sujet du livre de débogage : une chose du jeu (une méthode, une phrase, un livre, un moment de
 * lore…). Choisi dans le livre, il apparaît dans la barre de débogage avec tout ce qu'on sait de lui et
 * ce qu'on peut y changer. Outil de développement : textes en français, hors du système de traduction.
 */
export interface DebugSubject {
  id: string;
  chapter: ChapterId;
  /** Nom dans le livre et en tête de sa fiche ; une fonction quand il vient des traductions du jeu. */
  name: string | (() => string);
  /** Ce qu'on y trouve, en quelques mots (dans le livre). */
  description: string;
  /** Remplit sa fiche dans la barre. */
  build: (kit: CardKit, state: GameState) => void;
  /** Ce qu'on lit en tête de la fiche repliée (« 1 M · 0/s »). */
  peek?: (state: GameState) => string;
}

export const CHAPTERS = [
  { id: 'resources', title: 'Ressources' },
  { id: 'methods', title: 'Méthodes' },
  { id: 'intuitions', title: 'Intuitions' },
  { id: 'sentences', title: 'Phrases' },
  { id: 'books', title: 'Livres' },
  { id: 'lore', title: 'Lore' },
  { id: 'seals', title: 'Sceaux' },
  { id: 'display', title: 'Affichage' },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]['id'];

export const subjectName = (subject: DebugSubject): string => (typeof subject.name === 'string' ? subject.name : subject.name());

/** Une action en bas de fiche ; `danger` la met à part, en rouge, `title` l'explique au survol. */
export type Action = [string, () => void, { danger?: boolean; title?: string }?];

export interface NumberOptions {
  /** Aide, au survol du libellé. */
  hint?: string;
  max?: number;
  /** Ajoute −10 −1 et +1 +10 autour du champ. */
  steps?: boolean;
  /** Ce que font ces boutons, quand ce n'est pas simplement écrire la nouvelle valeur. */
  step?: (delta: number) => void;
  /** Accepte les décimales (0,5) au lieu de les arrondir à l'entier. */
  decimal?: boolean;
}

/**
 * De quoi remplir une fiche : les réglages, puis ce qu'on lit (séparés d'un filet), puis les actions,
 * toujours en bas. Chaque ligne suit la partie (relue par update, toutes les 250 ms).
 */
export interface CardKit {
  /** Une valeur en lecture seule. */
  info: (label: string, read: () => string, hint?: string) => void;
  /** Des cases pleines ou vides : morceaux écrits d'une phrase… */
  progress: (label: string, read: () => [done: number, total: number], hint?: string) => void;
  /** Un nombre à changer à la main (recopié de la partie, sauf pendant qu'on le modifie). */
  number: (label: string, read: () => number, write: (value: number) => void, options?: NumberOptions) => void;
  /** Des valeurs toutes prêtes : 0, 100, 1k… */
  presets: (label: string, values: number[], apply: (value: number) => void, hint?: string) => void;
  check: (label: string, hint: string, read: () => boolean, write: (on: boolean) => void) => void;
  /** Un réglage à soi (menu déroulant…), aligné comme les autres. */
  row: (label: string, control: HTMLElement, hint?: string) => void;
  /** Un élément sur toute la largeur (liste de morceaux…). */
  custom: (node: HTMLElement) => void;
  actions: (...items: Action[]) => void;
}

/** Au-delà, les cases deviennent un simple « 7 / 12 ». */
const MAX_PIECES = 12;

/** Une fiche vide et ce qui la remplit ; `update` relit la partie. */
export const createKit = (): { rows: HTMLElement; kit: CardKit; update: () => void } => {
  const body = el('div', 'debug-card-rows');
  const list = el('div', 'debug-list');
  const bar = el('div', 'debug-actions');
  body.append(list);
  const updaters: (() => void)[] = [];
  // Un filet quand on passe des réglages à ce qu'on lit.
  let editing = false;
  const add = (node: HTMLElement, editable: boolean): void => {
    if (editing && !editable) list.append(el('div', 'debug-sep'));
    editing = editable;
    list.append(node);
  };
  const kit: CardKit = {
    info: (label, read, hint) => {
      const value = el('span', 'debug-value');
      add(row(label, value, hint, true), false);
      updaters.push(() => {
        const text = read();
        if (value.textContent !== text) value.textContent = text;
      });
    },
    progress: (label, read, hint) => {
      const value = el('span', 'debug-pieces');
      add(row(label, value, hint, true), false);
      let shown = '';
      updaters.push(() => {
        const [done, total] = read();
        if (`${done}/${total}` === shown) return;
        shown = `${done}/${total}`;
        value.title = `${done} / ${total}`;
        if (total > MAX_PIECES) value.textContent = `${done} / ${total}`;
        else value.replaceChildren(...Array.from({ length: total }, (_, index) => el('i', index < done ? 'done' : undefined)));
      });
    },
    number: (label, read, write, { hint, max, steps, step, decimal } = {}) => {
      const input = numberInput(write, max, decimal);
      const control = steps ? stepper(input, step ?? ((delta) => write(clampCount(read() + delta, max)))) : input;
      add(row(label, control, hint), true);
      updaters.push(() => {
        if (document.activeElement !== input) input.value = showCount(read(), decimal);
      });
    },
    presets: (label, values, apply, hint) => {
      add(row(label, chips(values.map((value) => [shortCount(value), () => apply(value)])), hint), true);
    },
    check: (label, hint, read, write) => {
      const box = toggle(write);
      add(row(label, box.root, hint), true);
      updaters.push(() => (box.input.checked = read()));
    },
    row: (label, control, hint) => add(row(label, control, hint), true),
    custom: (node) => add(node, true),
    actions: (...items) => {
      for (const [text, action, { danger, title } = {}] of items) {
        const button = el('button', danger ? 'danger' : undefined, text);
        if (title) button.title = title;
        button.addEventListener('click', action);
        bar.append(button);
      }
      body.append(bar);
    },
  };
  return { rows: body, kit, update: () => updaters.forEach((update) => update()) };
};

/** Nombres lisibles : 1 234 567 (ou la notation choisie dans les options), au plus deux décimales. */
export const format = (value: number): string =>
  value >= 1_000 ? formatNumber(value, 'fr') : value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

/** Durée courte : 42 s, 3 min 20 s, 2 h 05. */
export const duration = (seconds: number): string => {
  if (!Number.isFinite(seconds)) return '—';
  const s = Math.ceil(seconds);
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
  return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
};

/** Nombre court pour une fiche repliée : 950, 12 k, 1,2 M (ou la notation choisie, sauf l'entière). */
export const compact = (value: number): string =>
  currentNotation() === 'full'
    ? value.toLocaleString('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })
    : formatNumber(value, 'fr');
