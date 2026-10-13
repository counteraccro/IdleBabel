import { frame, oval, poly, roundRect, segment, sketch, type Drawing } from '../coloringShapes';

const along = (a: readonly [number, number], b: readonly [number, number], t: number): [number, number] => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
];

/** Des lettres de Babel qui s'échappent (au trait, sans zone) : des segments [x0, y0, x1, y1]. */
const GLYPHS = [
  [
    [0, -18, 0, 18],
    [0, -6, 12, -16],
    [0, 4, 12, -6],
  ],
  [
    [-10, 18, 0, -18],
    [0, -18, 10, 18],
    [-6, 2, 6, 2],
  ],
  [
    [0, -18, 0, 18],
    [-12, -16, 0, 0],
    [12, -16, 0, 0],
  ],
  [
    [-10, -16, 10, -16],
    [0, -16, 0, 18],
    [-10, 18, 10, 6],
  ],
] as const;

/** 9 · La Mimic : le livre, la tranche vers nous, gueule grande ouverte, yeux de chat, dents une à une, langue, signet. */
export const mimic = (): Drawing => {
  const { zones, add } = sketch();
  add('wall', frame());
  const floor = new Path2D();
  floor.moveTo(56, 580);
  floor.lineTo(584, 580);
  floor.lineTo(584, 710);
  floor.quadraticCurveTo(584, 728, 566, 728);
  floor.lineTo(74, 728);
  floor.quadraticCurveTo(56, 728, 56, 710);
  floor.closePath();
  add('floor', floor);
  add('shadow', oval(320, 650, 250, 26));
  // Le plat du dessous, les pages du bas, la gorge, la mâchoire grande ouverte.
  add('coverBottom', roundRect(96, 596, 448, 42, 12));
  add(
    'ribbon',
    poly([
      [424, 600],
      [452, 600],
      [456, 690],
      [440, 676],
      [424, 692],
    ]),
  );
  add(
    'pagesBottom',
    poly([
      [120, 540],
      [520, 540],
      [520, 598],
      [120, 598],
    ]),
  );
  const [A, B] = [
    [150, 430],
    [500, 370],
  ] as const;
  add('throat', poly([[124, 542], [516, 542], B, A]));
  const tongue = new Path2D();
  tongue.moveTo(214, 542);
  tongue.bezierCurveTo(222, 476, 316, 458, 346, 492);
  tongue.bezierCurveTo(378, 458, 440, 486, 428, 542);
  tongue.closePath();
  add('tongue', tongue);
  add('pagesTop', poly([A, B, [496, 334], [146, 394]]));
  add(
    'coverTop',
    poly([
      [128, 398],
      [514, 332],
      [510, 296],
      [122, 362],
    ]),
  );
  add(
    'coverFace',
    poly([
      [122, 362],
      [510, 296],
      [468, 190],
      [160, 240],
    ]),
  );
  add(
    'spine',
    poly([
      [160, 240],
      [468, 190],
      [462, 174],
      [166, 224],
    ]),
  );
  add('eyeLeft', oval(255, 294, 40, 32, -0.17));
  add('eyeRight', oval(387, 270, 40, 32, -0.17));
  add('pupilLeft', oval(260, 296, 8, 26, -0.17));
  add('pupilRight', oval(392, 272, 8, 26, -0.17));
  // Les dents : en haut, pendues aux pages ; en bas, plantées dans les pages.
  for (let i = 0; i < 6; i++) {
    const [[x0, y0], [x1, y1]] = [along(A, B, 0.04 + i * 0.16), along(A, B, 0.16 + i * 0.16)];
    add(
      `toothTop${i}`,
      poly([
        [x0, y0],
        [x1, y1],
        [(x0 + x1) / 2 + 3, (y0 + y1) / 2 + 40],
      ]),
    );
  }
  for (let i = 0; i < 5; i++) {
    const x0 = 146 + i * 76;
    add(
      `toothBottom${i}`,
      poly([
        [x0, 542],
        [x0 + 48, 542],
        [x0 + 26, 500],
      ]),
    );
  }
  const lines = (context: CanvasRenderingContext2D): void => {
    // Les feuillets, les nerfs du dos, des sourcils fâchés, les lettres.
    context.lineWidth = 2;
    for (let y = 550; y < 596; y += 8) segment(context, 128, y, 512, y);
    context.lineWidth = 3.5;
    for (const t of [0.25, 0.5, 0.75]) {
      const [[x0, y0], [x1, y1]] = [along([166, 224], [462, 174], t), along([160, 240], [468, 190], t)];
      segment(context, x0, y0, x1, y1);
    }
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(212, 250);
    context.lineTo(286, 258);
    context.moveTo(352, 238);
    context.lineTo(424, 214);
    context.stroke();
    context.lineWidth = 3.5;
    (
      [
        [118, 170, -0.3],
        [212, 118, 0.2],
        [500, 128, 0.35],
        [548, 214, -0.2],
      ] as const
    ).forEach(([x, y, angle], i) => {
      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.beginPath();
      for (const [x0, y0, x1, y1] of GLYPHS[i]) {
        context.moveTo(x0, y0);
        context.lineTo(x1, y1);
      }
      context.stroke();
      context.restore();
    });
  };
  return { zones, lines };
};
