import * as THREE from 'three';
import { hashText, seeded } from '../../core/random';
import { canvasTexture } from '../book3d/textures';

const SIZE = 512;

/**
 * Un bois sombre dessiné sur un canevas : un fond de noyer, des veines fines et ondulées dans la longueur
 * (axe vertical de l'image), quelques nœuds. `seed` : chaque pièce du meuble a son fil.
 */
export const woodTexture = (seed: string, base = '#4a2f1d'): THREE.CanvasTexture => {
  const random = seeded(hashText(`wood:${seed}`));
  const node = document.createElement('canvas');
  node.width = SIZE;
  node.height = SIZE;
  const context = node.getContext('2d')!;
  context.fillStyle = base;
  context.fillRect(0, 0, SIZE, SIZE);
  // Les veines : des traits presque droits, plus clairs ou plus sombres, qui ondulent un peu.
  for (let vein = 0; vein < 90; vein++) {
    const x = random() * SIZE;
    const light = random() < 0.5;
    context.strokeStyle = light ? `rgba(150, 100, 60, ${0.08 + random() * 0.12})` : `rgba(20, 10, 4, ${0.12 + random() * 0.2})`;
    context.lineWidth = 0.5 + random() * 2.5;
    const wave = 2 + random() * 6;
    const length = 40 + random() * 120;
    const phase = random() * Math.PI * 2;
    context.beginPath();
    for (let y = -10; y <= SIZE + 10; y += 8) {
      const at = x + Math.sin(y / length + phase) * wave;
      if (y === -10) context.moveTo(at, y);
      else context.lineTo(at, y);
    }
    context.stroke();
  }
  // Deux ou trois nœuds : des ellipses sombres étirées dans le fil.
  for (let knot = 0; knot < 3; knot++) {
    const [x, y] = [random() * SIZE, random() * SIZE];
    const gradient = context.createRadialGradient(x, y, 0, x, y, 14);
    gradient.addColorStop(0, 'rgba(15, 8, 3, 0.55)');
    gradient.addColorStop(1, 'rgba(15, 8, 3, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.ellipse(x, y, 8, 22, 0, 0, Math.PI * 2);
    context.fill();
  }
  const texture = canvasTexture(node);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
};
