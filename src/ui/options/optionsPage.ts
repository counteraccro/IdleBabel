import '@fontsource/nothing-you-could-do/400.css';
import './options.css';
import { el, type Component } from '../dom';
import { t } from '../../i18n';
import { createLanguageSwitch } from '../languageSwitch';
import { createResetButton } from './resetButton';
import { createDoodle } from './doodles';
import { createSketchbook } from './sketchbook';
import { boardWear, paperWear, roughEdges } from './wear';
import type { Locale } from '../../i18n';
import type { GameState } from '../../core/state';

export interface OptionsHandlers {
  onLocale: (locale: Locale) => void;
  /** Un réglage a changé : il est enregistré tout de suite. */
  onSettings: () => void;
  onReset: () => void;
  onBack: () => void;
}

const createSection = (title: string, ...content: HTMLElement[]): HTMLElement => {
  const section = el('section', 'options-section');
  section.append(el('h2', undefined, title), ...content);
  return section;
};

const createToggle = (label: string, hint: string, checked: boolean, onChange: (value: boolean) => void): HTMLElement => {
  const root = el('label', 'option-toggle');
  const input = el('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  const text = el('span');
  text.append(el('span', 'option-label', label), el('small', 'option-hint', hint));
  root.append(input, text);
  return root;
};

/**
 * Bords élimés, les mêmes sur toutes les feuilles (le verso en reflet du recto : c'est la même
 * feuille) : les encoches tombent les unes sur les autres et laissent voir le carton, même quand
 * une page tourne au-dessus d'une autre.
 */
const TEAR_SEED = 1;

/** Une page du carnet : papier à petits carreaux, numéro griffonné en bas. */
const sheet = (number: number, ...content: HTMLElement[]): HTMLElement => {
  const page = el('div', 'sketchbook-page');
  page.style.clipPath = roughEdges(TEAR_SEED, 'left');
  // La plupart des pages ont gardé la trace d'une tasse posée dessus.
  page.append(paperWear(number, { coffee: number !== 3 }), ...content, el('span', 'sketchbook-folio', String(number)));
  return page;
};

/** Verso d'une page tournée : le papier, et ce que le chercheur y a griffonné. */
const verso = (seed: number, ...content: HTMLElement[]): HTMLElement => {
  const page = el('div', 'sketchbook-verso');
  page.style.clipPath = roughEdges(TEAR_SEED, 'right');
  page.append(paperWear(seed, { coffee: seed % 2 === 1 }), ...content);
  return page;
};

/** Couverture de carton, avec une étiquette collée où le chercheur a écrit le nom du carnet. */
const frontCover = (): HTMLElement => {
  const board = el('div', 'sketchbook-board');
  board.append(boardWear(1), el('span', 'sketchbook-label', t('ui.options')));
  return board;
};

/** Revers de la couverture, qu'on voit à gauche en ouvrant le carnet : le carton brut, aussi usé. */
const insideCover = (): HTMLElement => {
  const board = el('div', 'sketchbook-board sketchbook-inside');
  board.append(boardWear(3, { freeEdge: 'left' }));
  return board;
};

/** Dos du carnet : le carton nu, un croquis gratté dans un coin. */
const backCover = (): HTMLElement => {
  const board = el('div', 'sketchbook-board sketchbook-board-back');
  board.append(boardWear(2, { freeEdge: 'left' }), createDoodle('spiral', 11));
  return board;
};

/**
 * Page des options : le carnet de croquis que le chercheur a sur lui, griffonné de sa main.
 * On l'ouvre, on tourne ses pages, on peut le retourner ; d'autres pages pourront s'y ajouter.
 * Elle remplace l'écran de jeu, qui continue de tourner derrière.
 */
/** Changer de langue reconstruit la page : le carnet reste ouvert là où il était. */
let resumeAt: number | undefined;

export const createOptionsPage = (state: GameState, handlers: OptionsHandlers): Component => {
  // Reconstruite pour changer de langue : le carnet est déjà sorti, il ne remonte pas de la poche.
  const root = el('main', resumeAt === undefined ? 'options-page' : 'options-page resumed');
  const back = el('button', 'options-back', `← ${t('ui.back')}`);
  back.addEventListener('click', handlers.onBack);

  const pages = [
    sheet(
      1,
      el('h1', undefined, t('ui.options')),
      createSection(
        t('ui.language'),
        createLanguageSwitch((locale) => {
          resumeAt = book.position();
          handlers.onLocale(locale);
        }),
      ),
    ),
    sheet(
      2,
      createSection(
        t('ui.reading'),
        createToggle(t('ui.autoTurn'), t('ui.autoTurnHint'), state.settings.autoTurn, (value) => {
          state.settings.autoTurn = value;
          handlers.onSettings();
        }),
        createToggle(t('ui.bookSway'), t('ui.bookSwayHint'), state.settings.bookSway, (value) => {
          state.settings.bookSway = value;
          handlers.onSettings();
        }),
        createToggle(t('ui.pageArrows'), t('ui.pageArrowsHint'), state.settings.pageArrows, (value) => {
          state.settings.pageArrows = value;
          handlers.onSettings();
        }),
      ),
    ),
    sheet(
      3,
      createSection(
        t('ui.display'),
        createToggle(t('ui.showFps'), t('ui.showFpsHint'), state.settings.showFps, (value) => {
          state.settings.showFps = value;
          handlers.onSettings();
        }),
        createToggle(t('ui.reduceBlur'), t('ui.reduceBlurHint'), state.settings.reduceBlur, (value) => {
          state.settings.reduceBlur = value;
          handlers.onSettings();
        }),
      ),
      createSection(t('ui.save'), createResetButton(handlers.onReset)),
    ),
  ];
  // Versos des pages tournées : les croquis du chercheur (et, plus tard, peut-être des secrets).
  // Graines fixes : la page reconstruite (changement de langue) garde exactement les mêmes taches.
  const versos = [verso(50, createDoodle('hexagon', 7)), verso(51, createDoodle('books', 3)), verso(52)];

  const book = createSketchbook({ front: frontCover(), inside: insideCover(), back: backCover(), pages, versos, start: resumeAt });
  resumeAt = undefined;
  root.append(back, book.root);
  return { root, update: () => {} };
};
