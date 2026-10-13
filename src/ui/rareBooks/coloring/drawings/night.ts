import {
  arched,
  bottomBand,
  circle,
  crescent,
  frame,
  oval,
  poly,
  roundRect,
  segment,
  sketch,
  starPath,
  type Drawing,
} from '../coloringShapes';

/** Les étoiles : [x, y, rayon] ; les quatre premières font la constellation. */
const STARS = [
  [130, 250, 20],
  [230, 190, 17],
  [300, 270, 14],
  [370, 150, 19],
  [540, 300, 15],
  [110, 120, 12],
] as const;

/** 8 · La nuit étoilée : une maison sur la colline, un arbre rond, la lune, de grosses étoiles, une étoile filante. */
export const night = (): Drawing => {
  const { zones, add } = sketch();
  add('sky', frame());
  add('moon', crescent(470, 170, 58, 26, 50));
  STARS.forEach(([x, y, r], i) => add(`star${i}`, starPath(x, y, r, 0.5)));
  const tail = new Path2D();
  tail.moveTo(250, 112);
  tail.quadraticCurveTo(300, 92, 362, 84);
  tail.quadraticCurveTo(316, 106, 262, 128);
  tail.closePath();
  add('cometTail', tail);
  add('comet', starPath(246, 122, 16, 0.5));
  const hillBack = new Path2D();
  hillBack.moveTo(56, 500);
  hillBack.bezierCurveTo(180, 430, 330, 450, 420, 480);
  hillBack.bezierCurveTo(500, 460, 560, 450, 584, 456);
  hillBack.lineTo(584, 728);
  hillBack.lineTo(56, 728);
  hillBack.closePath();
  add('hillBack', hillBack);
  add('hillFront', bottomBand(616, 10));
  add(
    'path',
    poly([
      [300, 620],
      [340, 620],
      [380, 728],
      [262, 728],
    ]),
  );
  add('trunk', roundRect(100, 530, 26, 88, 4));
  add('crown', oval(113, 500, 50, 58));
  add('chimney', roundRect(362, 384, 30, 70, 2));
  add('house', roundRect(212, 470, 216, 150, 4));
  add(
    'roof',
    poly([
      [190, 480],
      [320, 372],
      [450, 480],
    ]),
  );
  add('roofWindow', circle(320, 438, 20));
  add('windowLeft', roundRect(232, 498, 52, 52, 4));
  add('windowRight', roundRect(356, 498, 52, 52, 4));
  add('door', arched(300, 540, 40, 80));
  add('knob', circle(331, 584, 4));
  add('step', roundRect(288, 616, 64, 10, 3));
  const lines = (context: CanvasRenderingContext2D): void => {
    // La constellation en pointillés, les croisées, les tuiles, la fumée.
    context.lineWidth = 2.5;
    context.setLineDash([6, 8]);
    context.beginPath();
    [0, 1, 3, 2, 0].forEach((k, i) => {
      const [x, y] = STARS[k];
      if (i) context.lineTo(x, y);
      else context.moveTo(x, y);
    });
    context.stroke();
    context.setLineDash([]);
    context.lineWidth = 3.5;
    for (const x of [232, 356]) {
      context.beginPath();
      context.moveTo(x + 26, 498);
      context.lineTo(x + 26, 550);
      context.moveTo(x, 524);
      context.lineTo(x + 52, 524);
      context.stroke();
    }
    context.beginPath();
    context.moveTo(300, 438);
    context.lineTo(340, 438);
    context.moveTo(320, 418);
    context.lineTo(320, 458);
    context.stroke();
    context.lineWidth = 2.5;
    for (const [y, x0, x1] of [
      [420, 262, 290],
      [420, 352, 378],
      [452, 228, 290],
      [452, 352, 412],
    ])
      segment(context, x0, y, x1, y);
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(377, 380);
    context.bezierCurveTo(360, 360, 396, 350, 380, 330);
    context.bezierCurveTo(368, 316, 396, 308, 388, 292);
    context.stroke();
  };
  return { zones, lines };
};
