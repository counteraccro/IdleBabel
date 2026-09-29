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

/** Annotations étranges dans la marge : page, rang de la remarque (notebook.notes), hauteur. */
const MARGIN_NOTES: [page: number, note: number, at: number][] = [
  [3, 0, 0.3],
  [2, 1, 0.55],
  [4, 2, 0.6],
  [5, 3, 0.75],
  [6, 4, 0.5],
  [8, 5, 0.35],
  [13, 6, 0.6],
  [17, 7, 0.45],
  [22, 8, 0.5],
];
/** Signes griffonnés en travers de la marge. */
const SCRIBBLES: [page: number, text: string, at: number][] = [
  [1, '410 ?', 0.82],
  [5, '?', 0.3],
  [11, '410', 0.2],
];

/**
 * Le cahier d'options : ce que le chercheur a noté sur la première page, puis les réglages page après
 * page, ses croquis au dos des feuilles, et ses remarques dans la marge.
 */
export const createNotebookPages = (state: GameState, actions: NotebookActions) => {
  /** Effacer la sauvegarde : la question posée, puis la réponse. */
  let reset: 'ask' | 'confirm' | 'done' = 'ask';
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
      w.choices(AVAILABLE_LOCALES.map((locale) => ({ label: localeName(locale), active: locale === getLocale(), act: () => actions.onLocale(locale) })));
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
        w.link(t('ui.yes'), () => {
          reset = 'done';
          actions.onReset();
        }, true);
        w.link(t('ui.no'), () => (reset = 'ask'));
      }
    },
  };

  /** Écrit la page `index` (0 : l'intérieur de la couverture, jamais visible). */
  return (index: number, w: Writer, sketches: Sketches, spineOnLeft: boolean): void => {
    content[index]?.(w, sketches);
    // Il a numéroté les premières pages, puis a cessé.
    if (index >= 1 && index <= 5) w.folio(index, spineOnLeft);
    const notes = messages().notebook.notes;
    for (const [page, note, at] of MARGIN_NOTES) if (page === index) w.margin(notes[note], at);
    for (const [page, text, at] of SCRIBBLES) if (page === index) w.scribble(text, at);
  };
};
