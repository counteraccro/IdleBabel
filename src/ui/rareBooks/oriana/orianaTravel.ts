import { messages } from '../../../i18n';
import { hashText, seeded } from '../../../core/random';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { PAGE_CENTER, wrap, write } from '../draw';
import { DISPLAY, HAND, MONO } from './orianaCover';
import { unbreakable } from './orianaProse';

/**
 * Le carnet de voyage, au milieu du chapitre « Le tour du monde » : des tampons de passeport, deux par page,
 * et ses légendes au stylo, trop longues. Le dernier tampon, « USA », est en pointillé : pas encore.
 */

const { width: WIDTH } = PAGE_TEXTURE;
const PEN = '#2a3a6a';
/** Papier kraft du carnet. */
export const KRAFT = ['#f3ead6', '#eadfc6', '#dccfb2'] as const;

interface Stamp {
  city: string;
  date: string;
  color: string;
  round: boolean;
}

/** Les tampons de chaque page (le nom de la ville comme sur un vrai tampon, dans sa langue). */
const STAMPS: readonly (readonly Stamp[])[] = [
  [
    { city: 'LISBOA', date: '14.03', color: '#2b4f8a', round: false },
    { city: 'PORTO', date: '17.03', color: '#9a5b2f', round: true },
  ],
  [
    { city: 'TOKYO', date: '02.11', color: '#9a2f2f', round: false },
    { city: 'KYOTO', date: '06.11', color: '#2f6a45', round: true },
  ],
  [
    { city: 'REYKJAVÍK', date: '21.06', color: '#2f6a45', round: true },
    { city: 'DUBLIN', date: '25.06', color: '#2b4f8a', round: false },
  ],
  [
    { city: 'MARRAKECH', date: '09.01', color: '#6a3f8a', round: false },
    { city: 'ISTANBUL', date: '15.01', color: '#9a2f2f', round: true },
  ],
  [
    { city: 'MONTRÉAL', date: '30.09', color: '#9a2f2f', round: true },
    { city: 'BERLIN', date: '12.10', color: '#555555', round: false },
  ],
];
export const TRAVEL_PAGES = STAMPS.length + 1;

/** Un tampon à l'encre un peu passée, penché ; en pointillé : celui qu'elle n'a pas encore. */
const stamp = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  angle: number,
  { city, date, color, round }: Stamp,
  dashed = false,
): void => {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.globalAlpha = dashed ? 0.55 : 0.8;
  if (dashed) context.setLineDash([9, 8]);
  if (round) {
    for (const radius of [size, size - 9]) {
      context.beginPath();
      context.arc(0, 0, radius, 0, Math.PI * 2);
      context.stroke();
    }
  } else {
    context.strokeRect(-size * 1.2, -size * 0.7, size * 2.4, size * 1.4);
    context.strokeRect(-size * 1.2 + 7, -size * 0.7 + 7, size * 2.4 - 14, size * 1.4 - 14);
  }
  context.setLineDash([]);
  const name = Math.round(size * (round ? 0.24 : 0.3));
  write(context, city, 0, -name * 1.1, { font: `700 ${name}px ${MONO}`, color });
  write(context, date, 0, name * 0.5, { font: `${Math.round(name * 0.75)}px ${MONO}`, color });
  context.restore();
};

/** Le vol d'un tampon à l'autre : une ligne pointillée au stylo. */
const flight = (context: CanvasRenderingContext2D, from: [number, number], to: [number, number]): void => {
  context.save();
  context.strokeStyle = PEN;
  context.globalAlpha = 0.5;
  context.lineWidth = 1.5;
  context.setLineDash([3, 7]);
  context.beginPath();
  context.moveTo(...from);
  context.quadraticCurveTo((from[0] + to[0]) / 2 + 80, (from[1] + to[1]) / 2 - 40, ...to);
  context.stroke();
  context.restore();
};

/** La légende au stylo, en bas de la page, un peu de travers. */
const caption = (context: CanvasRenderingContext2D, text: string, top: number): void => {
  context.save();
  context.translate(PAGE_CENTER, top);
  context.rotate(-0.025);
  context.font = `30px ${HAND}`;
  wrap(context, unbreakable(text), WIDTH - 150).forEach((line, index) =>
    write(context, line, -(WIDTH - 150) / 2, index * 34, { font: context.font, color: PEN, align: 'left' }),
  );
  context.restore();
};

/** La page `index` du carnet (0 : la première, avec son titre ; la dernière : la place gardée pour les États-Unis). */
export const travelPage = (context: CanvasRenderingContext2D, index: number): void => {
  const { travelTitle, captions, soon, notYet } = messages().rareBooks.oriana;
  const random = seeded(hashText(`oriana:travel:${index}`));
  if (index === 0) write(context, travelTitle, PAGE_CENTER, 50, { font: `italic 38px ${DISPLAY}`, color: '#3a2c20' });
  if (index === STAMPS.length) {
    stamp(context, 230, 330, 105, -0.06, { city: 'USA', date: soon, color: '#555555', round: true }, true);
    write(context, notYet, 370, 315, { font: `34px ${HAND}`, color: PEN, align: 'left' });
  } else {
    const [first, second] = STAMPS[index];
    const at: [number, number][] = [
      [190, 230],
      [440, 410],
    ];
    flight(context, [at[0][0] + 60, at[0][1] + 40], [at[1][0] - 60, at[1][1] - 50]);
    stamp(context, ...at[0], 76, (random() - 0.5) * 0.5, first);
    stamp(context, ...at[1], 76, (random() - 0.5) * 0.5, second);
  }
  caption(context, captions[index], 560);
};
