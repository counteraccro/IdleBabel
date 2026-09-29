import { el } from './dom';
import { openModal } from './modal/modal';
import { messages, t } from '../i18n';
import { loreRead, onLore } from '../systems/lore';
import type { GameState } from '../core/state';

/** Écart entre deux paragraphes qui apparaissent (voir .modal-story dans modal.css). */
const PARAGRAPH_MS = 1600;

/**
 * Raconte les moments de lore en attente (systems/lore.ts), un à la fois : le récit flotte sur le décor
 * assombri, ses paragraphes apparaissent l'un après l'autre, puis « Continuer ». Rien ne se raconte
 * avant que le joueur ne se soit présenté (accueil). Renvoie de quoi relancer le récit (accueil fermé).
 */
export const mountLore = (state: GameState): (() => void) => {
  let telling = false;
  const next = (): void => {
    const id = state.lorePending[0];
    if (telling || !id || !state.playerName) return;
    const story = (messages().lore as unknown as Record<string, { title: string; text: string[] } | undefined>)[id];
    // Un moment sans texte (retiré depuis) : oublié.
    if (!story) {
      loreRead(state, id);
      return next();
    }
    telling = true;
    const text = el('div', 'modal-story');
    story.text.forEach((paragraph, index) => {
      const line = el('p', undefined, paragraph.replaceAll('{name}', state.playerName));
      line.style.animationDelay = `${index * PARAGRAPH_MS}ms`;
      text.append(line);
    });
    const modal = openModal({
      title: story.title.replaceAll('{name}', state.playerName),
      bare: true,
      body: [text],
      actions: [{ label: t('lore.continue'), kind: 'primary' }],
      onClose: () => {
        loreRead(state, id);
        telling = false;
        next();
      },
    });
    modal.root.querySelector<HTMLElement>('.modal-actions')!.style.animationDelay = `${story.text.length * PARAGRAPH_MS}ms`;
  };
  onLore(next);
  next();
  return next;
};
