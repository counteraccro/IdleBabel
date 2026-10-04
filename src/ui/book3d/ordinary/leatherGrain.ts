import { rng, type Context } from './mockup';

/** Grain du cuir (repère de la maquette, `w` × `h`) : pores, reflets, petits plis ; `strength` les atténue. */
export const leatherGrain = (context: Context, w: number, h: number, seed: number, strength = 1): void => {
  const random = rng(seed + 3);
  context.save();
  for (let i = 0; i < (w * h) / 22; i++) {
    context.fillStyle = `rgba(0,0,0,${(0.05 + random() * 0.12) * strength})`;
    context.fillRect(random() * w, random() * h, 1 + random() * 1.6, 1 + random() * 1.2);
  }
  for (let i = 0; i < (w * h) / 80; i++) {
    context.fillStyle = `rgba(255,228,190,${(0.03 + random() * 0.05) * strength})`;
    context.fillRect(random() * w, random() * h, 1.3, 1.3);
  }
  context.lineWidth = 0.9;
  for (let i = 0; i < (w * h) / 2200; i++) {
    const [x, y, angle, length] = [random() * w, random() * h, random() * Math.PI, 6 + random() * 24];
    context.strokeStyle = `rgba(0,0,0,${0.13 * strength})`;
    context.beginPath();
    context.moveTo(x, y);
    context.quadraticCurveTo(
      x + (Math.cos(angle) * length) / 2 + (random() - 0.5) * 8,
      y + (Math.sin(angle) * length) / 2 + (random() - 0.5) * 8,
      x + Math.cos(angle) * length,
      y + Math.sin(angle) * length,
    );
    context.stroke();
  }
  context.restore();
};
