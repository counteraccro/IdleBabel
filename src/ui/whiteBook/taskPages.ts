import { getLocale, t } from '../../i18n';
import { currentNotation, formatCount, formatNumber, writeDigits } from '../../core/format';
import { ONCE_TASKS, type OnceTaskDef, type TaskReward } from '../../data/tasks';
import { dailyLeft, dailyProgress } from '../../systems/dailyTasks';
import { onceMet, onceShown } from '../../systems/onceTasks';
import { takeDaily, takeOnce } from '../../systems/tasks';
import { folio, heading, roman, type Item } from '../strangeBook/pageItems';
import { babelize, seedOf } from './babelMask';
import {
  GHOST_INK,
  PENCIL,
  PENCIL_FADED,
  handText,
  handWidth,
  pencilCircle,
  pencilLine,
  progressBar,
  seeded,
  slip,
  token,
  worth,
} from './taskDrawing';
import type { DailyTask, GameState } from '../../core/state';

/**
 * La partie V du livre blanc, « Tâches » (maquette validée .ai/maquette-taches.html) : sa page de titre, puis la double
 * page : à gauche « Aujourd'hui » (les tâches du jour sur des bouts de papier), à droite « Une seule fois » (la liste,
 * continuée sur les pages suivantes si elle est trop longue). Un clic sur une tâche faite prend ce qu'elle rapporte.
 */

/** Un nombre écrit au crayon : les chiffres de Babel ne s'écrivent pas à la main, ils restent en chiffres. */
const pencilNumber = (value: number, counted = false): string =>
  currentNotation() === 'babel'
    ? formatNumber(value, getLocale(), 'full')
    : counted
      ? formatCount(value, getLocale())
      : formatNumber(value, getLocale());

/** La page de titre : V, TÂCHES, le filet, la phrase du chercheur, et où en sont les tâches. */
export const taskTitleItems = (state: GameState, number: number): Item[] => {
  const today = state.tasks.today;
  const shown = ONCE_TASKS.filter((def) => onceShown(state, def));
  const onceDone = shown.filter((def) => state.tasks.once[def.n]?.done !== undefined).length;
  const fill = (key: string, n: number, total: number): string =>
    t(key)
      .replace('{n}', writeDigits(String(n)))
      .replace('{total}', writeDigits(String(total)));
  return [
    { kind: 'text', text: roman(5), x: 320, y: 270, size: 22, align: 'center', spacing: 8, gold: true, face: 'title' },
    {
      kind: 'text',
      text: t('whiteBook.parts.task').toLocaleUpperCase(),
      x: 320,
      y: 310,
      size: 40,
      align: 'center',
      spacing: 8,
      face: 'title',
      initial: true,
    },
    { kind: 'rule', y: 385, width: 240 },
    ...t('whiteBook.tasks.lines')
      .split('\n')
      .map((line, index): Item => ({
        kind: 'text',
        text: line,
        x: 320,
        y: 430 + index * 30,
        size: 21,
        align: 'center',
        italic: true,
        faded: true,
      })),
    { kind: 'text', text: '·   ·   ·', x: 320, y: 544, size: 18, align: 'center', faded: true },
    {
      kind: 'text',
      text: fill('whiteBook.tasks.todayCount', today.filter((task) => task.done !== undefined).length, today.length),
      x: 320,
      y: 582,
      size: 26,
      align: 'center',
      spacing: 2,
      face: 'title',
    },
    {
      kind: 'text',
      text: fill('whiteBook.tasks.onceCount', onceDone, shown.length),
      x: 320,
      y: 622,
      size: 19,
      align: 'center',
      italic: true,
      faded: true,
    },
    folio(number),
  ];
};

/** La consigne d'une tâche du jour. */
const dailyText = (task: DailyTask): string => {
  if (task.goal <= 0) return t('whiteBook.tasks.daily.wait');
  const one = task.goal === 1 && ['finds', 'books', 'mimic'].includes(task.kind);
  return t(`whiteBook.tasks.daily.${task.kind}${one ? 'One' : ''}`).replace('{n}', pencilNumber(task.goal, true));
};

/** La place des bouts de papier (maquette : trois, de travers chacun à sa façon), et leur hauteur. */
const SLIPS = [
  { x: 70, width: 470, angle: -0.025 },
  { x: 96, width: 440, angle: 0.03 },
  { x: 66, width: 470, angle: -0.035 },
  { x: 88, width: 450, angle: 0.02 },
  { x: 74, width: 460, angle: -0.02 },
] as const;
const SLIPS_TOP = 172;
const SLIPS_BOTTOM = 650;
const SLIP_GAP = 29;
const slipHeight = (task: DailyTask): number => (task.kind === 'pages' ? 150 : 134);

/** Les bouts de papier de la page : leur place, rapetissés s'ils sont plus de trois. */
const slipBoxes = (tasks: readonly DailyTask[]) => {
  const total = tasks.reduce((sum, task) => sum + slipHeight(task), 0) + SLIP_GAP * Math.max(0, tasks.length - 1);
  const scale = Math.min(1, (SLIPS_BOTTOM - SLIPS_TOP) / total);
  let y = SLIPS_TOP;
  return tasks.map((task, index) => {
    const place = SLIPS[index % SLIPS.length];
    const box = { ...place, y, height: slipHeight(task), scale };
    y += (box.height + SLIP_GAP) * scale;
    return box;
  });
};

/** Un bout de papier : la consigne, ce qu'elle vaut, où elle en est ; faite, barrée, et son jeton posé dessus. */
const drawSlip = (context: CanvasRenderingContext2D, state: GameState, task: DailyTask, width: number): void => {
  const done = task.done !== undefined;
  const text = dailyText(task);
  const coins = task.value * 21 + 20;
  const size = Math.min(34, Math.floor((34 * (width - 52 - coins)) / Math.max(1, handWidth(context, text, 34))));
  const textY = task.kind === 'pages' ? 26 : 28;
  if (!done || task.taken) worth(context, width - 22, 17, task.value, !!task.taken);
  const textWidth = handText(context, text, 26, textY, { size });
  if (task.kind === 'pages') handText(context, t('whiteBook.tasks.keepGoing'), 26, 66, { size: 28, color: PENCIL_FADED });
  const random = seeded(seedOf(`${task.kind}:${task.base}`));
  if (done) {
    pencilLine(context, 22, textY + 22, Math.min(width - 30, 26 + textWidth + 8), random);
    if (task.taken) return;
    for (let i = 0; i < task.value; i++) token(context, width - 60 - i * 26, 96, 30);
    handText(context, t(task.value > 1 ? 'whiteBook.tasks.tokens' : 'whiteBook.tasks.token'), 26, 86, { size: 26 });
    return;
  }
  if (task.goal <= 0) return;
  const counted = t('whiteBook.tasks.progress')
    .replace('{n}', pencilNumber(task.goal - dailyLeft(state, task)))
    .replace('{total}', pencilNumber(task.goal));
  if (task.kind === 'pages') {
    handText(context, counted, width - 26, 108, { size: 26, align: 'right' });
    progressBar(context, 26, 116, 220, dailyProgress(state, task));
  } else handText(context, counted, width - 26, 80, { size: 28, align: 'right' });
};

/** La page de gauche, « Aujourd'hui » : les tâches du jour sur leurs bouts de papier. */
export const todayItems = (state: GameState, number: number): Item[] => {
  const tasks = state.tasks.today;
  const boxes = slipBoxes(tasks);
  const allDone = tasks.length > 0 && tasks.every((task) => task.done !== undefined);
  const key = JSON.stringify([
    getLocale(),
    currentNotation(),
    tasks.map((task) => [task.kind, task.value, task.goal, task.done !== undefined, task.taken, dailyLeft(state, task)]),
  ]);
  return [
    ...heading(t('whiteBook.tasks.today'), 5),
    {
      kind: 'drawing',
      key,
      draw: (context) =>
        tasks.forEach((task, index) =>
          slip(context, boxes[index], seeded(11 + index * 7), (inner, width) => drawSlip(inner, state, task, width)),
        ),
    },
    // Une tâche faite : un clic sur son papier prend son jeton.
    ...tasks.flatMap((task, index): Item[] =>
      task.done !== undefined && !task.taken
        ? [
            {
              kind: 'action',
              id: `daily:${index}`,
              x: boxes[index].x,
              width: boxes[index].width,
              y: boxes[index].y,
              height: boxes[index].height * boxes[index].scale,
            },
          ]
        : [],
    ),
    {
      kind: 'text',
      text: t(allDone ? 'whiteBook.tasks.allDone' : 'whiteBook.tasks.midnight'),
      x: 320,
      y: 676,
      size: allDone ? 28 : 24,
      align: 'center',
      face: 'hand',
      faded: !allDone,
    },
    folio(number),
  ];
};

/** Ce que rapporte une tâche « une seule fois », écrit au bout de sa ligne. */
export const rewardText = (reward: TaskReward): string => {
  const n = (key: string, value: number): string => t(`whiteBook.tasks.rewards.${key}`).replace('{n}', writeDigits(String(value)));
  if (reward.tokens) return n('tokens', reward.tokens);
  if (reward.readingHours)
    return reward.readingHours < 24
      ? n('hours', reward.readingHours)
      : reward.readingHours === 24
        ? n('day', 1)
        : n('days', reward.readingHours / 24);
  if (reward.knowledgeHours)
    return reward.knowledgeHours < 24
      ? n('kHours', reward.knowledgeHours)
      : reward.knowledgeHours === 24
        ? n('kDay', 1)
        : n('kDays', reward.knowledgeHours / 24);
  if (reward.readingBonus) return n('reading', Math.round(reward.readingBonus * 100));
  if (reward.knowledgeBonus) return n('knowledge', Math.round(reward.knowledgeBonus * 100));
  return t('whiteBook.tasks.rewards.relic');
};

type RowState = 'done' | 'waiting' | 'now' | 'ghost';

interface Row {
  def: OnceTaskDef;
  state: RowState;
  lines: string[];
  reward: string;
  height: number;
}

const ROWS_TOP = 168;
const ROWS_BOTTOM = 700;
const ROW_SIZE = 26;
const ROW_LINE = 30;
const TEXT_LEFT = 96;
const REWARD_RIGHT = 590;

let measurer: CanvasRenderingContext2D | null = null;
const measure = (): CanvasRenderingContext2D => (measurer ??= document.createElement('canvas').getContext('2d')!);

/** Les mots d'une ligne, en autant de lignes qu'il faut pour tenir dans `width`. */
const wrap = (text: string, width: number): string[] => {
  const lines: string[] = [];
  for (const word of text.split(' ')) {
    const last = lines.at(-1);
    if (last !== undefined && handWidth(measure(), `${last} ${word}`, ROW_SIZE) <= width) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines;
};

/** Les lignes de la liste : celles dont l'étoile est allumée ; en Babel tant que ce dont elles parlent n'est pas rencontré. */
const onceRows = (state: GameState): Row[] =>
  ONCE_TASKS.filter((def) => onceShown(state, def)).map((def) => {
    const task = state.tasks.once[def.n];
    const rowState: RowState = task?.done !== undefined ? (task.taken ? 'done' : 'waiting') : onceMet(state, def) ? 'now' : 'ghost';
    const text = t(`whiteBook.tasks.onceTasks.${def.n}`);
    const reward = rowState === 'ghost' ? '' : rewardText(def.reward);
    const room = REWARD_RIGHT - TEXT_LEFT - (reward ? handWidth(measure(), reward, 22) + 18 : 0);
    const lines = wrap(rowState === 'ghost' ? babelize(text, seedOf(`task:${def.n}`)) : text, room);
    return { def, state: rowState, lines, reward, height: lines.length * ROW_LINE + 10 };
  });

/** La liste coupée en pages : autant qu'il en faut entre le titre et le folio. */
const rowPages = (rows: Row[]): Row[][] => {
  const pages: Row[][] = [[]];
  let height = 0;
  for (const row of rows) {
    if (height + row.height > ROWS_BOTTOM - ROWS_TOP && pages.at(-1)!.length > 0) {
      pages.push([]);
      height = 0;
    }
    pages.at(-1)!.push(row);
    height += row.height;
  }
  return pages;
};

/** Les pages de la liste « Une seule fois », à cette heure. */
export const oncePageCount = (state: GameState): number => rowPages(onceRows(state)).length;

/** Une ligne : sa case (cochée ✓ une fois faite), sa consigne au crayon, sa récompense au bout (entourée tant qu'elle attend). */
const drawRow = (context: CanvasRenderingContext2D, row: Row, y: number): void => {
  const random = seeded(seedOf(`row:${row.def.n}`));
  const ghost = row.state === 'ghost';
  row.lines.forEach((line, index) =>
    handText(context, line, TEXT_LEFT, y + index * ROW_LINE, { size: ROW_SIZE, color: ghost ? GHOST_INK : PENCIL }),
  );
  if (ghost) return pencilCircle(context, 70, y + 16, 10, GHOST_INK);
  const done = row.state === 'done' || row.state === 'waiting';
  const rewardY = y + (row.lines.length - 1) * ROW_LINE + 3;
  const width = handText(context, row.reward, REWARD_RIGHT, rewardY, {
    size: 22,
    align: 'right',
    color: row.state === 'done' ? PENCIL_FADED : PENCIL,
  });
  if (row.state === 'waiting') {
    context.strokeStyle = PENCIL;
    context.lineWidth = 1.3;
    context.beginPath();
    context.ellipse(REWARD_RIGHT - width / 2, rewardY + 12, width / 2 + 10, 16, -0.03, 0, Math.PI * 2);
    context.stroke();
  }
  if (!done) return pencilCircle(context, 70, y + 16, 10);
  row.lines.forEach((line, index) =>
    pencilLine(context, TEXT_LEFT - 4, y + index * ROW_LINE + 16, TEXT_LEFT + 4 + handWidth(context, line, ROW_SIZE), random),
  );
  handText(context, '✓', 70, y - 2, { size: 28, align: 'center' });
};

/** Une page de la liste « Une seule fois » (`part` : 0 pour la première, en face d'« Aujourd'hui »). */
export const onceItems = (state: GameState, part: number, number: number): Item[] => {
  const rows = rowPages(onceRows(state))[part] ?? [];
  const tops: number[] = [];
  rows.reduce((y, row) => (tops.push(y), y + row.height), ROWS_TOP);
  const key = JSON.stringify([getLocale(), rows.map((row) => [row.def.n, row.state, row.lines, row.reward])]);
  return [
    ...heading(t('whiteBook.tasks.once')),
    { kind: 'drawing', key, draw: (context) => rows.forEach((row, index) => drawRow(context, row, tops[index])) },
    ...rows.flatMap((row, index): Item[] =>
      row.state === 'waiting'
        ? [{ kind: 'action', id: `once:${row.def.n}`, x: 50, width: 560, y: tops[index] - 4, height: row.height }]
        : [],
    ),
    folio(number),
  ];
};

/** Un clic sur une tâche faite : son jeton, ou sa récompense, est pris. */
export const actOnTask = (state: GameState, id: string): void => {
  const [kind, value] = id.split(':');
  if (kind === 'daily') takeDaily(state, Number(value));
  else if (kind === 'once') takeOnce(state, Number(value));
};
