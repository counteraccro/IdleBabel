import { getLocale, t } from '../../i18n';
import { catalogMods } from '../../mods/catalog';
import { modText } from '../../mods/modSeals';
import { modOptionValues, setModOption, type ModWithOptions } from '../../mods/modOptions';
import { saveGame } from '../../core/save';
import type { Writer } from './notebookInk';
import type { GameState } from '../../core/state';

/**
 * La page d'un mod qui a des options (maquette .ai/maquette-better-babel.html, validée le 15/10) : son nom, sa version
 * au crayon, puis chaque option dans l'ordre déclaré, un choix entouré ou une case. Une option qui dépend d'une case
 * décochée est grisée.
 */
export const writeModOptionsPage = (w: Writer, state: GameState, mod: ModWithOptions): void => {
  const locale = getLocale();
  const listed = catalogMods().find((other) => other.id === mod.id);
  w.heading(listed ? modText(listed.name, locale) : mod.id);
  const version = mod.version ?? listed?.version;
  const signed = [version && t('ui.mods.version').replace('{v}', version), listed?.author].filter(Boolean).join(' · ');
  if (signed) w.note(signed);
  w.skip(1);
  const values = modOptionValues(state, mod.id);
  const set = (id: string, value: string | boolean) => (): void => {
    setModOption(state, mod.id, id, value);
    saveGame(state);
  };
  for (const option of mod.options) {
    const write = (): void => {
      if (option.choices) {
        w.note(modText(option.name, locale));
        w.choices(
          option.choices.map((choice) => ({
            label: modText(choice.name, locale),
            active: values[option.id] === choice.id,
            act: set(option.id, choice.id),
          })),
        );
      } else
        w.toggle(
          modText(option.name, locale),
          option.hint ? modText(option.hint, locale) : '',
          values[option.id] === true,
          set(option.id, !values[option.id]),
        );
    };
    if (option.needs && values[option.needs] === false) w.faded(write);
    else write();
  }
};
