import './options.css';
import { el, type Component } from '../dom';
import { t } from '../../i18n';
import { createLanguageSwitch } from '../languageSwitch';
import { createResetButton } from './resetButton';
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

/** Page des options : elle remplace l'écran de jeu, qui continue de tourner derrière. */
export const createOptionsPage = (state: GameState, handlers: OptionsHandlers): Component => {
  const root = el('main', 'options-page');
  const back = el('button', 'options-back', `← ${t('ui.back')}`);
  back.addEventListener('click', handlers.onBack);

  root.append(
    back,
    el('h1', undefined, t('ui.options')),
    createSection(t('ui.language'), createLanguageSwitch(handlers.onLocale)),
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
    ),
    createSection(
      t('ui.display'),
      createToggle(t('ui.showFps'), t('ui.showFpsHint'), state.settings.showFps, (value) => {
        state.settings.showFps = value;
        handlers.onSettings();
      }),
    ),
    createSection(t('ui.save'), createResetButton(handlers.onReset)),
  );
  return { root, update: () => {} };
};
