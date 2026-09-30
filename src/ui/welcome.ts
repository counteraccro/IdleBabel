import { el } from './dom';
import { openModal } from './modal/modal';
import { PARAGRAPH_MS, storyLines } from './lore';
import { getLocale, messages, t, type Locale } from '../i18n';

/** Assez pour un prénom et un nom, pas plus : il doit tenir sur l'étiquette du cahier. */
export const PLAYER_NAME_MAX = 24;

/**
 * Le réveil, au début d'une partie : un court récit (lore.awakening) qui se termine sur la question du
 * nom. Obligatoire : rien ne se joue avant d'être entré. La langue est celle du navigateur (changée
 * ensuite dans les options).
 */
export const showWelcome = (onEnter: (name: string, locale: Locale) => void): void => {
  const awakening = messages().lore.awakening;
  const story = storyLines(awakening.text.length);
  story.lines.forEach((line, index) => (line.textContent = awakening.text[index]));
  const field = el('label', 'modal-field');
  const caption = el('span', undefined, t('lore.awakening.name'));
  const input = el('input');
  input.maxLength = PLAYER_NAME_MAX;
  input.autocomplete = 'off';
  input.spellcheck = false;
  field.append(caption, input);
  const name = (): string => input.value.trim();

  const modal = openModal({
    title: awakening.title,
    body: [story.root, field],
    // Rien n'a encore commencé : le noir.
    backdrop: 'black',
    actions: [{ label: t('lore.awakening.enter'), kind: 'primary', onClick: () => onEnter(name(), getLocale()) }],
  });
  const [enter] = modal.buttons;
  // Le nom et le bouton attendent la fin du récit.
  const told = `${story.lines.length * PARAGRAPH_MS}ms`;
  field.style.animationDelay = told;
  modal.root.querySelector<HTMLElement>('.modal-actions')!.style.animationDelay = told;
  setTimeout(() => input.focus(), story.lines.length * PARAGRAPH_MS);
  input.addEventListener('input', () => (enter.disabled = name() === ''));
  enter.disabled = true;
};
