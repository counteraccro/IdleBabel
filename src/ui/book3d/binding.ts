import * as THREE from 'three';
import type { BookShape } from './bookMesh';

/** Aplatissement de l'arrondi du dos (le cuir, et le dos des feuilles qui le remplit). */
export const SPINE_BULGE = 0.55;
/** Largeur du mors : la bande de cuir souple entre le dos et le plat de devant, qui se plie. */
export const JOINT = 0.04;
/** Segments de la reliure : le tour du dos, puis le mors. */
const SPINE_STEPS = 30;
const JOINT_STEPS = 4;

/** Un point (x, z) dans le plan de la tête du livre. */
export type Point = readonly [number, number];

/** Un point de la surface de la reliure, et sa normale (vers l'extérieur du livre). */
interface Sample {
  x: number;
  z: number;
  nx: number;
  nz: number;
}

/**
 * Une bande de cuir de l'épaisseur d'un plat, sur toute la hauteur du livre, qui suit une suite de
 * points. Groupes : 0 le dessus (la peau, texture `uFor`), 1 le dessous (l'intérieur), 2 les tranches
 * (tête, queue).
 */
const createStrip = (steps: number, height: number, board: number, uFor: (step: number) => number) => {
  const count = (steps + 1) * 2 * 2; // pas × (haut, bas) × (dessus, dessous)
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const uvs = new Float32Array(count * 2);
  const index = (step: number, end: number, layer: number): number => (layer * (steps + 1) + step) * 2 + end;
  const outside: number[] = [];
  const inside: number[] = [];
  const rest: number[] = [];
  for (let step = 0; step < steps; step++) {
    const [a, b, c, d] = [index(step, 0, 0), index(step + 1, 0, 0), index(step + 1, 1, 0), index(step, 1, 0)];
    // Dessus : faces tournées vers l'extérieur du livre.
    outside.push(a, c, b, a, d, c);
    const [e, f, g, h] = [index(step, 0, 1), index(step + 1, 0, 1), index(step + 1, 1, 1), index(step, 1, 1)];
    inside.push(e, f, g, e, g, h);
    // Tête et queue : le cuir vu par sa tranche, entre dessus et dessous.
    rest.push(index(step, 1, 0), index(step + 1, 1, 0), index(step + 1, 1, 1), index(step, 1, 0), index(step + 1, 1, 1), index(step, 1, 1));
    rest.push(index(step, 0, 0), index(step + 1, 0, 1), index(step + 1, 0, 0), index(step, 0, 0), index(step, 0, 1), index(step + 1, 0, 1));
  }
  for (let step = 0; step <= steps; step++) {
    for (let end = 0; end < 2; end++) {
      for (let layer = 0; layer < 2; layer++) {
        const i = index(step, end, layer);
        uvs[i * 2] = uFor(step);
        // Même sens que les plats : le haut du livre (end 0, y = +hauteur/2) en haut de l'image.
        uvs[i * 2 + 1] = end === 0 ? 1 : 0;
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex([...outside, ...inside, ...rest]);
  geometry.addGroup(0, outside.length, 0);
  geometry.addGroup(outside.length, inside.length, 1);
  geometry.addGroup(outside.length + inside.length, rest.length, 2);
  /** Place la bande : le dessus sur les points, le dessous une épaisseur de cuir vers l'intérieur. */
  const follow = (samples: Sample[]): void => {
    samples.forEach(({ x, z, nx, nz }, step) => {
      for (let layer = 0; layer < 2; layer++) {
        const side = layer === 0 ? 1 : -1;
        for (let end = 0; end < 2; end++) {
          const i = index(step, end, layer);
          positions[i * 3] = x - layer * board * nx;
          positions[i * 3 + 1] = end === 0 ? height / 2 : -height / 2;
          positions[i * 3 + 2] = z - layer * board * nz;
          // Normale exacte (perpendiculaire à la courbe) : le cuir prend la lumière comme les plats.
          normals[i * 3] = nx * side;
          normals[i * 3 + 1] = 0;
          normals[i * 3 + 2] = nz * side;
        }
      }
    });
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.normal.needsUpdate = true;
    geometry.computeBoundingSphere();
  };
  return { geometry, follow };
};

/** Une courbe de Bézier cubique échantillonnée : points et normales (vers l'extérieur du livre). */
const bezier = (controls: readonly Point[], steps: number): Sample[] =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    const u = 1 - t;
    const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    const dw = [-3 * u * u, 3 * u * u - 6 * u * t, 6 * u * t - 3 * t * t, 3 * t * t];
    const pick = (k: number[], axis: 0 | 1): number => k.reduce((sum, c, j) => sum + c * controls[j][axis], 0);
    const [tx, tz] = [pick(dw, 0), pick(dw, 1)];
    const length = Math.hypot(tx, tz);
    // Courbe réduite à un point (dos aplati, livre grand ouvert) : normale vers le bas, sous le livre.
    return length < 1e-9
      ? { x: pick(w, 0), z: pick(w, 1), nx: 0, nz: -1 }
      : { x: pick(w, 0), z: pick(w, 1), nx: -tz / length, nz: tx / length };
  });

/**
 * La reliure : une bande de cuir souple du plat arrière au plat de devant, en deux morceaux qui se
 * raccordent sans cassure. Le dos : fermé, un demi-ovale bombé derrière les feuilles (du bas du dos à
 * son haut) ; en s'ouvrant, il roule et s'aplatit, jusqu'à passer à plat sous le livre. Le mors : la
 * bande entre le haut du dos et le plat de devant, dans le prolongement de la couverture. Deux peaux :
 * le dos (sans ornement) et le mors (la couverture, sans raccord).
 */
export const createBinding = ({ width, height, thickness, board }: BookShape) => {
  const spine = createStrip(SPINE_STEPS, height, board, (step) => step / SPINE_STEPS);
  const joint = createStrip(JOINT_STEPS, height, board, (step) => ((step / JOINT_STEPS) * JOINT) / width);
  const top = thickness / 2;
  /** Bombé du dos fermé ; 4/3 × rayon : une Bézier cubique qui suit un demi-ovale. */
  const reach = (4 / 3) * SPINE_BULGE * top;
  const rotate = ([x, z]: Point, angle: number): Point => [
    x * Math.cos(angle) - z * Math.sin(angle),
    x * Math.sin(angle) + z * Math.cos(angle),
  ];
  /**
   * `place` : où se trouve un point d'une moitié du livre (couverture et pages lues à gauche ; plat
   * arrière et pages à lire à droite), `left`, `right` : leurs rotations ; `openness` (0 à 1) : ouvert,
   * le dos ne bombe plus : il passe à plat sous le pli. Le dos va du plat arrière au haut
   * du dos, qui suit la couverture ; le mors, droit, prolonge la couverture.
   */
  const bend = (place: (side: 'left' | 'right', point: Point) => Point, left: number, right: number, openness: number): void => {
    const flat = 1 - openness;
    const start = place('right', [0, -top]);
    const outward = rotate([-flat, 0], right);
    const summit = place('left', [0, top]);
    const heading = rotate([flat, 0], left);
    spine.follow(
      bezier(
        [
          start,
          [start[0] + reach * outward[0], start[1] + reach * outward[1]],
          [summit[0] - reach * heading[0], summit[1] - reach * heading[1]],
          summit,
        ],
        SPINE_STEPS,
      ),
    );
    const edge = place('left', [JOINT, top]);
    const along = rotate([1, 0], left);
    joint.follow(
      Array.from({ length: JOINT_STEPS + 1 }, (_, i) => {
        const t = i / JOINT_STEPS;
        return { x: summit[0] + (edge[0] - summit[0]) * t, z: summit[1] + (edge[1] - summit[1]) * t, nx: -along[1], nz: along[0] };
      }),
    );
  };
  return { spine: spine.geometry, joint: joint.geometry, bend };
};
