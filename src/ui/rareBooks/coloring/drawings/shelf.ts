import { rng } from '../coloringDraw';
import { bottomBand, frame, oval, poly, roundRect, segment, sketch, trapeze, type Drawing } from '../coloringShapes';

/** 5 · L'étagère : un meuble de trois rayons, des livres de toutes les tailles (tirés de la graine 77), une plante et une bougie dessus. */
export const shelf = (): Drawing => {
  const { zones, add } = sketch();
  add('wall', frame());
  add('floor', bottomBand(680));
  add('case', roundRect(110, 210, 420, 486, 6));
  add('back', roundRect(132, 232, 376, 444, 2));
  const rows = [
    [232, 372],
    [384, 524],
    [536, 676],
  ];
  rows.slice(0, 2).forEach(([, bottom], i) => add(`board${i}`, roundRect(132, bottom, 376, 12, 2)));
  const random = rng(77);
  const spines: [number, number, number, number][] = [];
  rows.forEach(([top, bottom], row) => {
    let [x, n] = [140, 0];
    while (x < 470) {
      const w = 22 + Math.floor(random() * 18);
      const h = (bottom - top) * (0.62 + random() * 0.3);
      if (x + w > 500) break;
      // Un livre penché sur ses voisins.
      if (row === 1 && n === 4) {
        add(
          `book${row}-${n}`,
          poly([
            [x + 6, bottom],
            [x + 6 + w, bottom],
            [x + w + 44, bottom - h + 6],
            [x + 44, bottom - h - 4],
          ]),
        );
        x += w + 52;
        n += 1;
        continue;
      }
      add(`book${row}-${n}`, roundRect(x, bottom - h, w, h, 3));
      if (n % 2 === 0) spines.push([x, bottom - h, w, h]);
      x += w + 3;
      n += 1;
    }
    // Une pile couchée au bout du rayon.
    if (row === 2) for (let k = 0; k < 3; k++) add(`pile${k}`, roundRect(470 - k * 4 - 30, bottom - 18 * (k + 1), 60 + k * 6 - 10, 18, 3));
  });
  add('pot', trapeze(200, 210, 50, 70, 46));
  const leaves = new Path2D();
  leaves.moveTo(176, 164);
  leaves.bezierCurveTo(130, 130, 150, 90, 190, 120);
  leaves.bezierCurveTo(180, 80, 230, 70, 214, 124);
  leaves.bezierCurveTo(250, 100, 270, 140, 224, 164);
  leaves.closePath();
  add('leaves', leaves);
  add('candle', roundRect(420, 140, 30, 70, 4));
  const flame = new Path2D();
  flame.moveTo(435, 136);
  flame.bezierCurveTo(418, 120, 430, 104, 435, 92);
  flame.bezierCurveTo(442, 106, 452, 120, 435, 136);
  flame.closePath();
  add('flame', flame);
  add('holder', oval(435, 210, 40, 9));
  const lines = (context: CanvasRenderingContext2D): void => {
    // Les filets des dos, un peu au hasard ; la mèche.
    context.lineWidth = 2;
    for (const [x, y, w, h] of spines) for (const t of [0.14, 0.84]) segment(context, x + 4, y + h * t, x + w - 4, y + h * t);
    context.lineWidth = 3;
    segment(context, 435, 140, 435, 130);
  };
  return { zones, lines };
};
