import {
  bottomBand,
  circle,
  cloudPath,
  flower,
  frame,
  oval,
  poly,
  roundRect,
  segment,
  sketch,
  tufts,
  type Drawing,
} from '../coloringShapes';

/** 4 · Le lapin : de face, comme un enfant le dessine, dans l'herbe, une carotte et des fleurs. */
export const rabbit = (): Drawing => {
  const { zones, add } = sketch();
  add('sky', frame());
  add('sun', circle(500, 150, 40));
  add('cloud', cloudPath(96, 196, 112));
  add('grass', bottomBand(600, 8));
  add('earLeft', oval(268, 222, 32, 96, -0.14));
  add('earLeftIn', oval(268, 232, 15, 70, -0.14));
  add('earRight', oval(372, 222, 32, 96, 0.14));
  add('earRightIn', oval(372, 232, 15, 70, 0.14));
  add('body', oval(320, 530, 108, 112));
  add('belly', oval(320, 552, 64, 74));
  add('armLeft', oval(226, 512, 24, 50, 0.45));
  add('armRight', oval(414, 512, 24, 50, -0.45));
  add('footLeft', oval(266, 642, 50, 24));
  add('footRight', oval(374, 642, 50, 24));
  add('head', circle(320, 356, 94));
  add('cheekLeft', circle(274, 414, 12));
  add('cheekRight', circle(366, 414, 12));
  add('eyeLeft', oval(286, 334, 15, 20));
  add('eyeRight', oval(354, 334, 15, 20));
  add('shineLeft', circle(291, 326, 5));
  add('shineRight', circle(359, 326, 5));
  const nose = new Path2D();
  nose.moveTo(304, 372);
  nose.quadraticCurveTo(320, 364, 336, 372);
  nose.quadraticCurveTo(330, 388, 320, 390);
  nose.quadraticCurveTo(310, 388, 304, 372);
  nose.closePath();
  add('nose', nose);
  add('teeth', roundRect(309, 406, 22, 18, 3));
  add(
    'carrot',
    poly([
      [96, 664],
      [190, 626],
      [198, 652],
    ]),
  );
  const carrotTop = new Path2D();
  carrotTop.moveTo(192, 638);
  carrotTop.quadraticCurveTo(212, 596, 228, 612);
  carrotTop.quadraticCurveTo(224, 626, 206, 632);
  carrotTop.quadraticCurveTo(240, 622, 236, 642);
  carrotTop.closePath();
  add('carrotTop', carrotTop);
  add('flower1', flower(520, 650, 22));
  add('flower1c', circle(520, 650, 8));
  add('flower2', flower(470, 600, 16));
  add('flower2c', circle(470, 600, 6));
  add('flower3', flower(140, 590, 16));
  add('flower3c', circle(140, 590, 6));
  const lines = (context: CanvasRenderingContext2D): void => {
    // La bouche, les moustaches, les doigts des pattes, les tiges, l'herbe, les stries de la carotte.
    context.lineWidth = 3.5;
    context.beginPath();
    context.moveTo(320, 390);
    context.lineTo(320, 404);
    context.moveTo(298, 402);
    context.quadraticCurveTo(310, 410, 320, 404);
    context.quadraticCurveTo(330, 410, 342, 402);
    context.stroke();
    context.lineWidth = 2.5;
    for (const side of [-1, 1])
      for (const [dy, ey] of [
        [-8, -18],
        [-2, -2],
        [4, 12],
      ])
        segment(context, 320 + side * 36, 384 + dy, 320 + side * 92, 384 + ey);
    for (const [x, y] of [
      [256, 652],
      [276, 652],
      [364, 652],
      [384, 652],
    ])
      segment(context, x, y, x, y - 12);
    context.lineWidth = 3;
    for (const [x, y] of [
      [520, 672],
      [470, 616],
      [140, 606],
    ])
      segment(context, x, y, x, y + 34);
    tufts(
      context,
      [
        [90, 712],
        [200, 700],
        [440, 708],
        [560, 700],
      ],
      18,
      14,
      7,
    );
    context.lineWidth = 2;
    for (const t of [0.3, 0.55, 0.8]) {
      const [x, y] = [96 + (194 - 96) * t, 664 + (639 - 664) * t];
      segment(context, x, y - 8 * t, x + 6, y + 6);
    }
  };
  return { zones, lines };
};
