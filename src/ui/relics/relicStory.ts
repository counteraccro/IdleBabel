import { messages, t } from '../../i18n';
import { openModal } from '../modal/modal';
import { PARAGRAPH_MS, storyLines } from '../lore';
import { RELICS } from '../../data/relics';

/**
 * Le récit d'une relique, relu sur son sceau du Grand Livre (validé le 11/10 : le récit complet à la trouvaille, une
 * fois, puis relu sur le sceau). Le même que le moment de lore (ui/lore.ts), sans rien changer à la partie.
 */
export const retellRelic = (seal: string): boolean => {
  const relic = RELICS.find((candidate) => candidate.seal === seal);
  const story = relic && (messages().lore as unknown as Record<string, { title: string; text: string[] } | undefined>)[relic.lore];
  if (!story) return false;
  const text = storyLines(story.text.length);
  text.lines.forEach((line, index) => (line.textContent = story.text[index]));
  const modal = openModal({
    title: story.title,
    body: [text.root],
    dismissible: true,
    actions: [{ label: t('lore.continue'), kind: 'primary' }],
  });
  modal.root.querySelector<HTMLElement>('.modal-actions')!.style.animationDelay = `${story.text.length * PARAGRAPH_MS}ms`;
  return true;
};
