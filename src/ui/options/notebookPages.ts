import { AVAILABLE_LOCALES, getLocale, localeName, messages, t, type Locale } from '../../i18n';
import type { DoodleKind } from './doodles';
import type { Writer } from './notebookInk';
import type { GameState } from '../../core/state';

/** Ce que les réglages du cahier déclenchent dans la partie. */
export interface NotebookActions {
  onLocale: (locale: Locale) => void;
  /** Un réglage a changé : il est enregistré tout de suite. */
  onSettings: () => void;
  onReset: () => void;
}

/**
 * Pages du cahier : 24 faces (1 à 24), plus la place 0 (l'intérieur de la couverture). Un cahier mince,
 * presque vide après les réglages ; la dernière page de gauche est la 24, en face du plat arrière.
 */
export const NOTEBOOK_PAGES = 25;

/** Ce qu'une page peut dessiner d'autre que l'écriture : les croquis, déjà tracés. */
export type Sketches = Record<DoodleKind, CanvasImageSource>;

/** Signes griffonnés en travers de la marge. */
const SCRIBBLES = ['410 ?', '?', '410'];
/** Remarques présentes à chaque ouverture (sur les 9 de notebook.notes). */
const NOTES_SHOWN = 6;

const shuffle = <T>(list: T[]): T[] => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};
const between = (low: number, high: number): number => low + Math.random() * (high - low);

/**
 * Ce qui est griffonné dans la marge, tiré à chaque ouverture du cahier (idée de l'auteur) : quelques
 * remarques et signes, sur des pages au hasard, jamais deux sur la même. On ne retrouve jamais le cahier
 * tout à fait comme on l'a laissé.
 */
const drawMargins = (): Map<number, { note?: number; scribble?: string; at: number }> => {
  const pages = shuffle(Array.from({ length: NOTEBOOK_PAGES - 1 }, (_, i) => i + 1));
  const notes = shuffle(Array.from({ length: messages().notebook.notes.length }, (_, i) => i)).slice(0, NOTES_SHOWN);
  const margins = new Map<number, { note?: number; scribble?: string; at: number }>();
  // Une remarque (jusqu'à 520 unités de long, centrée) tient dans la page entre 35 et 65 % de sa hauteur.
  notes.forEach((note, i) => margins.set(pages[i], { note, at: between(0.35, 0.65) }));
  SCRIBBLES.forEach((scribble, i) => margins.set(pages[notes.length + i], { scribble, at: between(0.15, 0.85) }));
  return margins;
};

/**
 * Le cahier d'options : ce que le chercheur a noté sur la première page, puis les réglages page après
 * page, ses croquis au dos des feuilles, et ses remarques dans la marge.
 */
export const createNotebookPages = (state: GameState, actions: NotebookActions) => {
  /** Effacer la sauvegarde : la question posée, puis la réponse (le temps que la page d'accueil se recharge). */
  let reset: 'ask' | 'confirm' | 'done' = 'ask';
  // Tirées une fois : la page redessinée (case cochée, langue) garde ses remarques.
  const margins = drawMargins();
  const setting = (key: 'autoTurn' | 'bookSway' | 'pageArrows' | 'showFps' | 'reduceBlur') => (): void => {
    state.settings[key] = !state.settings[key];
    actions.onSettings();
  };
  const toggle = (w: Writer, key: Parameters<typeof setting>[0]): void =>
    w.toggle(t(`ui.${key}`), t(`ui.${key}Hint`), state.settings[key], setting(key));

  const content: Record<number, (w: Writer, sketches: Sketches) => void> = {
    1: (w) => {
      w.title(t('ui.options'));
      w.heading(t('ui.language'));
      w.choices(
        AVAILABLE_LOCALES.map((locale) => ({
          label: localeName(locale),
          active: locale === getLocale(),
          act: () => actions.onLocale(locale),
        })),
      );
    },
    2: (w, sketches) => w.sketch(sketches.hexagon, 360, 380, 300),
    3: (w) => {
      w.heading(t('ui.reading'));
      toggle(w, 'autoTurn');
      toggle(w, 'bookSway');
      toggle(w, 'pageArrows');
    },
    4: (w, sketches) => w.sketch(sketches.books, 350, 470, 260),
    5: (w) => {
      w.heading(t('ui.display'));
      toggle(w, 'showFps');
      toggle(w, 'reduceBlur');
      w.skip(1);
      w.heading(t('ui.save'));
      if (reset === 'ask') w.link(t('ui.reset'), () => (reset = 'confirm'), true);
      else if (reset === 'done') w.note(t('notebook.resetDone'));
      else {
        w.note(t('ui.resetConfirm'));
        w.skip(1);
        w.link(
          t('ui.yes'),
          () => {
            reset = 'done';
            actions.onReset();
          },
          true,
        );
        w.link(t('ui.no'), () => (reset = 'ask'));
      }
    },
  };

  /** Écrit la page `index` (0 : l'intérieur de la couverture, jamais visible). */
  return (index: number, w: Writer, sketches: Sketches, spineOnLeft: boolean): void => {
    content[index]?.(w, sketches);
    // Il a numéroté les premières pages, puis a cessé.
    if (index >= 1 && index <= 5) w.folio(index, spineOnLeft);
    const margin = margins.get(index);
    if (margin?.note !== undefined) w.margin(messages().notebook.notes[margin.note], margin.at);
    if (margin?.scribble) w.scribble(margin.scribble, margin.at);
  };
};
