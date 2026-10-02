/**
 * Les fers de la reliure orientale des Mille et Une Nuits : le maroquin, l'or poussé au fer, ses étoiles,
 * cartouches, médaillons et rinceaux. Repris tels quels de .ai/maquette-nuits.html (piste C), dans ses unités
 * (plat 640 × 800, dos 110 × 800) et avec son hasard, pour que le grain et l'usure soient les mêmes.
 */

/** Le hasard de la maquette (Park-Miller) : mêmes graines, mêmes grains. */
export const rng = (seed: number) => (): number => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const MOROCCO = ['#6a1f22', '#2c0a0c'] as const;

/** L'or : un dégradé en biais, sombre aux bouts, clair aux deux tiers. */
const gold = (context: CanvasRenderingContext2D, width: number, height: number): CanvasGradient => {
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#8a6424');
  gradient.addColorStop(0.35, '#f3d68a');
  gradient.addColorStop(0.55, '#c9a24f');
  gradient.addColorStop(0.8, '#f3d68a');
  gradient.addColorStop(1, '#8a6424');
  return gradient;
};

/** Grains du maroquin dessinés d'un morceau (moins d'une milliseconde). */
const GRAINS_PER_STEP = 400;

/**
 * Le maroquin : dégradé, grain fin en petits cailloux (ombre et reflet), bords frottés. Long (32 000 grains
 * sur un plat) : il s'arrête tous les GRAINS_PER_STEP grains (slowDrawing.ts).
 */
export function* morocco(context: CanvasRenderingContext2D, width: number, height: number, seed: number): Generator<void> {
  const shade = context.createRadialGradient(
    width / 2,
    height * 0.45,
    Math.min(width, height) * 0.1,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.75,
  );
  shade.addColorStop(0, MOROCCO[0]);
  shade.addColorStop(1, MOROCCO[1]);
  context.fillStyle = shade;
  context.fillRect(0, 0, width, height);
  const random = rng(seed * 4241);
  for (let grain = 0; grain < (width * height) / 16; grain++) {
    const [x, y] = [random() * width, random() * height];
    const [rx, ry, angle] = [0.8 + random() * 1.6, 0.6 + random() * 1.1, random() * Math.PI];
    context.fillStyle = `rgba(0,0,0,${0.08 + random() * 0.12})`;
    context.beginPath();
    context.ellipse(x + 0.6, y + 0.6, rx, ry, angle, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = `rgba(255,190,170,${random() * 0.05})`;
    context.beginPath();
    context.ellipse(x - 0.4, y - 0.4, rx * 0.7, ry * 0.7, angle, 0, Math.PI * 2);
    context.fill();
    if (grain % GRAINS_PER_STEP === GRAINS_PER_STEP - 1) yield;
  }
  const rubbed = (x0: number, y0: number, x1: number, y1: number): CanvasGradient => {
    const gradient = context.createLinearGradient(x0, y0, x1, y1);
    gradient.addColorStop(0, 'rgba(170,110,90,0.25)');
    gradient.addColorStop(1, 'rgba(170,110,90,0)');
    return gradient;
  };
  context.fillStyle = rubbed(0, 0, 0, 16);
  context.fillRect(0, 0, width, 16);
  context.fillStyle = rubbed(0, height, 0, height - 16);
  context.fillRect(0, height - 16, width, 16);
  context.fillStyle = rubbed(width, 0, width - 12, 0);
  context.fillRect(width - 12, 0, 12, height);
}

/** L'or poussé au fer : l'empreinte s'enfonce (ombre), l'or la remplit, un reflet sur les traits. */
export const tooled = (
  context: CanvasRenderingContext2D,
  draw: (context: CanvasRenderingContext2D) => void,
  width: number,
  height: number,
): void => {
  context.save();
  context.translate(0.9, 1.1);
  context.strokeStyle = context.fillStyle = 'rgba(15,0,0,0.55)';
  draw(context);
  context.restore();
  context.save();
  context.strokeStyle = context.fillStyle = gold(context, width, height * 0.6);
  draw(context);
  context.restore();
  // Le reflet : sur les traits seulement (les pleins resteraient délavés).
  context.save();
  context.translate(-0.5, -0.6);
  context.globalAlpha = 0.25;
  context.strokeStyle = '#fff3cf';
  context.fillStyle = 'rgba(0,0,0,0)';
  draw(context);
  context.restore();
};

/** L'or frotté : des grains de cuir reparaissent là où la main se pose (bords, bas du plat). */
export const rubGold = (context: CanvasRenderingContext2D, width: number, height: number, seed: number): void => {
  const random = rng(seed * 977);
  for (let speck = 0; speck < 2200; speck++) {
    const nearEdge = random() < 0.7;
    const x = nearEdge ? (random() < 0.5 ? random() * 90 : width - random() * 90) : random() * width;
    const y = nearEdge && random() < 0.5 ? height - random() * 120 : random() * height;
    context.fillStyle = `rgba(80,20,22,${0.25 + random() * 0.45})`;
    context.fillRect(x, y, 1 + random() * 2, 1 + random() * 1.5);
  }
};

/** Une étoile à huit branches (deux carrés croisés), au trait. */
export const star8 = (context: CanvasRenderingContext2D, x: number, y: number, radius: number): void => {
  context.beginPath();
  for (let point = 0; point < 16; point++) {
    const angle = (point / 16) * Math.PI * 2 - Math.PI / 2;
    const reach = point % 2 ? radius * 0.72 : radius;
    context.lineTo(x + Math.cos(angle) * reach, y + Math.sin(angle) * reach);
  }
  context.closePath();
  context.stroke();
};

/** Une petite rosace pleine (bouton et huit pétales). */
export const rose = (context: CanvasRenderingContext2D, x: number, y: number, radius: number): void => {
  for (let petal = 0; petal < 8; petal++) {
    const angle = (petal / 8) * Math.PI * 2;
    context.beginPath();
    context.ellipse(
      x + Math.cos(angle) * radius * 0.55,
      y + Math.sin(angle) * radius * 0.55,
      radius * 0.42,
      radius * 0.17,
      angle,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
  context.beginPath();
  context.arc(x, y, radius * 0.22, 0, Math.PI * 2);
  context.fill();
};

/** Un cartouche de la bordure : carré au trait, deux étoiles, une rosace, des losanges aux coins. */
export const cell = (context: CanvasRenderingContext2D, x: number, y: number, size: number): void => {
  context.lineWidth = 1.4;
  context.strokeRect(x + 3, y + 3, size - 6, size - 6);
  context.lineWidth = 1.6;
  star8(context, x + size / 2, y + size / 2, size * 0.4);
  context.lineWidth = 1;
  star8(context, x + size / 2, y + size / 2, size * 0.27);
  rose(context, x + size / 2, y + size / 2, size * 0.14);
  for (const [dx, dy] of [
    [6, 6],
    [size - 6, 6],
    [6, size - 6],
    [size - 6, size - 6],
  ]) {
    context.beginPath();
    context.moveTo(x + dx, y + dy - 4);
    context.lineTo(x + dx + 4, y + dy);
    context.lineTo(x + dx, y + dy + 4);
    context.lineTo(x + dx - 4, y + dy);
    context.fill();
  }
};

/** Un coin de la bordure : une grosse rosace dans un cercle et une étoile. */
export const cornerCell = (context: CanvasRenderingContext2D, x: number, y: number, size: number): void => {
  context.lineWidth = 1.4;
  context.strokeRect(x + 3, y + 3, size - 6, size - 6);
  context.lineWidth = 1.2;
  context.beginPath();
  context.arc(x + size / 2, y + size / 2, size * 0.4, 0, Math.PI * 2);
  context.stroke();
  context.lineWidth = 1.4;
  star8(context, x + size / 2, y + size / 2, size * 0.36);
  rose(context, x + size / 2, y + size / 2, size * 0.24);
};

/** Le contour polylobé d'un médaillon (une ellipse festonnée de `lobes` lobes), comme chemin. */
export const lobed = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  lobes: number,
  bulge = 1.13,
): void => {
  context.beginPath();
  for (let lobe = 0; lobe <= lobes; lobe++) {
    const angle = (lobe / lobes) * Math.PI * 2 - Math.PI / 2;
    const middle = ((lobe - 0.5) / lobes) * Math.PI * 2 - Math.PI / 2;
    const [px, py] = [x + Math.cos(angle) * rx, y + Math.sin(angle) * ry];
    if (lobe === 0) context.moveTo(px, py);
    else context.quadraticCurveTo(x + Math.cos(middle) * rx * bulge, y + Math.sin(middle) * ry * bulge, px, py);
  }
  context.closePath();
};

/** Un rinceau : une tige en S qui s'enroule au bout, avec trois feuilles (`dir` : vers la droite ou la gauche). */
export const scroll = (context: CanvasRenderingContext2D, x: number, y: number, length: number, dir: number): void => {
  context.lineWidth = 1.3;
  context.beginPath();
  context.moveTo(x, y);
  context.bezierCurveTo(x + dir * length * 0.3, y - 14, x + dir * length * 0.6, y + 14, x + dir * length * 0.85, y);
  context.stroke();
  // La volute du bout.
  context.beginPath();
  for (let turn = 0; turn < Math.PI * 2.2; turn += 0.15) {
    const radius = 8 - turn * 1.1;
    context.lineTo(x + dir * (length * 0.85 + Math.sin(turn) * radius), y - 8 + Math.cos(turn) * radius);
  }
  context.stroke();
  for (const [at, side] of [
    [0.25, -1],
    [0.5, 1],
    [0.7, -1],
  ]) {
    context.beginPath();
    context.ellipse(x + dir * length * at, y + side * 9, 6, 2.2, dir * side * 0.6, 0, Math.PI * 2);
    context.fill();
  }
};
