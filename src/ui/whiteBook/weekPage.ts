import { getLocale, t } from '../../i18n';
import { currentNotation } from '../../core/format';
import { WEEKLY_STAMPS, WEEK_BONUS } from '../../data/tasks';
import { weekComplete, weekDaysLeft, weeklyCountOf } from '../../systems/weeklyTasks';
import { folio, heading, type Item } from '../strangeBook/pageItems';
import { seedOf } from './babelMask';
import {
  PENCIL,
  PENCIL_FADED,
  dateStamp,
  handText,
  handWidth,
  pencilCircle,
  pencilLine,
  progressBar,
  seeded,
  slip,
  stampDate,
  worth,
} from './taskDrawing';
import { pencilNumber } from './taskPages';
import type { GameState, WeeklyTask } from '../../core/state';

/**
 * La page « Cette semaine » (maquette validée .ai/maquette-guichet.html, ses mesures reprises), en face d'« Aujourd'hui » :
 * une fiche plus grande, épinglée, les tâches de la semaine, ce qu'il reste de jours ; en bas, les 10 tampons de plus si
 * toutes sont faites. Un clic sur la fiche prend les tampons qui y attendent.
 */

const CARD = { x: 60, y: 176, width: 520, height: 420, angle: 0.012 } as const;
const ROW_TOP = 92;
const ROW_STEP = 92;

/** La consigne d'une tâche de la semaine. */
const weeklyText = (task: WeeklyTask): string => {
  const one = `whiteBook.tasks.weekly.${task.kind}One`;
  if (task.goal === 1 && t(one) !== one) return t(one);
  return t(`whiteBook.tasks.weekly.${task.kind}`).replace('{n}', pencilNumber(task.goal, true));
};

/** Ce qu'il reste de la semaine, en haut de la fiche. */
const daysText = (state: GameState, now: number): string => {
  if (weekComplete(state)) return t('whiteBook.tasks.week.done');
  const left = weekDaysLeft(now);
  return left === 1 ? t('whiteBook.tasks.week.lastDay') : t('whiteBook.tasks.week.days').replace('{n}', pencilNumber(left));
};

/** La punaise rouge qui tient la fiche. */
const pin = (context: CanvasRenderingContext2D, x: number): void => {
  context.fillStyle = '#9a3b2e';
  context.beginPath();
  context.arc(x, 18, 6, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = 'rgba(255,255,255,0.5)';
  context.beginPath();
  context.arc(x - 2, 16, 2, 0, Math.PI * 2);
  context.fill();
};

const drawCard = (context: CanvasRenderingContext2D, state: GameState, now: number, width: number): void => {
  const random = seeded(seedOf(`week:${state.tasks.week.start}`));
  const locale = getLocale();
  pin(context, width / 2);
  handText(context, daysText(state, now), width / 2, 34, { size: 28, color: PENCIL_FADED, align: 'center' });
  state.tasks.week.tasks.forEach((task, index) => {
    const y = ROW_TOP + index * ROW_STEP;
    const label = weeklyText(task);
    handText(context, label, 56, y, { size: 30 });
    if (task.done !== undefined) {
      pencilLine(context, 52, y + 18, 60 + handWidth(context, label, 30), random);
      handText(context, '✓', 30, y - 2, { size: 30, align: 'center' });
      if (task.taken) worth(context, width - 28, y + 14, 1, true);
      else dateStamp(context, width - 80, y + 18, stampDate(task.done, locale), -0.1, 0.8, seedOf(`${task.kind}:${task.base}`));
      return;
    }
    pencilCircle(context, 30, y + 17, 10);
    worth(context, width - 28, y + 14, 1, false);
    handText(context, String(WEEKLY_STAMPS), width - 44, y + 2, { size: 24, align: 'right' });
    const count = weeklyCountOf(state, task);
    progressBar(context, 56, y + 44, 170, count / task.goal);
    handText(context, `${pencilNumber(count, true)} / ${pencilNumber(task.goal, true)}`, 240, y + 36, { size: 22, color: PENCIL_FADED });
  });
  context.strokeStyle = PENCIL_FADED;
  context.lineWidth = 1;
  context.setLineDash([4, 5]);
  context.beginPath();
  context.moveTo(30, 360);
  context.lineTo(width - 30, 360);
  context.stroke();
  context.setLineDash([]);
  const complete = weekComplete(state);
  handText(context, t('whiteBook.tasks.week.all').replace('{n}', pencilNumber(WEEK_BONUS)), 30, 372, {
    size: 26,
    color: complete ? PENCIL : PENCIL_FADED,
  });
  if (complete && !state.tasks.week.bonusTaken) {
    const last = Math.max(...state.tasks.week.tasks.map((task) => task.done!));
    dateStamp(context, width - 80, 386, stampDate(last, locale), 0.06, 0.8, seedOf(`week:${state.tasks.week.start}:all`));
  } else if (complete) worth(context, width - 28, 386, 1, true);
};

/** La page de droite, « Cette semaine ». */
export const weekItems = (state: GameState, number: number): Item[] => {
  const now = Date.now();
  const week = state.tasks.week;
  const key = JSON.stringify([
    getLocale(),
    currentNotation(),
    week.start,
    weekDaysLeft(now),
    week.bonusTaken,
    week.tasks.map((task) => [task.kind, task.goal, task.done, task.taken, weeklyCountOf(state, task)]),
  ]);
  const waiting = week.tasks.some((task) => task.done !== undefined && !task.taken) || (weekComplete(state) && !week.bonusTaken);
  return [
    ...heading(t('whiteBook.tasks.week.title')),
    {
      kind: 'drawing',
      key,
      draw: (context) => slip(context, CARD, seeded(31), (inner, width) => drawCard(inner, state, now, width)),
    },
    // Des tampons attendent : un clic sur la fiche les prend.
    ...(waiting ? [{ kind: 'action', id: 'week', x: CARD.x, y: CARD.y, width: CARD.width, height: CARD.height } satisfies Item] : []),
    {
      kind: 'text',
      text: t('whiteBook.tasks.week.monday'),
      x: 320,
      y: 676,
      size: 24,
      align: 'center',
      face: 'hand',
      faded: true,
    },
    folio(number),
  ];
};
