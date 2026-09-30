import { el } from '../../ui/dom';
import { buttons, check, numberInput, row } from '../debugControls';
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
}

export const CHAPTERS = [
  { id: 'resources', title: 'Ressources' },
  { id: 'methods', title: 'Méthodes' },
  { id: 'sentences', title: 'Phrases' },
  { id: 'books', title: 'Livres' },
  { id: 'lore', title: 'Lore' },
  { id: 'seals', title: 'Sceaux' },
  { id: 'display', title: 'Affichage' },
] as const;

export type ChapterId = (typeof CHAPTERS)[number]['id'];

export const subjectName = (subject: DebugSubject): string => (typeof subject.name === 'string' ? subject.name : subject.name());

type Buttons = [string, () => void][];

/** De quoi remplir une fiche : chaque ligne suit la partie (relue par update, toutes les 250 ms). */
export interface CardKit {
  /** Une valeur en lecture seule. */
  info: (label: string, read: () => string) => void;
  /** Un nombre à changer à la main (recopié de la partie, sauf pendant qu'on le modifie). */
  number: (label: string, read: () => number, write: (value: number) => void, hint?: string, max?: number) => void;
  buttons: (label: string, items: Buttons, hint?: string) => void;
  check: (label: string, hint: string, read: () => boolean, write: (on: boolean) => void) => void;
  /** Un élément à soi (menu déroulant, compteur d'images…). */
  custom: (node: HTMLElement) => void;
}

/** Une fiche vide et ce qui la remplit ; `update` relit la partie. */
export const createKit = (): { rows: HTMLElement; kit: CardKit; update: () => void } => {
  const rows = el('div', 'debug-card-rows');
  const updaters: (() => void)[] = [];
  const kit: CardKit = {
    info: (label, read) => {
      const value = el('span', 'debug-value');
      rows.append(row(label, value));
      updaters.push(() => {
        const text = read();
        if (value.textContent !== text) value.textContent = text;
      });
    },
    number: (label, read, write, hint, max) => {
      const input = numberInput(write, max);
      rows.append(row(label, input, hint));
      updaters.push(() => {
        if (document.activeElement !== input) input.value = String(Math.floor(read()));
      });
    },
    buttons: (label, items, hint) => {
      rows.append(row(label, buttons(...items), hint));
    },
    check: (label, hint, read, write) => {
      const box = check(label, hint, write);
      rows.append(box.root);
      updaters.push(() => (box.input.checked = read()));
    },
    custom: (node) => rows.append(node),
  };
  return { rows, kit, update: () => updaters.forEach((update) => update()) };
};

/** Nombres lisibles : 1 234 567, et au plus deux décimales. */
export const format = (value: number): string => value.toLocaleString('fr-FR', { maximumFractionDigits: 2 });

/** Durée courte : 42 s, 3 min 20 s, 2 h 05. */
export const duration = (seconds: number): string => {
  if (!Number.isFinite(seconds)) return '—';
  const s = Math.ceil(seconds);
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
  return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
};
