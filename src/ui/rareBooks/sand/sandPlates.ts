import { FELL, type Context } from './sandDraw';

/**
 * Les gravures sur bois du Livre de sable (maquette .ai/maquette-sable-pages.html) : une page sur cent environ,
 * au milieu du texte, en travers des deux colonnes. La salle hexagonale est celle de la maquette ; le sablier,
 * la dune et l'escalier sont dans sa manière (cadre, hachures, encre).
 */

/** Une gravure, dans la bande de `y` à `y + h`, entre les marges `left` et `right`. */
export type Plate = (context: Context, left: number, right: number, y: number, h: number, random: () => number) => void;

const INK = 'rgba(34,26,20,0.9)';
const HATCH = 'rgba(34,26,20,0.55)';
const PAPER = '#e9dcbc';
const LIGHT = '#efe3c4';

/**
 * Le cadre d'une gravure : le papier dégagé, le filet, les hachures du fond ; `draw` dessine dedans, l'origine
 * au centre, découpé au cadre. Sous la gravure, « fig. ».
 */
const woodcut = (
  context: Context,
  left: number,
  right: number,
  y: number,
  h: number,
  random: () => number,
  draw: (w: number) => void,
): void => {
  const [cx, w] = [(left + right) / 2, right - left - 40];
  context.fillStyle = PAPER;
  context.fillRect(left + 20, y - 4, w, h + 8);
  context.save();
  context.translate(cx, y + h / 2);
  context.strokeStyle = INK;
  context.lineWidth = 2;
  context.strokeRect(-w / 2 + 6, -h / 2, w - 12, h);
  context.beginPath();
  context.rect(-w / 2 + 7, -h / 2 + 1, w - 14, h - 2);
  context.clip();
  context.lineWidth = 0.8;
  context.strokeStyle = HATCH;
  for (let x = -w / 2; x < w / 2; x += 4) {
    context.beginPath();
    context.moveTo(x, -h / 2);
    context.lineTo(x + 30, h / 2);
    context.stroke();
  }
  draw(w);
  context.restore();
  context.save();
  context.font = `italic 13px ${FELL}`;
  context.textAlign = 'center';
  context.fillStyle = `rgba(34,26,20,${0.8 - random() * 0.22})`;
  context.fillText('fig.', cx, y + h + 22);
  context.restore();
};

/** Une salle de la Bibliothèque : trois pans d'étagères, le puits d'air, la lumière d'en haut. */
const hexRoom: Plate = (context, left, right, y, h, random) =>
  woodcut(context, left, right, y, h, random, () => {
    const [R, wallTop] = [h * 0.42, -h * 0.42];
    const ry = R * 0.38;
    const pts: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 6 + (i * Math.PI) / 3;
      pts.push([Math.cos(a) * R * 1.6, Math.sin(a) * ry + 30]);
    }
    context.fillStyle = '#e4d6b4';
    for (const [a, b] of [
      [3, 4],
      [4, 5],
      [2, 3],
    ]) {
      const [[x0, y0], [x1, y1]] = [pts[a], pts[b]];
      context.beginPath();
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
      context.lineTo(x1, y1 + wallTop - 10);
      context.lineTo(x0, y0 + wallTop - 10);
      context.closePath();
      context.fill();
      context.strokeStyle = INK;
      context.lineWidth = 1.4;
      context.stroke();
      // Les étagères, et les dos des livres en petits traits.
      for (let k = 1; k <= 5; k++) {
        const t = k / 6;
        const [ya, yb] = [y0 + (wallTop - 10) * t, y1 + (wallTop - 10) * t];
        context.beginPath();
        context.moveTo(x0, ya);
        context.lineTo(x1, yb);
        context.stroke();
        const steps = 22;
        context.lineWidth = 0.8;
        for (let s = 0; s < steps; s++) {
          if (random() < 0.2) continue;
          const u = (s + 0.5) / steps;
          const [bx, by] = [x0 + (x1 - x0) * u, ya + (yb - ya) * u];
          context.beginPath();
          context.moveTo(bx, by - 2);
          context.lineTo(bx, by + (wallTop - 10) / 6 + 4);
          context.stroke();
        }
        context.lineWidth = 1.4;
      }
    }
    // Le sol, la balustrade du puits au milieu, et la lumière qui tombe.
    context.fillStyle = LIGHT;
    context.beginPath();
    pts.forEach(([x, py], i) => (i ? context.lineTo(x, py) : context.moveTo(x, py)));
    context.closePath();
    context.fill();
    context.stroke();
    context.fillStyle = 'rgba(34,26,20,0.85)';
    context.beginPath();
    context.ellipse(0, 34, R * 0.55, ry * 0.42, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = INK;
    context.beginPath();
    context.ellipse(0, 28, R * 0.6, ry * 0.48, 0, 0, Math.PI * 2);
    context.stroke();
    const light = context.createLinearGradient(0, -h / 2, 0, 30);
    light.addColorStop(0, 'rgba(250,240,210,0.85)');
    light.addColorStop(1, 'rgba(250,240,210,0)');
    context.fillStyle = light;
    context.beginPath();
    context.moveTo(-18, -h / 2);
    context.lineTo(18, -h / 2);
    context.lineTo(R * 0.5, 30);
    context.lineTo(-R * 0.5, 30);
    context.closePath();
    context.fill();
  });

/** Un sablier sur une table : le sable du haut presque parti, le tas du bas, le filet qui tombe. */
const hourglass: Plate = (context, left, right, y, h, random) =>
  woodcut(context, left, right, y, h, random, (w) => {
    // La table.
    context.fillStyle = LIGHT;
    context.fillRect(-w / 2, h * 0.32, w, h);
    context.strokeStyle = INK;
    context.lineWidth = 1.4;
    context.beginPath();
    context.moveTo(-w / 2, h * 0.32);
    context.lineTo(w / 2, h * 0.32);
    context.stroke();
    const [hw, hh] = [h * 0.2, h * 0.36];
    const cy = h * 0.32 - hh - 8;
    // Les deux plateaux, les montants.
    context.fillStyle = INK;
    context.fillRect(-hw - 14, cy - hh - 8, (hw + 14) * 2, 8);
    context.fillRect(-hw - 14, cy + hh, (hw + 14) * 2, 8);
    context.fillRect(-hw - 10, cy - hh, 4, hh * 2);
    context.fillRect(hw + 6, cy - hh, 4, hh * 2);
    // Le verre.
    const glass = new Path2D();
    glass.moveTo(-hw, cy - hh);
    glass.quadraticCurveTo(-hw, cy - 10, -3, cy);
    glass.quadraticCurveTo(-hw, cy + 10, -hw, cy + hh);
    glass.lineTo(hw, cy + hh);
    glass.quadraticCurveTo(hw, cy + 10, 3, cy);
    glass.quadraticCurveTo(hw, cy - 10, hw, cy - hh);
    glass.closePath();
    context.fillStyle = LIGHT;
    context.fill(glass);
    context.save();
    context.clip(glass);
    // Le sable : un peu en haut, un tas en bas, le filet entre les deux ; pointillé comme une gravure.
    context.fillStyle = 'rgba(34,26,20,0.8)';
    for (let i = 0; i < 900; i++) {
      const [x, py] = [(random() - 0.5) * hw * 2, cy + random() * hh];
      const pile = cy + hh - hh * 0.55 * (1 - Math.abs(x) / hw) ** 1.4;
      if (py > pile) context.fillRect(x, py, 1.3, 1.3);
    }
    for (let i = 0; i < 260; i++) {
      const [x, py] = [(random() - 0.5) * hw * 2, cy - hh * 0.25 + random() * hh * 0.25];
      if (py > cy - hh * 0.25 + Math.abs(x) * 0.15) context.fillRect(x, py, 1.3, 1.3);
    }
    context.fillRect(-0.7, cy, 1.4, hh * 0.5);
    context.restore();
    context.strokeStyle = INK;
    context.lineWidth = 1.4;
    context.stroke(glass);
  });

/** Des dunes jusqu'au bout, un soleil sans rayons. */
const dunes: Plate = (context, left, right, y, h, random) =>
  woodcut(context, left, right, y, h, random, (w) => {
    context.fillStyle = LIGHT;
    context.beginPath();
    context.arc(w * 0.18, -h * 0.18, h * 0.12, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = INK;
    context.lineWidth = 1.2;
    context.stroke();
    for (const [base, amp, phase, freq] of [
      [-h * 0.02, 10, 0.8, 0.03],
      [h * 0.14, 14, 2.4, 0.022],
      [h * 0.3, 18, 4.1, 0.016],
    ]) {
      const ridge = new Path2D();
      ridge.moveTo(-w / 2, h);
      for (let x = -w / 2; x <= w / 2; x += 3) ridge.lineTo(x, base - amp * Math.sin(x * freq + phase));
      ridge.lineTo(w / 2, h);
      ridge.closePath();
      context.fillStyle = LIGHT;
      context.fill(ridge);
      context.save();
      context.clip(ridge);
      // Le versant à l'ombre : des traits serrés, le long de la pente.
      context.strokeStyle = HATCH;
      context.lineWidth = 0.7;
      for (let x = -w / 2; x <= w / 2; x += 3) {
        const slope = Math.cos(x * freq + phase);
        if (slope < 0.1) continue;
        const top = base - amp * Math.sin(x * freq + phase);
        context.beginPath();
        context.moveTo(x, top + 2);
        context.lineTo(x + 6, top + 10 + random() * 14 * slope);
        context.stroke();
      }
      context.restore();
      context.strokeStyle = INK;
      context.lineWidth = 1.4;
      context.stroke(ridge);
    }
  });

/** Un escalier en colimaçon vu d'en haut, qui descend sans fin. */
const staircase: Plate = (context, left, right, y, h, random) =>
  woodcut(context, left, right, y, h, random, () => {
    const R = h * 0.44;
    context.fillStyle = LIGHT;
    context.beginPath();
    context.ellipse(0, 0, R * 1.5, R, 0, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = INK;
    context.lineWidth = 1.4;
    // Des tours de marches de plus en plus petits, de plus en plus sombres, jusqu'au trou noir du milieu.
    for (let turn = 0; turn < 5; turn++) {
      const [outer, inner] = [R * 0.8 ** turn, R * 0.8 ** (turn + 1)];
      context.beginPath();
      context.ellipse(0, 0, outer * 1.5, outer, 0, 0, Math.PI * 2);
      context.stroke();
      const steps = 16;
      for (let s = 0; s < steps; s++) {
        const a = (s / steps) * Math.PI * 2 + turn * 0.2;
        context.beginPath();
        context.moveTo(Math.cos(a) * inner * 1.5, Math.sin(a) * inner);
        context.lineTo(Math.cos(a) * outer * 1.5, Math.sin(a) * outer);
        context.stroke();
      }
      context.fillStyle = `rgba(34,26,20,${0.08 + turn * 0.08})`;
      context.beginPath();
      context.ellipse(0, 0, inner * 1.5, inner, 0, 0, Math.PI * 2);
      context.fill();
    }
    context.fillStyle = 'rgba(34,26,20,0.92)';
    context.beginPath();
    context.ellipse(0, 0, R * 0.8 ** 5 * 1.5, R * 0.8 ** 5, 0, 0, Math.PI * 2);
    context.fill();
  });

export const PLATES: readonly Plate[] = [hexRoom, hourglass, dunes, staircase];
