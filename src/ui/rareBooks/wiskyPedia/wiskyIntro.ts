import { PAGE_TEXTURE } from '../../book/pageLayout';
import { bottle, glassOf } from './wiskyBottles';
import { AMBER, DISPLAY, INK, RULE, SANS, SERIF, SOFT, ring, rng, text, wrap } from './wiskyDraw';
import { header } from './wiskyFiches';
import { CHAPTER_PAGES, MORNING_PAGE, type WiskyTexts } from './wiskyPlan';
import type { PageLink } from '../rareBookArt';

/**
 * Les pages sobres de WiskyPedia (maquette .ai/maquette-wiskypedia.html, textes .ai/wiskypedia-textes.md) : titre,
 * mentions, sommaire, préface, comment déguster, la fabrication, lire une étiquette, les régions, avant de
 * commencer ; et la toute dernière, « Lendemain ».
 */

const W = PAGE_TEXTURE.width;
const C = W / 2;

/** Des paragraphes à partir de `y`, d'au plus `width` de large ; rend le bas du texte. */
const paragraphs = (
  context: CanvasRenderingContext2D,
  lines: readonly string[],
  x: number,
  y: number,
  font: string,
  width: number,
  color = INK,
  gap = 14,
): number => {
  for (const paragraph of lines) {
    for (const line of wrap(context, paragraph, font, width)) {
      text(context, line, x, y, font, color);
      y += 27;
    }
    y += gap;
  }
  return y;
};

const titlePage = (context: CanvasRenderingContext2D, texts: WiskyTexts): void => {
  text(context, texts.edition, C, 210, `400 16px ${SANS}`, AMBER, 'center', 6);
  text(context, texts.name, C, 300, `900 82px ${DISPLAY}`, INK, 'center');
  context.fillStyle = AMBER;
  context.fillRect(C - 60, 330, 120, 2);
  texts.subtitleLines.forEach((line, i) => text(context, line, C, 380 + i * 36, `italic 400 28px ${DISPLAY}`, SOFT, 'center'));
  bottle(context, C, 690, 1.2, 'tall', ['Wisky', 'Pedia']);
  text(context, texts.publisher, C, 755, `400 15px ${SANS}`, SOFT, 'center', 4);
};

/** Les mentions : « * » en gras capitales, « _ » en italique, « ! » en gras. */
const legalPage = (context: CanvasRenderingContext2D, texts: WiskyTexts): void => {
  let y = 330;
  for (const line of texts.legal) {
    const mark = line.charAt(0);
    const label = '*_!'.includes(mark) ? line.slice(1) : line;
    const font =
      mark === '*'
        ? `500 18px ${SANS}`
        : mark === '_'
          ? `italic 400 17px ${SERIF}`
          : mark === '!'
            ? `600 17px ${SERIF}`
            : `400 17px ${SERIF}`;
    if (label) text(context, label, 90, y, font, mark === '*' || mark === '!' ? INK : SOFT);
    y += 25;
  }
};

/** Le sommaire : les pages du début, les chapitres, le lendemain. */
const CONTENTS_TOP = 200;
const CONTENTS_STEP = 34;
const contentsRows = (texts: WiskyTexts): [string, number][] => [
  ...(texts.contentsIntro as [string, number][]),
  ...texts.chapters.map(([, , label], i): [string, number] => [label, CHAPTER_PAGES[i]]),
  ...(texts.contentsEnd as [string, number][]),
];

const contentsPage = (context: CanvasRenderingContext2D, texts: WiskyTexts): void => {
  text(context, texts.contents, 76, 130, `700 40px ${DISPLAY}`, INK);
  contentsRows(texts).forEach(([label, page], i) => {
    const y = CONTENTS_TOP + i * CONTENTS_STEP;
    const chapter = i >= texts.contentsIntro.length && i < texts.contentsIntro.length + texts.chapters.length;
    const font = chapter ? `400 19px ${SERIF}` : `italic 400 19px ${SERIF}`;
    text(context, label, 76, y, font, INK);
    text(context, String(page), W - 64, y, `400 17px ${SANS}`, AMBER, 'right');
    // Les points de conduite, du titre au numéro.
    context.save();
    context.font = font;
    const from = 76 + context.measureText(label).width + 10;
    context.restore();
    context.fillStyle = RULE;
    for (let x = from; x < W - 100; x += 8) context.fillRect(x, y - 4, 1.6, 1.6);
  });
};

/** Les lignes du sommaire, cliquables : chacune mène à sa page. */
export const contentsLinks = (texts: WiskyTexts): PageLink[] =>
  contentsRows(texts).map(([, page], i) => ({ y: CONTENTS_TOP + i * CONTENTS_STEP - 24, height: CONTENTS_STEP, target: page }));

const prefacePage = (context: CanvasRenderingContext2D, texts: WiskyTexts): void => {
  header(context, 4, texts.preface.toLocaleUpperCase(), 0, rng(4));
  text(context, texts.preface, 48, 130, `700 40px ${DISPLAY}`, INK);
  const y = paragraphs(context, texts.prefaceText, 48, 200, `400 20px ${SERIF}`, W - 110);
  text(context, texts.prefaceSign, W - 62, y + 20, `italic 400 19px ${SERIF}`, SOFT, 'right');
};

/** Le verre tulipe, en grand, et sa légende. */
const tulipPage = (context: CanvasRenderingContext2D, texts: WiskyTexts): void => {
  const x = C;
  context.save();
  context.beginPath();
  context.moveTo(x - 70, 200);
  context.bezierCurveTo(x - 80, 260, x - 110, 340, x - 90, 400);
  context.bezierCurveTo(x - 70, 450, x - 30, 470, x - 8, 480);
  context.lineTo(x - 6, 590);
  context.bezierCurveTo(x - 50, 596, x - 80, 604, x - 80, 612);
  context.lineTo(x + 80, 612);
  context.bezierCurveTo(x + 80, 604, x + 50, 596, x + 6, 590);
  context.lineTo(x + 8, 480);
  context.bezierCurveTo(x + 30, 470, x + 70, 450, x + 90, 400);
  context.bezierCurveTo(x + 110, 340, x + 80, 260, x + 70, 200);
  context.strokeStyle = 'rgba(70,60,50,0.55)';
  context.lineWidth = 2;
  context.stroke();
  context.clip();
  const liquid = context.createLinearGradient(0, 380, 0, 480);
  liquid.addColorStop(0, '#d79a35');
  liquid.addColorStop(1, '#9a5a14');
  context.fillStyle = liquid;
  context.fillRect(x - 120, 380, 240, 100);
  context.restore();
  context.beginPath();
  context.ellipse(x, 200, 70, 8, 0, 0, Math.PI * 2);
  context.strokeStyle = 'rgba(70,60,50,0.35)';
  context.lineWidth = 1.5;
  context.stroke();
  paragraphs(context, [texts.glassCaption], 110, 680, `italic 400 19px ${SERIF}`, W - 220, SOFT);
};

/** Des étapes numérotées dans des pastilles ambrées (comment déguster, la fabrication). */
const steps = (context: CanvasRenderingContext2D, list: readonly (readonly string[])[], top: number, gap: number): void => {
  let y = top;
  list.forEach(([title, body], i) => {
    context.fillStyle = AMBER;
    context.beginPath();
    context.arc(66, y - 7, 16, 0, Math.PI * 2);
    context.fill();
    text(context, String(i + 1), 66, y - 1, `500 17px ${SANS}`, '#fff', 'center');
    text(context, title, 96, y, `600 21px ${SANS}`, INK);
    let line = y + 26;
    for (const row of wrap(context, body, `400 18px ${SERIF}`, W - 160)) {
      text(context, row, 96, line, `400 18px ${SERIF}`, INK);
      line += 23;
    }
    y = line + gap;
  });
};

const tastingPage = (context: CanvasRenderingContext2D, texts: WiskyTexts): void => {
  header(context, 6, texts.tasting.toLocaleUpperCase(), 0, rng(6));
  text(context, texts.tasting, 48, 130, `700 40px ${DISPLAY}`, INK);
  steps(context, texts.tastingSteps, 220, 40);
};

const waterPage = (context: CanvasRenderingContext2D, texts: WiskyTexts): void => {
  glassOf(context, C, 520, { level: 0.75, colors: ['rgba(200,225,240,0.55)', 'rgba(150,190,215,0.6)'] });
  paragraphs(context, [texts.waterCaption], 110, 640, `italic 400 19px ${SERIF}`, W - 220, SOFT);
};

const makingPage = (context: CanvasRenderingContext2D, texts: WiskyTexts): void => {
  header(context, 8, texts.making.toLocaleUpperCase(), 0, rng(1));
  text(context, texts.making, 48, 130, `700 40px ${DISPLAY}`, INK);
  steps(context, texts.makingSteps, 200, 22);
};

const labelPage = (context: CanvasRenderingContext2D, texts: WiskyTexts): void => {
  header(context, 9, texts.label.toLocaleUpperCase(), 0, rng(2));
  text(context, texts.label, 64, 130, `700 40px ${DISPLAY}`, INK);
  const [name, kind, years, region, volume] = texts.labelWords;
  const [lx, ly, lw, lh] = [200, 200, 240, 300];
  const ink = '#5a2a18';
  context.fillStyle = '#f3ead6';
  context.fillRect(lx, ly, lw, lh);
  context.strokeStyle = ink;
  context.lineWidth = 1.5;
  context.strokeRect(lx + 8, ly + 8, lw - 16, lh - 16);
  const mid = lx + lw / 2;
  context.save();
  context.font = `700 30px ${DISPLAY}`;
  const nameSize = Math.min(30, (30 * (lw - 30)) / context.measureText(name).width);
  context.restore();
  text(context, name, mid, ly + 70, `700 ${nameSize}px ${DISPLAY}`, ink, 'center');
  text(context, kind, mid, ly + 110, `italic 400 22px ${SERIF}`, ink, 'center');
  text(context, '12', mid, ly + 180, `900 56px ${DISPLAY}`, ink, 'center');
  text(context, years, mid, ly + 206, `400 16px ${SANS}`, ink, 'center', 4);
  text(context, region, mid, ly + 246, `italic 400 18px ${SERIF}`, ink, 'center');
  text(context, volume, mid, ly + 276, `400 15px ${SANS}`, ink, 'center');
  const notes: [number, 'left' | 'right'][] = [
    [ly + 60, 'left'],
    [ly + 106, 'right'],
    [ly + 170, 'left'],
    [ly + 242, 'right'],
    [ly + 272, 'left'],
  ];
  texts.labelNotes.forEach((note, i) => {
    const [y, side] = notes[i];
    const x0 = side === 'left' ? lx : lx + lw;
    const x1 = side === 'left' ? 150 : W - 150;
    context.strokeStyle = AMBER;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x0, y - 6);
    context.lineTo(x1, y - 6);
    context.stroke();
    context.fillStyle = AMBER;
    context.beginPath();
    context.arc(x0, y - 6, 3, 0, Math.PI * 2);
    context.fill();
    const lines = wrap(context, note, `400 15px ${SERIF}`, side === 'left' ? 110 : 100);
    lines.forEach((line, n) =>
      text(
        context,
        line,
        side === 'left' ? 140 : W - 140,
        y - 6 - (lines.length - 1) * 9 + n * 18 + 5,
        `400 15px ${SERIF}`,
        INK,
        side === 'left' ? 'right' : 'left',
      ),
    );
  });
  paragraphs(context, [texts.labelTip], 80, 590, `italic 400 19px ${SERIF}`, W - 160, SOFT);
};

/** Une Écosse stylisée (côtes simplifiées, de 0 à 100), et Islay au sud-ouest. */
const SCOTLAND: readonly (readonly [number, number])[] = [
  [30, 5],
  [45, 3],
  [62, 2],
  [72, 4],
  [70, 12],
  [60, 20],
  [55, 26],
  [66, 27],
  [78, 30],
  [76, 40],
  [68, 48],
  [62, 55],
  [64, 60],
  [58, 63],
  [68, 66],
  [70, 72],
  [60, 80],
  [48, 84],
  [38, 86],
  [30, 82],
  [26, 78],
  [30, 72],
  [26, 66],
  [28, 60],
  [22, 58],
  [18, 70],
  [16, 66],
  [20, 56],
  [18, 48],
  [20, 40],
  [14, 36],
  [18, 28],
  [16, 20],
  [24, 12],
];
/** Speyside, Highlands, Islay, sur la carte. */
const SPOTS: readonly (readonly [number, number])[] = [
  [58, 31],
  [38, 24],
  [8, 64],
];

const scotlandPage = (context: CanvasRenderingContext2D, texts: WiskyTexts): void => {
  header(context, 10, texts.scotland.toLocaleUpperCase(), 0, rng(10));
  text(context, texts.scotland, 48, 120, `700 34px ${DISPLAY}`, INK);
  const at = ([x, y]: readonly [number, number]): [number, number] => [170 + x * 3.6, 160 + y * 3.9];
  context.beginPath();
  SCOTLAND.forEach((point, i) => {
    const [x, y] = at(point);
    if (i) context.lineTo(x, y);
    else context.moveTo(x, y);
  });
  context.closePath();
  context.fillStyle = '#efe6d2';
  context.fill();
  context.strokeStyle = 'rgba(110,90,60,0.6)';
  context.lineWidth = 1.5;
  context.stroke();
  // Islay, et quelques îles au nord-ouest.
  for (const [x, y, rx, ry] of [
    [8, 64, 4, 3],
    [8, 12, 5, 7],
    [12, 30, 3, 4],
  ]) {
    const [cx, cy] = at([x, y]);
    context.beginPath();
    context.ellipse(cx, cy, rx * 3.6, ry * 3.9, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
  }
  SPOTS.forEach((spot, i) => {
    const [x, y] = at(spot);
    context.fillStyle = AMBER;
    context.beginPath();
    context.arc(x, y, 12, 0, Math.PI * 2);
    context.fill();
    text(context, String(i + 1), x, y + 5, `500 14px ${SANS}`, '#fff', 'center');
  });
  let y = 560;
  texts.scotlandRegions.forEach(([name, description], i) => {
    text(context, `${i + 1}. ${name}`, 48, y, `600 19px ${SANS}`, INK);
    y += 22;
    for (const line of wrap(context, description, `400 16.5px ${SERIF}`, W - 100)) {
      text(context, line, 48, y, `400 16.5px ${SERIF}`, INK);
      y += 20;
    }
    y += 12;
  });
};

const worldPage = (context: CanvasRenderingContext2D, texts: WiskyTexts): void => {
  header(context, 11, texts.world.toLocaleUpperCase(), 0, rng(11));
  text(context, texts.world, 64, 130, `700 34px ${DISPLAY}`, INK);
  let y = 210;
  texts.worldRegions.forEach(([name, description], i) => {
    context.fillStyle = AMBER;
    context.beginPath();
    context.arc(78, y - 7, 6, 0, Math.PI * 2);
    context.fill();
    text(context, name, 98, y, `600 21px ${SANS}`, INK);
    text(context, String(CHAPTER_PAGES[i + 3]), W - 64, y, `400 17px ${SANS}`, AMBER, 'right');
    text(context, description, 98, y + 26, `italic 400 18px ${SERIF}`, SOFT);
    y += 82;
  });
};

const beforePage = (context: CanvasRenderingContext2D, texts: WiskyTexts): void => {
  header(context, 12, texts.before.toLocaleUpperCase(), 0, rng(12));
  text(context, texts.before, 48, 130, `700 40px ${DISPLAY}`, INK);
  paragraphs(context, texts.beforeText, 48, 200, `400 20px ${SERIF}`, W - 110);
  glassOf(context, C, 680, { level: 0.75, colors: ['rgba(200,225,240,0.55)', 'rgba(150,190,215,0.6)'] });
};

/** Page 410 : « Lendemain », sobre et très court ; un seul rond de verre. */
export const morningPage = (context: CanvasRenderingContext2D, texts: WiskyTexts): void => {
  text(context, String(MORNING_PAGE), 48, 46, `400 15px ${SANS}`, SOFT);
  context.fillStyle = RULE;
  context.fillRect(48, 58, W - 96, 1);
  text(context, texts.morning, 90, 300, `700 44px ${DISPLAY}`, INK);
  text(context, texts.morningKind, 90, 334, `italic 400 18px ${SERIF}`, SOFT);
  const y = paragraphs(context, [texts.morningText], 90, 380, `400 20px ${SERIF}`, W - 180);
  text(context, texts.morningSee, 90, y + 4, `italic 400 18px ${SERIF}`, SOFT);
  ring(context, 420, 600, 50, 0.6, rng(9));
};

/** Les pages 1 à 12, dans l'ordre. */
export const INTRO_PAGES: readonly ((context: CanvasRenderingContext2D, texts: WiskyTexts) => void)[] = [
  titlePage,
  legalPage,
  contentsPage,
  prefacePage,
  tulipPage,
  tastingPage,
  waterPage,
  makingPage,
  labelPage,
  scotlandPage,
  worldPage,
  beforePage,
];
