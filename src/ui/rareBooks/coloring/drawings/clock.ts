import { LINE, ROUND } from '../coloringDraw';
import { arched, bottomBand, circle, frame, oval, roundRect, segment, sketch, type Drawing } from '../coloringShapes';

/** 7 · L'horloge : une comtoise, son balancier, un tableau au mur, un tapis. */
export const clock = (): Drawing => {
  const { zones, add } = sketch();
  add('wall', frame());
  add('floor', bottomBand(668));
  add('picture', roundRect(80, 180, 100, 130, 4));
  add('pictureIn', roundRect(94, 194, 72, 102, 2));
  add('pictureMoon', circle(130, 232, 16));
  add('rug', oval(320, 700, 220, 22));
  add('finial', circle(320, 102, 14));
  add('hood', arched(200, 116, 240, 236));
  add('face', circle(320, 238, 92));
  add('body', roundRect(232, 352, 176, 296, 6));
  add('window', arched(272, 416, 96, 196));
  add('bob', circle(320, 560, 30));
  add('base', roundRect(214, 646, 212, 40, 6));
  add('center', circle(320, 238, 9));
  const lines = (context: CanvasRenderingContext2D): void => {
    // La tige du balancier, les aiguilles, les heures, les moulures.
    context.lineWidth = 4;
    segment(context, 320, 432, 320, 530);
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(320, 238);
    context.lineTo(320, 178);
    context.moveTo(320, 238);
    context.lineTo(364, 256);
    context.stroke();
    context.fillStyle = LINE;
    context.font = `600 17px ${ROUND}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    for (let hour = 1; hour <= 12; hour++) {
      const a = (hour / 12) * Math.PI * 2 - Math.PI / 2;
      context.fillText(String(hour), 320 + Math.cos(a) * 74, 239 + Math.sin(a) * 74);
    }
    context.textBaseline = 'alphabetic';
    context.lineWidth = 2.5;
    for (const y of [372, 392]) segment(context, 250, y, 390, y);
  };
  return { zones, lines };
};
