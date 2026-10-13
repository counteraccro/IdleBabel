import { arched, birds, circle, cloudPath, frame, segment, sketch, trapeze, tufts, type Drawing } from '../coloringShapes';

/** 1 · La tour : cinq étages sous le soleil, deux nuages, la route, l'herbe (aussi sur la couverture). */
export const tower = (): Drawing => {
  const { zones, add } = sketch();
  add('sky', frame());
  add('sun', circle(470, 172, 46));
  add('cloud1', cloudPath(96, 214, 130));
  add('cloud2', cloudPath(384, 300, 110));
  const hillBack = new Path2D();
  hillBack.moveTo(56, 590);
  hillBack.bezierCurveTo(170, 520, 300, 560, 380, 585);
  hillBack.bezierCurveTo(460, 560, 540, 530, 584, 548);
  hillBack.lineTo(584, 728);
  hillBack.lineTo(56, 728);
  hillBack.closePath();
  add('hillBack', hillBack);
  const ground = new Path2D();
  ground.moveTo(56, 650);
  ground.bezierCurveTo(200, 620, 420, 625, 584, 655);
  ground.lineTo(584, 710);
  ground.quadraticCurveTo(584, 728, 566, 728);
  ground.lineTo(74, 728);
  ground.quadraticCurveTo(56, 728, 56, 710);
  ground.closePath();
  add('ground', ground);
  const road = new Path2D();
  road.moveTo(290, 640);
  road.bezierCurveTo(270, 670, 220, 690, 230, 728);
  road.lineTo(330, 728);
  road.bezierCurveTo(330, 690, 320, 668, 312, 640);
  road.closePath();
  add('road', road);
  // Les étages, du bas vers le haut.
  const [cx, height] = [300, 84];
  let y = 642;
  [250, 210, 172, 136, 102].forEach((w, i) => {
    add(`tier${i}`, trapeze(cx, y, w, w - 22, height));
    y -= height;
  });
  const roof = new Path2D();
  roof.moveTo(cx - 54, y);
  roof.lineTo(cx, y - 58);
  roof.lineTo(cx + 54, y);
  roof.closePath();
  add('roof', roof);
  const flag = new Path2D();
  flag.moveTo(cx, y - 100);
  flag.lineTo(cx + 44, y - 88);
  flag.lineTo(cx, y - 76);
  flag.closePath();
  add('flag', flag);
  add('door', arched(cx - 24, 642 - 64, 48, 64));
  add('win1', arched(cx - 62, 558 - 58, 26, 40));
  add('win2', arched(cx + 36, 558 - 58, 26, 40));
  add('win3', arched(cx - 13, 474 - 58, 26, 40));
  add('win4', arched(cx - 44, 390 - 58, 24, 38));
  add('win5', arched(cx + 20, 390 - 58, 24, 38));
  add('win6', arched(cx - 11, 306 - 54, 22, 34));
  const top = y;
  const lines = (context: CanvasRenderingContext2D): void => {
    context.lineWidth = 4;
    segment(context, cx, top - 58, cx, top - 104);
    // Les rayons du soleil, des oiseaux, des briques, l'herbe.
    context.lineWidth = 3.5;
    for (let a = 0; a < 12; a++) {
      const t = (a / 12) * Math.PI * 2;
      segment(context, 470 + Math.cos(t) * 58, 172 + Math.sin(t) * 58, 470 + Math.cos(t) * 74, 172 + Math.sin(t) * 74);
    }
    birds(context, [
      [150, 130, 1],
      [196, 112, 0.8],
      [520, 270, 0.9],
    ]);
    context.lineWidth = 2.5;
    for (const [x, y] of [
      [220, 610],
      [360, 600],
      [250, 520],
      [340, 440],
      [270, 360],
      [325, 520],
    ])
      context.strokeRect(x, y, 22, 11);
    tufts(context, [
      [110, 690],
      [140, 700],
      [480, 680],
      [520, 700],
      [430, 705],
    ]);
  };
  return { zones, lines };
};
