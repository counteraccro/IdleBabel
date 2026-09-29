import { el } from './dom';
import { openModal } from './modal/modal';
import { AVAILABLE_LOCALES, getLocale, localeName, setLocale, t, type Locale } from '../i18n';

/** Assez pour un prénom et un nom, pas plus : il doit tenir sur l'étiquette du cahier. */
export const PLAYER_NAME_MAX = 24;

/**
 * Modale d'arrivée, au début d'une partie : le nom du joueur et sa langue. Obligatoire : rien ne se
 * joue avant d'être entré. Changer de langue la réécrit aussitôt.
 */
export const showWelcome = (onEnter: (name: string, locale: Locale) => void): void => {
  const field = el('label', 'modal-field');
  const caption = el('span');
  const input = el('input');
  input.maxLength = PLAYER_NAME_MAX;
  input.autocomplete = 'off';
  input.spellcheck = false;
  field.append(caption, input);
  const languages = el('div', 'modal-choices');
  const name = (): string => input.value.trim();

  const modal = openModal({
    title: t('ui.welcomeTitle'),
    body: [field, languages],
    // La petite configuration avant de lancer le jeu : rien derrière.
    backdrop: 'black',
    bare: true,
    actions: [{ label: t('ui.enter'), kind: 'primary', onClick: () => onEnter(name(), getLocale()) }],
  });
  const [enter] = modal.buttons;

  const write = (): void => {
    modal.title.textContent = t('ui.welcomeTitle');
    caption.textContent = t('ui.playerName');
    enter.textContent = t('ui.enter');
    languages.replaceChildren(
      ...AVAILABLE_LOCALES.map((locale) => {
        const button = el('button', locale === getLocale() ? 'active' : undefined, localeName(locale));
        button.type = 'button';
        button.setAttribute('aria-pressed', String(locale === getLocale()));
        button.addEventListener('click', () => {
          setLocale(locale);
          document.documentElement.lang = locale;
          write();
        });
        return button;
      }),
    );
  };
  input.addEventListener('input', () => (enter.disabled = name() === ''));
  write();
  enter.disabled = true;
  input.focus();
};
