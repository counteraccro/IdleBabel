import { crescent, frame, oval, roundRect, segment, sketch, starPath, trapeze, type Drawing } from '../coloringShapes';

/** 2 · Le livre et la lampe : un livre ouvert sur la table, la lampe allumée, la fenêtre de nuit et sa lune. */
export const lamp = (): Drawing => {
  const { zones, add } = sketch();
  add('wall', frame());
  add('window', roundRect(96, 120, 210, 250, 10));
  add('night', roundRect(116, 140, 170, 210, 4));
  add('moon', crescent(226, 200, 32, 16, 28));
  add('star1', starPath(150, 180, 14));
  add('star2', starPath(170, 290, 11));
  const top = new Path2D();
  top.moveTo(56, 520);
  top.lineTo(584, 520);
  top.lineTo(584, 560);
  top.lineTo(56, 560);
  top.closePath();
  add('tableTop', top);
  const front = new Path2D();
  front.moveTo(56, 560);
  front.lineTo(584, 560);
  front.lineTo(584, 710);
  front.quadraticCurveTo(584, 728, 566, 728);
  front.lineTo(74, 728);
  front.quadraticCurveTo(56, 728, 56, 710);
  front.closePath();
  add('tableFront', front);
  // Le livre ouvert, sa couverture dessous (un peu plus petit, à gauche de la lampe).
  const BOOK = new DOMMatrix().translate(250, 510).scale(0.85).translate(-300, -510);
  const book = (path: Path2D): Path2D => {
    const moved = new Path2D();
    moved.addPath(path, BOOK);
    return moved;
  };
  const cover = new Path2D();
  cover.moveTo(118, 548);
  cover.lineTo(132, 470);
  cover.quadraticCurveTo(220, 452, 300, 478);
  cover.quadraticCurveTo(380, 452, 468, 470);
  cover.lineTo(482, 548);
  cover.quadraticCurveTo(390, 532, 300, 552);
  cover.quadraticCurveTo(210, 532, 118, 548);
  cover.closePath();
  add('cover', book(cover));
  const left = new Path2D();
  left.moveTo(132, 536);
  left.lineTo(146, 462);
  left.quadraticCurveTo(230, 444, 300, 470);
  left.lineTo(300, 540);
  left.quadraticCurveTo(220, 522, 132, 536);
  left.closePath();
  add('pageLeft', book(left));
  const right = new Path2D();
  right.moveTo(300, 470);
  right.quadraticCurveTo(370, 444, 454, 462);
  right.lineTo(468, 536);
  right.quadraticCurveTo(380, 522, 300, 540);
  right.closePath();
  add('pageRight', book(right));
  // La lampe.
  add('lampBase', oval(505, 512, 52, 13));
  add('lampStem', roundRect(497, 300, 16, 210, 4));
  add('shade', trapeze(505, 310, 136, 84, 120));
  const lines = (context: CanvasRenderingContext2D): void => {
    // Croisée de la fenêtre, lignes du livre, les rayons de la lampe, le fil, le tiroir.
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(201, 140);
    context.lineTo(201, 350);
    context.moveTo(116, 245);
    context.lineTo(286, 245);
    context.stroke();
    context.lineWidth = 2;
    context.save();
    context.transform(BOOK.a, BOOK.b, BOOK.c, BOOK.d, BOOK.e, BOOK.f);
    for (let i = 0; i < 6; i++) {
      const y = 478 + i * 9;
      context.beginPath();
      context.moveTo(160 + i, y + 4);
      context.quadraticCurveTo(225, y - 8, 286, y + 8);
      context.stroke();
      context.beginPath();
      context.moveTo(314, y + 8);
      context.quadraticCurveTo(375, y - 8, 440 - i, y + 4);
      context.stroke();
    }
    context.restore();
    context.lineWidth = 3;
    context.setLineDash([10, 9]);
    for (const dx of [-60, 0, 60]) segment(context, 505 + dx * 0.8, 330, 505 + dx * 1.3, 440);
    context.setLineDash([]);
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(556, 516);
    context.bezierCurveTo(572, 536, 590, 520, 584, 500);
    context.stroke();
    context.lineWidth = 2.5;
    segment(context, 56 + 30, 640, 584 - 30, 640);
    context.beginPath();
    context.arc(320, 640, 8, 0, Math.PI * 2);
    context.stroke();
  };
  return { zones, lines };
};
