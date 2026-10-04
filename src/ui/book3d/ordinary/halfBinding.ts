import { marble } from './marble';
import { GOLD, MCQW, MH, MW, SERIF, type Context } from './mockup';
import type { CoverDetails } from '../../../systems/coverDetails';
import type { Binding } from '../../book/bindings';

/**
 * Demi-reliure (repère de la maquette) : le cuir au dos et aux coins, le reste en papier marbré. `front` :
 * le plat avant (le dos à gauche) ; sinon le plat arrière (le dos à droite).
 */
export const halfBinding = (context: Context, details: CoverDetails, binding: Binding, front: boolean): void => {
  const [strip, leg] = [24 * MCQW, 22 * MCQW];
  context.save();
  context.beginPath();
  context.rect(front ? strip : 0, 0, MW - strip, MH);
  context.clip();
  context.drawImage(marble(details.seed, details.marble, details.marbleKind, MW, MH), 0, 0, MW, MH);
  // Coins de cuir, du côté des bords libres.
  const [cx, dir] = [front ? MW : 0, front ? -1 : 1];
  context.fillStyle = binding.dark;
  for (const cy of [0, MH]) {
    context.beginPath();
    context.moveTo(cx, cy);
    context.lineTo(cx + dir * leg, cy);
    context.lineTo(cx, cy + (cy ? -leg : leg));
    context.closePath();
    context.fill();
  }
  context.restore();
  context.save();
  context.strokeStyle = GOLD;
  context.globalAlpha = 0.85;
  context.lineWidth = 0.4 * MCQW;
  const sx = front ? strip : MW - strip;
  context.beginPath();
  context.moveTo(sx, 0);
  context.lineTo(sx, MH);
  for (const cy of [0, MH]) {
    context.moveTo(cx + dir * leg, cy);
    context.lineTo(cx, cy + (cy ? -leg : leg));
  }
  context.stroke();
  context.fillStyle = 'rgba(0,0,0,0.25)';
  context.fillRect(front ? strip : MW - strip - 0.6 * MCQW, 0, 0.6 * MCQW, MH);
  context.restore();
};

/** Étiquette de papier collée (un peu de travers), double filet à l'encre, une ligne par texte. */
export const paperLabel = (
  context: Context,
  lines: readonly string[],
  cx: number,
  cy: number,
  w: number,
  size: number,
  rotate = 0,
): void => {
  const h = lines.length * size * 1.25 + 4.5 * MCQW;
  context.save();
  context.translate(cx, cy);
  context.rotate(rotate);
  context.shadowColor = 'rgba(0,0,0,0.3)';
  context.shadowBlur = 0.8 * MCQW;
  context.shadowOffsetY = 0.4 * MCQW;
  context.fillStyle = '#efe6cf';
  context.fillRect(-w / 2, -h / 2, w, h);
  context.shadowColor = 'transparent';
  context.strokeStyle = 'rgba(58,42,24,0.75)';
  context.lineWidth = 0.35 * MCQW;
  context.strokeRect(-w / 2 + MCQW, -h / 2 + MCQW, w - 2 * MCQW, h - 2 * MCQW);
  context.lineWidth = 0.15 * MCQW;
  context.strokeRect(-w / 2 + 1.6 * MCQW, -h / 2 + 1.6 * MCQW, w - 3.2 * MCQW, h - 3.2 * MCQW);
  context.fillStyle = '#3a2a18';
  context.font = `${size}px ${SERIF}`;
  context.letterSpacing = `${0.12 * size}px`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  lines.forEach((line, index) => {
    const [y, width, room] = [(index - (lines.length - 1) / 2) * size * 1.25, context.measureText(line).width, w - 5 * MCQW];
    context.save();
    context.translate(0, y);
    if (width > room) context.scale(room / width, 1);
    context.fillText(line, 0, 0);
    context.restore();
  });
  context.restore();
};
