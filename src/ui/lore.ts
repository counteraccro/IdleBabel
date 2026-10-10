import { el } from './dom';
import { openModal } from './modal/modal';
import { messages, t } from '../i18n';
import { loreRead, onLore } from '../systems/lore';
import { awayNoticeOpen } from './awayNotice/awayNotice';
import { updateNoticeOpen } from './updateNotice/updateNotice';
import { LORE_BACKDROP, type LoreId } from '../data/lore';
import type { GameState } from '../core/state';

/** Écart entre deux paragraphes qui apparaissent (voir .modal-story dans modal.css). */
export const PARAGRAPH_MS = 1200;

/**
 * Un récit dont les paragraphes apparaissent l'un après l'autre (textes à remplir, réécrits sans relancer
 * l'apparition).
 */
export const storyLines = (count: number): { root: HTMLElement; lines: HTMLElement[] } => {
  const root = el('div', 'modal-story');
  const lines = Array.from({ length: count }, (_, index) => {
    const line = el('p');
    line.style.animationDelay = `${index * PARAGRAPH_MS}ms`;
    return line;
  });
  root.append(...lines);
  return { root, lines };
};

/** Où mène un moment une fois lu (adresse de l'écran à ouvrir, voir ui/app.ts). */
const LEADS_TO: Partial<Record<LoreId, string>> = { lookAround: '#blanc', strangeBook: '#livre' };

/** Le temps que l'écran suivant se construise (livre 3D) sous le voile noir, avant qu'il se lève. */
const VEIL_HOLD_MS = 250;
/** Durée du lever du voile (voir .modal-veil dans modal.css). */
const VEIL_LIFT_MS = 800;

/**
 * Change d'écran derrière un voile noir qui se lève ensuite : sans lui, on verrait le jeu entre deux
 * modales, puis l'écran suivant se construire.
 */
export const goThroughTheDark = (hash: string): void => {
  const veil = el('div', 'modal-veil');
  document.body.append(veil);
  window.location.hash = hash;
  // Levé au bout d'un temps, sans attendre l'arrivée sur l'écran ni la fin de la transition : si l'une
  // ou l'autre ne vient pas (déjà sur cette adresse, transitions coupées), le voile ne reste pas.
  setTimeout(() => veil.classList.add('lifting'), VEIL_HOLD_MS);
  setTimeout(() => veil.remove(), VEIL_HOLD_MS + VEIL_LIFT_MS);
};

/**
 * Raconte les moments de lore en attente (systems/lore.ts), un à la fois : le récit flotte sur le décor
 * assombri, ses paragraphes apparaissent l'un après l'autre, puis « Continuer » (ou le bouton propre au
 * moment, lore.<id>.button). Rien ne se raconte
 * avant que le joueur ne se soit présenté (accueil). Renvoie de quoi relancer le récit (accueil fermé).
 */
export const mountLore = (state: GameState): (() => void) => {
  let telling = false;
  const next = (): void => {
    const id = state.lorePending[0];
    if (telling || !id || !state.playerName || awayNoticeOpen() || updateNoticeOpen()) return;
    const story = (messages().lore as unknown as Record<string, { title: string; text: string[]; button?: string } | undefined>)[id];
    // Un moment sans texte (retiré depuis) : oublié.
    if (!story) {
      loreRead(state, id);
      return next();
    }
    telling = true;
    const text = storyLines(story.text.length);
    text.lines.forEach((line, index) => (line.textContent = story.text[index].replaceAll('{name}', state.playerName)));
    const modal = openModal({
      title: story.title.replaceAll('{name}', state.playerName),
      body: [text.root],
      backdrop: LORE_BACKDROP[id as LoreId] ?? 'dim',
      actions: [{ label: story.button ?? t('lore.continue'), kind: 'primary' }],
      onClose: () => {
        loreRead(state, id);
        telling = false;
        const leadsTo = LEADS_TO[id as LoreId];
        if (leadsTo) goThroughTheDark(leadsTo);
        next();
      },
    });
    modal.root.querySelector<HTMLElement>('.modal-actions')!.style.animationDelay = `${story.text.length * PARAGRAPH_MS}ms`;
  };
  onLore(next);
  next();
  return next;
};
