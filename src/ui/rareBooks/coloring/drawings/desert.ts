import {
  arched,
  birds,
  bottomBand,
  circle,
  flower,
  frame,
  poly,
  roundRect,
  segment,
  sketch,
  trapeze,
  type Drawing,
} from '../coloringShapes';

/** 6 · La fenêtre sur le désert : volets ouverts, les dunes, le soleil, une tour au loin, un cactus sur l'appui, la commode. */
export const desert = (): Drawing => {
  const { zones, add } = sketch();
  add('wall', frame());
  add(
    'shutterLeft',
    poly([
      [76, 170],
      [150, 160],
      [150, 540],
      [76, 530],
    ]),
  );
  add(
    'shutterRight',
    poly([
      [564, 170],
      [490, 160],
      [490, 540],
      [564, 530],
    ]),
  );
  add('frame', arched(150, 110, 340, 440));
  add('sky', arched(172, 132, 296, 404));
  add('sun', circle(384, 262, 38));
  const dune = (y0: number, a: number, b: number, y1: number): Path2D => {
    const path = new Path2D();
    path.moveTo(172, y0);
    path.quadraticCurveTo(250, y0 - a, 330, y0 + 4);
    path.quadraticCurveTo(410, y0 + b, 468, y1);
    path.lineTo(468, 536);
    path.lineTo(172, 536);
    path.closePath();
    return path;
  };
  add('duneBack', dune(420, 60, 20, 396));
  add(
    'towerFar',
    poly([
      [226, 414],
      [230, 392],
      [234, 392],
      [237, 372],
      [241, 372],
      [243, 352],
      [247, 352],
      [249, 336],
      [253, 352],
      [257, 352],
      [259, 372],
      [263, 372],
      [266, 392],
      [270, 392],
      [274, 414],
    ]),
  );
  add('duneMid', dune(462, 40, 30, 450));
  add('duneFront', dune(502, 30, 20, 492));
  add('sill', roundRect(126, 536, 388, 28, 6));
  add('pot', trapeze(420, 536, 56, 74, 50));
  const cactus = new Path2D();
  cactus.moveTo(408, 486);
  cactus.lineTo(408, 430);
  cactus.lineTo(392, 430);
  cactus.quadraticCurveTo(380, 430, 380, 418);
  cactus.lineTo(380, 398);
  cactus.quadraticCurveTo(386, 388, 392, 398);
  cactus.lineTo(392, 416);
  cactus.lineTo(408, 416);
  cactus.lineTo(408, 380);
  cactus.quadraticCurveTo(420, 362, 432, 380);
  cactus.lineTo(432, 420);
  cactus.lineTo(446, 420);
  cactus.lineTo(446, 404);
  cactus.quadraticCurveTo(452, 394, 458, 404);
  cactus.lineTo(458, 424);
  cactus.quadraticCurveTo(458, 434, 446, 434);
  cactus.lineTo(432, 434);
  cactus.lineTo(432, 486);
  cactus.closePath();
  add('cactus', cactus);
  add('cactusFlower', flower(420, 370, 9));
  add('skirting', bottomBand(650));
  add('chest', roundRect(150, 600, 340, 128, 8));
  add('drawer', roundRect(174, 618, 292, 40, 4));
  const lines = (context: CanvasRenderingContext2D): void => {
    // Les lames des volets, deux oiseaux.
    context.lineWidth = 3;
    for (const right of [false, true])
      for (let k = 0; k < 7; k++) {
        const y = 196 + k * 46;
        segment(context, right ? 498 : 82, y, right ? 558 : 144, y - 4 * (right ? -1 : 1));
      }
    context.lineWidth = 3.5;
    birds(context, [
      [230, 200, 1],
      [262, 186, 0.8],
    ]);
  };
  return { zones, lines };
};
