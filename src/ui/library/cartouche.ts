import * as THREE from 'three';
import { t } from '../../i18n';
import { writeDigits } from '../../core/format';
import { TITLE } from '../rareBooks/draw';
import { babelTextWidth, drawBabelText, hasBabelDigits } from '../babelDigits';

/**
 * Le cartouche de la vitrine (demande de l'auteur, 12/10) : une plaque d'ébène aux coins échancrés, cerclée d'or,
 * fixée au milieu de la corniche et un peu plus haute qu'elle ; en lettres dorées, les livres et les reliques
 * rangés (« 14 livres · 2 reliques » ; les reliques, une fois la première trouvée).
 */
const WIDTH = 0.98;
const HEIGHT = 0.13;
/** Les coins échancrés (quart de cercle creusé), et l'épaisseur de la plaque. */
const NOTCH = 0.027;
const DEPTH = 0.014;
/** Pixels du dessin par unité du meuble. */
const SCALE = 1600;

/** De quoi tracer un contour : une forme three.js ou un canevas (y vers le haut), aux arcs en coordonnées absolues. */
interface Pen {
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  arc: (x: number, y: number, r: number, from: number, to: number) => void;
}

/** Le contour, centré : un rectangle aux coins creusés en quart de cercle (chaque arc tourne vers l'intérieur). */
const outline = (pen: Pen, w: number, h: number, r: number, inset = 0): void => {
  const [x0, x1, y0, y1] = [-w / 2 + inset, w / 2 - inset, -h / 2 + inset, h / 2 - inset];
  pen.moveTo(x0 + r, y0);
  pen.lineTo(x1 - r, y0);
  pen.arc(x1, y0, r, Math.PI, Math.PI / 2);
  pen.lineTo(x1, y1 - r);
  pen.arc(x1, y1, r, -Math.PI / 2, -Math.PI);
  pen.lineTo(x0 + r, y1);
  pen.arc(x0, y1, r, 0, -Math.PI / 2);
  pen.lineTo(x0, y0 + r);
  pen.arc(x0, y0, r, Math.PI / 2, 0);
};

/** Le texte du cartouche : « 14 livres », puis « · 2 reliques » s'il y en a. */
export const cartoucheText = (books: number, relics: number): string => {
  const count = (key: string, n: number): string =>
    writeDigits(n === 1 ? t(`ui.shelfCount.${key}One`) : t(`ui.shelfCount.${key}`).replace('{n}', String(n)));
  return relics > 0 ? `${count('books', books)} · ${count('relics', relics)}` : count('books', books);
};

export interface Cartouche {
  mesh: THREE.Mesh;
  /** Réécrit le cartouche si son texte a changé (une police arrivée : `force`). */
  write: (text: string, force?: boolean) => void;
}

export const createCartouche = (onChange: () => void): Cartouche => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(WIDTH * SCALE);
  canvas.height = Math.round(HEIGHT * SCALE);
  const context = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  // Les faces de la plaque ont pour UV ses coordonnées (en unités du meuble, centrées) : la texture la couvre une fois.
  texture.repeat.set(1 / WIDTH, 1 / HEIGHT);
  texture.offset.set(0.5, 0.5);

  const shape = new THREE.Shape();
  outline(
    {
      moveTo: (x, y) => shape.moveTo(x, y),
      lineTo: (x, y) => shape.lineTo(x, y),
      arc: (x, y, r, from, to) => shape.absarc(x, y, r, from, to, true),
    },
    WIDTH,
    HEIGHT,
    NOTCH,
  );
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
  });
  const face = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0.1 });
  const edge = new THREE.MeshStandardMaterial({ color: 0xb8893a, roughness: 0.35, metalness: 0.45 });
  const mesh = new THREE.Mesh(geometry, [face, edge]);
  mesh.receiveShadow = true;

  const gold = (top: number, bottom: number): CanvasGradient => {
    const gradient = context.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, '#f6e3a1');
    gradient.addColorStop(0.45, '#d4a64c');
    gradient.addColorStop(0.55, '#b07f2c');
    gradient.addColorStop(1, '#e8c56c');
    return gradient;
  };

  // La vitrine quittée, sa scène est libérée (renderer3d.ts, disposeObject) : plus rien à écrire.
  let disposed = false;
  texture.addEventListener('dispose', () => (disposed = true));

  let written = '';
  const write = (text: string, force = false): void => {
    if (disposed || (text === written && !force)) return;
    written = text;
    const [w, h] = [canvas.width, canvas.height];
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, w, h);
    // Repère du dessin : celui de la plaque (y vers le haut), en pixels.
    context.setTransform(SCALE, 0, 0, -SCALE, w / 2, h / 2);
    const path = (inset: number, notch: number): void => {
      context.beginPath();
      outline(
        {
          moveTo: (x, y) => context.moveTo(x, y),
          lineTo: (x, y) => context.lineTo(x, y),
          arc: (x, y, r, from, to) => context.arc(x, y, r, from, to, true),
        },
        WIDTH,
        HEIGHT,
        notch,
        inset,
      );
      context.closePath();
    };
    // L'ébène, un peu plus claire au milieu.
    path(0, NOTCH);
    const wood = context.createRadialGradient(0, 0, 0.05, 0, 0, WIDTH / 2);
    wood.addColorStop(0, '#3a2a1f');
    wood.addColorStop(1, '#1a110c');
    context.fillStyle = wood;
    context.fill();
    // Le filet d'or, puis un second, plus fin, en dedans.
    context.strokeStyle = gold(0, h);
    context.lineWidth = 0.007;
    path(0.006, NOTCH);
    context.stroke();
    context.lineWidth = 0.0025;
    path(0.016, NOTCH + 0.004);
    context.stroke();

    // Les lettres, gravées puis dorées.
    context.setTransform(1, 0, 0, 1, 0, 0);
    const size = Math.round(h * 0.42);
    context.font = `600 ${size}px ${TITLE}`;
    context.textBaseline = 'alphabetic';
    const babel = hasBabelDigits(text);
    const width = babel ? babelTextWidth(context, text, size) : context.measureText(text).width;
    const fit = Math.min(1, (w * 0.84) / width);
    const left = (w - width * fit) / 2;
    const baseline = h / 2 + size * 0.36;
    const draw = (dx: number, dy: number, ink: string | CanvasGradient): void => {
      context.save();
      context.translate(left + dx, baseline + dy);
      context.scale(fit, 1);
      context.fillStyle = ink;
      if (babel) drawBabelText(context, text, 0, -size * 0.8, size, 0);
      else context.fillText(text, 0, 0);
      context.restore();
    };
    draw(0, 3, 'rgba(0, 0, 0, 0.7)');
    draw(0, 0, gold(baseline - size * 0.75, baseline));
    texture.needsUpdate = true;
    onChange();
  };

  // Cinzel peut arriver après le premier dessin : le cartouche se réécrit alors (s'il est encore là).
  void document.fonts?.load(`600 40px ${TITLE}`).then(() => write(written, true));

  return { mesh, write };
};
