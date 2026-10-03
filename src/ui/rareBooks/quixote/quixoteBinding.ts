import '@fontsource/old-standard-tt/400.css';
import '@fontsource/old-standard-tt/400-italic.css';
import '@fontsource/old-standard-tt/700.css';
import '@fontsource/im-fell-english/400.css';
import '@fontsource/im-fell-english/400-italic.css';
import { messages } from '../../../i18n';
import { HEIGHT, WIDTH, board } from '../draw';
import { rng } from '../arabianNights/arabianNightsOrnaments';
import type { Drawing } from '../slowDrawing';

/**
 * La reliure du grand Doré de Hachette (1863), piste A de .ai/maquette-quichotte.html (validée) : percaline
 * rouge, grande plaque dorée et noire (encadrements, écoinçons, le trophée du chevalier), dos orné de bandes
 * dorées. Dessinée dans les unités de la maquette (plat 640 × 800, dos 110 × 800) mises à l'échelle, avec le
 * même hasard : même grain de toile.
 */
export const RED = ['#9a2a26', '#5c1412'] as const;
export const DIDOT = "'Old Standard TT', Georgia, serif";
export const FELL = "'IM Fell English', Georgia, serif";
/** Le noir des plaques poussées à froid. */
const INK = '#1a0d0b';
const [W, H] = [640, 800];
/** Les plats sont dessinés à l'échelle de la maquette (640 de large). */
const K = WIDTH / W;

export const loadQuixoteFonts = (): Promise<unknown> =>
  Promise.all(
    [`40px ${DIDOT}`, `italic 40px ${DIDOT}`, `700 40px ${DIDOT}`, `40px ${FELL}`, `italic 40px ${FELL}`].map((font) =>
      document.fonts.load(font),
    ),
  );

/** Du texte posé par sa ligne de base. */
const print = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color: string | CanvasGradient,
  spacing = 0,
): void => {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.letterSpacing = `${spacing}px`;
  context.fillText(text, x, y);
  context.letterSpacing = '0px';
};

/** Du texte poussé à l'or : un creux sombre décalé, puis l'or. */
const gilt = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  gold: CanvasGradient,
  spacing = 0,
): void => {
  print(context, text, x + 1, y + 1.5, font, 'rgba(0,0,0,0.45)', spacing);
  print(context, text, x, y, font, gold, spacing);
};

/** L'or, en biais sur toute la pièce (comme sur la maquette). */
const goldOver = (context: CanvasRenderingContext2D, width: number, height: number): CanvasGradient => {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#8a6a2c');
  gradient.addColorStop(0.35, '#f2d68e');
  gradient.addColorStop(0.55, '#c9a24f');
  gradient.addColorStop(0.8, '#f2d68e');
  gradient.addColorStop(1, '#8a6a2c');
  return gradient;
};

/** La percaline : toile teinte, grain chagriné serré, trame fine, bords frottés jusqu'au carton. */
function* cloth(context: CanvasRenderingContext2D, width: number, height: number, seed: number): Generator<void> {
  const ground = context.createLinearGradient(0, 0, width, height);
  ground.addColorStop(0, RED[1]);
  ground.addColorStop(0.45, RED[0]);
  ground.addColorStop(1, RED[1]);
  context.fillStyle = ground;
  context.fillRect(0, 0, width, height);
  const random = rng(seed);
  const grains = (width * height) / 10;
  for (let grain = 0; grain < grains; grain++) {
    context.fillStyle = random() < 0.55 ? 'rgba(0,0,0,0.13)' : 'rgba(255,255,255,0.05)';
    context.fillRect(random() * width, random() * height, 1 + random() * 1.5, 1);
    if (grain % 4000 === 3999) yield;
  }
  context.fillStyle = 'rgba(0,0,0,0.05)';
  for (let y = 0; y < height; y += 3) context.fillRect(0, y, width, 1);
  context.fillStyle = 'rgba(255,255,255,0.025)';
  for (let x = 0; x < width; x += 3) context.fillRect(x, 0, 1, height);
  // Les bords frottés : en tête, en pied, et du côté de la tranche (à droite, comme sur la maquette).
  const rub = (x0: number, y0: number, x1: number, y1: number): CanvasGradient => {
    const gradient = context.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, 'rgba(230,200,170,0.22)');
    gradient.addColorStop(1, 'rgba(230,200,170,0)');
    return gradient;
  };
  context.fillStyle = rub(0, 0, 0, 16);
  context.fillRect(0, 0, width, 16);
  context.fillStyle = rub(0, height, 0, height - 16);
  context.fillRect(0, height - 16, width, 16);
  context.fillStyle = rub(width, 0, width - 14, 0);
  context.fillRect(width - 14, 0, 14, height);
}

/** Un écoinçon : un quart de volute dans un angle. */
const corner = (context: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, gold: CanvasGradient, scale = 1): void => {
  context.save();
  context.translate(x, y);
  context.scale(sx * scale, sy * scale);
  context.strokeStyle = gold;
  context.fillStyle = gold;
  context.lineWidth = 1.4;
  context.beginPath();
  context.moveTo(0, 22);
  context.bezierCurveTo(0, 6, 6, 0, 22, 0);
  context.stroke();
  context.beginPath();
  context.moveTo(4, 16);
  context.bezierCurveTo(9, 9, 16, 9, 16, 4);
  context.stroke();
  context.beginPath();
  context.moveTo(22, 0);
  context.bezierCurveTo(30, 0, 32, 6, 27, 8);
  context.stroke();
  context.beginPath();
  context.moveTo(0, 22);
  context.bezierCurveTo(0, 30, 6, 32, 8, 27);
  context.stroke();
  context.beginPath();
  context.arc(13, 13, 2.2, 0, Math.PI * 2);
  context.fill();
  context.restore();
};

/** Une frise de petits losanges et de points (les bandes du dos). */
const frieze = (context: CanvasRenderingContext2D, x0: number, x1: number, y: number, gold: CanvasGradient, step: number): void => {
  context.fillStyle = gold;
  for (let x = x0; x <= x1; x += step) {
    context.beginPath();
    context.moveTo(x, y - 3.5);
    context.lineTo(x + 2.5, y);
    context.lineTo(x, y + 3.5);
    context.lineTo(x - 2.5, y);
    context.fill();
    if (x + step / 2 < x1) {
      context.beginPath();
      context.arc(x + step / 2, y, 1.1, 0, Math.PI * 2);
      context.fill();
    }
  }
};

/**
 * Le trophée du chevalier : la rondache bosselée, la lance (et son fanion) et l'épée croisées derrière,
 * l'armet de Mambrin (le plat à barbe échancré) posé dessus.
 */
const trophy = (context: CanvasRenderingContext2D, cx: number, cy: number, gold: CanvasGradient): void => {
  context.save();
  context.translate(cx, cy);
  context.lineCap = 'round';
  context.lineJoin = 'round';
  /** Une pièce poussée : son creux sombre, puis l'or. */
  const pushed = (draw: (color: string | CanvasGradient) => void): void => {
    context.save();
    context.translate(1.2, 1.8);
    draw('rgba(0,0,0,0.4)');
    context.restore();
    draw(gold);
  };
  const path = (points: number[][], fill = true): void => {
    context.beginPath();
    points.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)));
    if (fill) {
      context.closePath();
      context.fill();
    } else context.stroke();
  };
  // La lance, de bas à gauche vers haut à droite ; son fanion.
  pushed((color) => {
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = 5;
    path(
      [
        [-150, 150],
        [140, -140],
      ],
      false,
    );
    path([
      [140, -140],
      [150, -162],
      [160, -150],
    ]);
    path([
      [150, -162],
      [174, -176],
      [154, -136],
    ]);
    context.beginPath();
    context.moveTo(126, -126);
    context.quadraticCurveTo(150, -112, 170, -124);
    context.lineTo(148, -100);
    context.quadraticCurveTo(134, -104, 112, -112);
    context.closePath();
    context.fill();
    context.lineWidth = 9;
    path(
      [
        [-118, 118],
        [-104, 104],
      ],
      false,
    );
  });
  // L'épée, de bas à droite vers haut à gauche : lame, garde, fusée, pommeau.
  pushed((color) => {
    context.strokeStyle = color;
    context.fillStyle = color;
    context.lineWidth = 4;
    path(
      [
        [110, 110],
        [-120, -120],
      ],
      false,
    );
    path(
      [
        [-120, -120],
        [-130, -130],
      ],
      false,
    );
    context.lineWidth = 6;
    path(
      [
        [84, 108],
        [108, 84],
      ],
      false,
    );
    context.lineWidth = 5;
    path(
      [
        [98, 98],
        [126, 126],
      ],
      false,
    );
    context.beginPath();
    context.arc(130, 130, 7, 0, Math.PI * 2);
    context.fill();
  });
  // La rondache : disque, cercles, rayons, clous, l'umbo au centre.
  pushed((color) => {
    context.fillStyle = color;
    context.beginPath();
    context.arc(0, 12, 82, 0, Math.PI * 2);
    context.fill();
  });
  context.fillStyle = INK;
  context.beginPath();
  context.arc(0, 12, 74, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = gold;
  context.lineWidth = 1.2;
  context.beginPath();
  context.arc(0, 12, 66, 0, Math.PI * 2);
  context.stroke();
  for (let ray = 0; ray < 16; ray++) {
    const angle = (ray / 16) * Math.PI * 2;
    path(
      [
        [Math.cos(angle) * 26, 12 + Math.sin(angle) * 26],
        [Math.cos(angle) * 62, 12 + Math.sin(angle) * 62],
      ],
      false,
    );
  }
  context.fillStyle = gold;
  for (let nail = 0; nail < 24; nail++) {
    const angle = (nail / 24) * Math.PI * 2;
    context.beginPath();
    context.arc(Math.cos(angle) * 70, 12 + Math.sin(angle) * 70, 1.6, 0, Math.PI * 2);
    context.fill();
  }
  context.beginPath();
  context.arc(0, 12, 22, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = 'rgba(0,0,0,0.25)';
  context.beginPath();
  context.arc(4, 16, 13, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = gold;
  context.beginPath();
  context.arc(-2, 10, 8, 0, Math.PI * 2);
  context.fill();
  // L'armet de Mambrin : un plat à barbe à l'envers, son large bord, l'échancrure pour le cou.
  pushed((color) => {
    context.fillStyle = color;
    context.beginPath();
    context.ellipse(0, -84, 60, 9, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(-38, -86);
    context.bezierCurveTo(-36, -132, 36, -132, 38, -86);
    context.closePath();
    context.fill();
  });
  context.fillStyle = INK;
  context.beginPath();
  context.ellipse(-30, -82, 13, 6, 0, 0, Math.PI);
  context.fill();
  context.strokeStyle = INK;
  context.lineWidth = 1;
  context.beginPath();
  context.ellipse(0, -84, 52, 5.5, 0, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(-26, -100);
  context.quadraticCurveTo(0, -122, 22, -112);
  context.stroke();
  context.restore();
};

/** Le petit armet de Mambrin du dos et du plat arrière. */
const basin = (context: CanvasRenderingContext2D, cx: number, cy: number, gold: CanvasGradient): void => {
  context.save();
  context.translate(cx, cy);
  context.fillStyle = gold;
  context.beginPath();
  context.ellipse(0, 0, 26, 4, 0, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.moveTo(-17, -1);
  context.bezierCurveTo(-16, -22, 16, -22, 17, -1);
  context.closePath();
  context.fill();
  context.fillStyle = RED[1];
  context.beginPath();
  context.ellipse(-13, 1, 6, 3, 0, 0, Math.PI);
  context.fill();
  context.restore();
};

/** Les encadrements d'un plat : double filet doré, large bande noire, filets fins, écoinçons. */
const frames = (context: CanvasRenderingContext2D, gold: CanvasGradient): void => {
  context.strokeStyle = 'rgba(0,0,0,0.4)';
  context.lineWidth = 2;
  context.strokeRect(25, 25, W - 48, H - 48);
  context.strokeStyle = gold;
  context.lineWidth = 2;
  context.strokeRect(24, 24, W - 48, H - 48);
  context.lineWidth = 0.8;
  context.strokeRect(31, 31, W - 62, H - 62);
  context.strokeStyle = INK;
  context.lineWidth = 9;
  context.strokeRect(46, 46, W - 92, H - 92);
  context.strokeStyle = gold;
  context.lineWidth = 0.8;
  context.strokeRect(40, 40, W - 80, H - 80);
  context.strokeRect(52, 52, W - 104, H - 104);
  for (const [x, y, sx, sy] of [
    [60, 60, 1, 1],
    [W - 60, 60, -1, 1],
    [60, H - 60, 1, -1],
    [W - 60, H - 60, -1, -1],
  ])
    corner(context, x, y, sx, sy, gold, 1.6);
};

/** Une pièce de la reliure : `draw` y dessine par morceaux (yield : une pause possible). */
function* piece(draw: (context: CanvasRenderingContext2D) => Generator<void>): Drawing {
  const canvas = board(RED[0], RED[1]).image as HTMLCanvasElement;
  yield* draw(canvas.getContext('2d')!);
  return canvas;
}

/** Le plat : la plaque, le titre, le trophée, l'auteur et l'illustrateur. */
export const quixoteFront = (): Drawing =>
  piece(function* (context) {
    context.save();
    context.scale(K, K);
    yield* cloth(context, W, H, 7);
    const gold = goldOver(context, W, H);
    frames(context, gold);
    const [over, title, under, author, artist] = messages().rareBooks.quixote.front;
    gilt(context, over, W / 2, 150, `700 22px ${DIDOT}`, gold, 5);
    context.fillStyle = gold;
    context.fillRect(W / 2 - 90, 168, 180, 1.2);
    gilt(context, title, W / 2, 236, `700 50px ${DIDOT}`, gold, 2);
    context.fillStyle = gold;
    context.fillRect(W / 2 - 90, 258, 180, 1.2);
    gilt(context, under, W / 2, 292, `700 22px ${DIDOT}`, gold, 5);
    trophy(context, W / 2, 480, gold);
    gilt(context, author, W / 2, 680, `700 26px ${DIDOT}`, gold, 6);
    gilt(context, artist, W / 2, 712, `400 14px ${DIDOT}`, gold, 3);
    context.restore();
  });

/**
 * Le plat arrière (pas sur la maquette) : la même plaque sans titre ni trophée, l'armet de Mambrin au centre.
 * Vu retourné : sa tranche est à gauche, ses bords frottés aussi.
 */
export const quixoteBack = (): Drawing =>
  piece(function* (context) {
    context.save();
    context.translate(WIDTH, 0);
    context.scale(-K, K);
    yield* cloth(context, W, H, 8);
    context.restore();
    context.save();
    context.scale(K, K);
    const gold = goldOver(context, W, H);
    frames(context, gold);
    context.save();
    context.translate(W / 2, H / 2);
    context.scale(2.4, 2.4);
    basin(context, 0, 6, gold);
    context.restore();
    context.restore();
  });

/**
 * Le dos : bandes ornées, le titre dans un cartouche noir, bandes, le petit armet, l'illustrateur et l'éditeur
 * entre d'autres bandes.
 */
export const quixoteSpine = (thickness: number): Drawing =>
  piece(function* (context) {
    // Dessiné sans déformation, à l'échelle de la maquette : `width` est la largeur visible du dos.
    const stretch = WIDTH / (thickness * 1.4) / HEIGHT;
    const scale = HEIGHT / H;
    const width = WIDTH / stretch / scale;
    context.save();
    context.translate(WIDTH / 2, 0);
    context.scale(stretch * scale, scale);
    context.translate(-width / 2, 0);
    yield* cloth(context, width, H, 19);
    // L'arrondi du dos : plus sombre sur les bords.
    const round = context.createLinearGradient(0, 0, width, 0);
    round.addColorStop(0, 'rgba(0,0,0,0.45)');
    round.addColorStop(0.3, 'rgba(0,0,0,0)');
    round.addColorStop(0.7, 'rgba(0,0,0,0)');
    round.addColorStop(1, 'rgba(0,0,0,0.45)');
    context.fillStyle = round;
    context.fillRect(0, 0, width, H);
    const gold = goldOver(context, width, 0);
    /** Une bande ornée : filets, frise, filets. */
    const band = (y: number): void => {
      context.fillStyle = gold;
      context.fillRect(8, y, width - 16, 1.4);
      context.fillRect(8, y + 4, width - 16, 0.7);
      frieze(context, 14, width - 14, y + 13, gold, 12);
      context.fillStyle = gold;
      context.fillRect(8, y + 22, width - 16, 0.7);
      context.fillRect(8, y + 26, width - 16, 1.4);
    };
    const [first, second, author, artist, publisher] = messages().rareBooks.quixote.spine;
    band(20);
    band(110);
    // Le titre, dans un cartouche noir.
    context.fillStyle = INK;
    context.fillRect(10, 160, width - 20, 120);
    context.strokeStyle = gold;
    context.lineWidth = 1;
    context.strokeRect(13, 163, width - 26, 114);
    gilt(context, first, width / 2, 205, `700 18px ${DIDOT}`, gold, 2);
    gilt(context, second, width / 2, 232, `700 11px ${DIDOT}`, gold, 0.3);
    context.fillStyle = gold;
    context.fillRect(width / 2 - 12, 248, 24, 1);
    gilt(context, author, width / 2, 266, `9px ${DIDOT}`, gold, 1);
    band(310);
    basin(context, width / 2, 440, gold);
    band(520);
    gilt(context, artist, width / 2, 600, `italic 12px ${DIDOT}`, gold, 1);
    band(640);
    gilt(context, publisher, width / 2, 718, `9px ${DIDOT}`, gold, 1.5);
    band(746);
    context.restore();
  });
