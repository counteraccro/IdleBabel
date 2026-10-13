import { circle, frame, poly, roundRect, segment, sketch, starPath, type Drawing } from '../coloringShapes';

/** 3 · La lettre qui s'envole : le livre tenu à deux mains, une lettre de Babel en monte, dans un halo. */
export const letter = (): Drawing => {
  const { zones, add } = sketch();
  add('wall', frame());
  add('halo', circle(316, 270, 112));
  add(
    'cover',
    poly([
      [92, 668],
      [104, 520],
      [320, 548],
      [536, 520],
      [548, 668],
      [320, 698],
    ]),
  );
  add(
    'pagesBlock',
    poly([
      [112, 632],
      [320, 658],
      [528, 632],
      [528, 656],
      [320, 684],
      [112, 656],
    ]),
  );
  add(
    'pageLeft',
    poly([
      [112, 632],
      [122, 532],
      [320, 560],
      [320, 658],
    ]),
  );
  add(
    'pageRight',
    poly([
      [320, 560],
      [518, 532],
      [528, 632],
      [320, 658],
    ]),
  );
  const hand = (mirror: boolean): Path2D => {
    const path = new Path2D();
    const at = (x: number, y: number): [number, number] => [mirror ? 640 - x : x, y];
    path.moveTo(...at(74, 728));
    path.lineTo(...at(84, 676));
    path.quadraticCurveTo(...at(92, 648), ...at(130, 644));
    path.lineTo(...at(178, 634));
    path.quadraticCurveTo(...at(198, 632), ...at(192, 648));
    path.lineTo(...at(152, 664));
    path.quadraticCurveTo(...at(164, 696), ...at(154, 728));
    path.closePath();
    return path;
  };
  add('handLeft', hand(false));
  add('handRight', hand(true));
  add(
    'sleeveLeft',
    poly([
      [56, 728],
      [56, 690],
      [96, 684],
      [172, 728],
    ]),
  );
  add(
    'sleeveRight',
    poly([
      [584, 728],
      [584, 690],
      [544, 684],
      [468, 728],
    ]),
  );
  // La lettre : une rune épaisse (un jambage, une panse en pointe, un crochet), son pied, et son point.
  add(
    'glyph',
    poly([
      [294, 372],
      [294, 212],
      [262, 194],
      [276, 176],
      [324, 204],
      [324, 232],
      [388, 282],
      [324, 332],
      [324, 372],
    ]),
  );
  add('glyphFoot', roundRect(274, 372, 70, 18, 6));
  add('glyphDot', circle(352, 186, 13));
  add('spark1', starPath(196, 214, 18));
  add('spark2', starPath(450, 250, 15));
  add('spark3', starPath(410, 136, 12));
  add('spark4', starPath(214, 360, 11));
  const lines = (context: CanvasRenderingContext2D): void => {
    context.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const y = 574 + i * 11;
      context.beginPath();
      context.moveTo(144, y - 4);
      context.quadraticCurveTo(230, y - 2, 300, y + 6);
      context.stroke();
      context.beginPath();
      context.moveTo(340, y + 6);
      context.quadraticCurveTo(410, y - 2, 496, y - 4);
      context.stroke();
    }
    // La tranche des pages.
    for (const k of [0.33, 0.66]) {
      const [y0, y1] = [632 + 24 * k, 658 + 26 * k];
      const at = (x: number): number => y0 + ((y1 - y0) * (x - 112)) / 208;
      context.beginPath();
      context.moveTo(204, at(204));
      context.lineTo(320, y1);
      context.lineTo(436, at(204));
      context.stroke();
    }
    // Le chemin de la lettre, en spirale pointillée, du livre jusqu'à elle.
    context.lineWidth = 3;
    context.setLineDash([9, 9]);
    context.beginPath();
    context.moveTo(320, 548);
    context.bezierCurveTo(250, 500, 400, 470, 330, 420);
    context.bezierCurveTo(300, 400, 330, 396, 316, 392);
    context.stroke();
    context.setLineDash([]);
    context.lineWidth = 3;
    for (const [x0, y0, x1, y1] of [
      [180, 300, 160, 290],
      [460, 330, 486, 322],
      [430, 410, 452, 420],
      [190, 440, 168, 452],
    ])
      segment(context, x0, y0, x1, y1);
  };
  return { zones, lines };
};
