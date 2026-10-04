import './awayNotice.css';
import { el } from '../dom';
import { openModal, modalOpen } from '../modal/modal';
import { onResume } from '../animationClock';
import { PARAGRAPH_MS, storyLines } from '../lore';
import { getLocale, messages, t } from '../../i18n';
import { formatNumber, writeDigits } from '../../core/format';
import { onLongAbsence, type AwayReport } from '../../core/absence';
import { nudgeLore } from '../../systems/lore';
import { MAX_AWAY_SECONDS } from '../../data/knowledge';
import type { GameState } from '../../core/state';

/** Ce que l'absence a rapporté, dans cet ordre (lore.away.<clé>), ce qui vaut zéro en moins. */
const TALLY = ['pages', 'books', 'finds', 'rareBooks', 'seals'] as const;

let showing = false;
/** Le récit du retour est à l'écran : les autres récits attendent qu'il se ferme (ui/lore.ts). */
export const awayNoticeOpen = (): boolean => showing;

/** Durée de l'absence : « 2 h 05 min », ou « 12 min ». */
const duration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const text = hours > 0 ? `${hours} h ${String(minutes % 60).padStart(2, '0')} min` : `${minutes} min`;
  return writeDigits(text);
};

const tally = (report: AwayReport): HTMLElement => {
  const root = el('div', 'away-tally');
  root.append(el('h3', '', t('lore.away.while').replace('{time}', duration(report.seconds))));
  const list = el('dl');
  for (const key of TALLY) {
    if (report[key] <= 0) continue;
    list.append(el('dt', '', t(`lore.away.${key}`)), el('dd', '', formatNumber(Math.floor(report[key]), getLocale())));
  }
  root.append(list);
  if (report.seconds > MAX_AWAY_SECONDS) root.append(el('p', '', t('lore.away.capped')));
  return root;
};

const show = (report: AwayReport): void => {
  showing = true;
  const text = messages().lore.away.text;
  const story = storyLines(text.length);
  story.lines.forEach((line, index) => (line.textContent = text[index]));
  const details = tally(report);
  details.style.animationDelay = `${text.length * PARAGRAPH_MS}ms`;
  const modal = openModal({
    title: t('lore.away.title'),
    body: [story.root, details],
    actions: [{ label: t('lore.away.button'), kind: 'primary' }],
    onClose: () => {
      showing = false;
      nudgeLore();
    },
  });
  modal.root.querySelector<HTMLElement>('.modal-actions')!.style.animationDelay = `${(text.length + 0.5) * PARAGRAPH_MS}ms`;
};

/**
 * Au retour d'une longue absence (jeu fermé, onglet caché : core/absence.ts), le chercheur croit sortir
 * d'un rêve ; sous le récit, ce que la lecture a rapporté sans lui. Une autre modale à l'écran : il attend
 * qu'elle se ferme. Rien avant que le joueur ne se soit présenté.
 */
export const mountAwayNotice = (state: GameState): void => {
  let waiting: AwayReport | null = null;
  const tell = (report: AwayReport): void => {
    if (!state.playerName) return;
    if (modalOpen()) waiting = report;
    else show(report);
  };
  onResume(() => {
    if (!waiting || modalOpen()) return;
    const report = waiting;
    waiting = null;
    show(report);
  });
  onLongAbsence(tell);
};
