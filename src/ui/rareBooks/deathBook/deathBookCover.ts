import '@fontsource/unifrakturmaguntia/400.css';
import { messages, t } from '../../../i18n';
import { hashText, seeded } from '../../../core/random';
import { toRoman } from '../../../systems/coverDesign';
import { canvas } from '../../book3d/leatherCover';
import { canvasTexture } from '../../book3d/textures';
import { CQW, HEIGHT, SERIF, WIDTH, wrap, write } from '../draw';
import type * as THREE from 'three';

/** Lettres gothiques du titre et du mode d'emploi. */
export const GOTHIC = "'UnifrakturMaguntia', serif";
const WHITE = '#ece9e2';

/**
 * Un plat du DeathBook : noir mat, à peine plus sombre au bord, râpé aux coins et semé de petites
 * éraflures (toujours les mêmes pour un même plat).
 */
const matte = (seed: string, draw?: (context: CanvasRenderingContext2D) => void): THREE.CanvasTexture => {
  const [node, context] = canvas();
  const shade = context.createRadialGradient(WIDTH / 2, HEIGHT / 2, WIDTH * 0.15, WIDTH / 2, HEIGHT / 2, WIDTH * 0.85);
  shade.addColorStop(0, '#171718');
  shade.addColorStop(1, '#09090a');
  context.fillStyle = shade;
  context.fillRect(0, 0, WIDTH, HEIGHT);
  // Coins usés : le carton gris perce sous le noir.
  for (const [x, y] of [
    [0, 0],
    [WIDTH, 0],
    [0, HEIGHT],
    [WIDTH, HEIGHT],
  ]) {
    const corner = context.createRadialGradient(x, y, 0, x, y, 9 * CQW);
    corner.addColorStop(0, 'rgba(120, 118, 112, 0.35)');
    corner.addColorStop(1, 'rgba(120, 118, 112, 0)');
    context.fillStyle = corner;
    context.fillRect(0, 0, WIDTH, HEIGHT);
  }
  const random = seeded(hashText(`deathBook:${seed}`));
  context.strokeStyle = 'rgba(200, 198, 190, 0.07)';
  context.lineCap = 'round';
  for (let i = 0; i < 40; i++) {
    const [x, y] = [random() * WIDTH, random() * HEIGHT];
    const [length, angle] = [(2 + random() * 10) * CQW, random() * Math.PI];
    context.lineWidth = 0.2 * CQW + random() * 0.4 * CQW;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    context.stroke();
  }
  draw?.(context);
  return canvasTexture(node);
};

/** La couverture : le titre en lettres gothiques blanches, en haut, comme le cahier qu'il imite. */
export const deathBookFront = (): THREE.CanvasTexture =>
  matte('front', (context) =>
    write(context, t('rareBooks.deathBook.cover.0'), WIDTH / 2, HEIGHT * 0.14, { font: `${13 * CQW}px ${GOTHIC}`, color: WHITE }),
  );

/** Le plat arrière : le mode d'emploi, ses règles en chiffres romains, à l'encre blanche. */
export const deathBookBack = (): THREE.CanvasTexture =>
  matte('back', (context) => {
    write(context, t('rareBooks.deathBook.howTo'), WIDTH / 2, 7 * CQW, { font: `${8 * CQW}px ${GOTHIC}`, color: WHITE });
    const size = 3.4 * CQW;
    const [numberRight, left, right] = [16 * CQW, 19 * CQW, 88 * CQW];
    context.font = `${size}px ${SERIF}`;
    context.fillStyle = WHITE;
    context.textBaseline = 'top';
    let y = 24 * CQW;
    messages().rareBooks.deathBook.rules.forEach((rule, index) => {
      context.textAlign = 'right';
      context.fillText(`${toRoman(index + 1)}.`, numberRight, y);
      context.textAlign = 'left';
      for (const line of wrap(context, rule, right - left)) {
        context.fillText(line, left, y);
        y += size * 1.4;
      }
      y += size * 0.9;
    });
  });

/**
 * Le dos : le titre en petit, couché dans la longueur. La peau du dos est tendue sur un dos étroit
 * (`thickness`, la hauteur du livre faisant 1) : le texte y est élargi d'autant pour ne pas s'écraser.
 */
export const deathBookSpine = (thickness: number): THREE.CanvasTexture =>
  matte('spine', (context) => {
    const stretch = WIDTH / (thickness * 2.8) / HEIGHT;
    context.save();
    context.translate(WIDTH / 2, HEIGHT / 2);
    context.scale(stretch, 1);
    context.rotate(Math.PI / 2);
    context.font = `${7 * CQW}px ${GOTHIC}`;
    context.fillStyle = WHITE;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(t('rareBooks.deathBook.cover.0'), 0, 0);
    context.restore();
  });
