import * as THREE from 'three';
import type { BookShape } from './bookMesh';

/** Contour d'un plat : rectangle à la taille du livre, coins arrondis côté tranche (x = largeur). */
const boardShape = ({ width, height, corner }: BookShape): THREE.Shape => {
  const shape = new THREE.Shape();
  const [left, right, bottom, top] = [0, width, 0, height];
  const round = Math.max(0.001, corner);
  shape.moveTo(left, bottom);
  shape.lineTo(right - round, bottom);
  shape.quadraticCurveTo(right, bottom, right, bottom + round);
  shape.lineTo(right, top - round);
  shape.quadraticCurveTo(right, top, right - round, top);
  shape.lineTo(left, top);
  shape.closePath();
  return shape;
};

/** Colonnes et rangées de la grille d'une face de plat. */
const FACE_COLUMNS = 24;
const FACE_ROWS = 12;
/** Pas du quadrillage dans le carré d'un coin arrondi (comme les segments de la courbe du contour). */
const CORNER_STEPS = 10;

/**
 * Une face de plat (à la hauteur z) en grille de triangles, dans le contour du plat (coins arrondis côté
 * tranche) ; `up` : tournée vers +z (dehors), sinon vers -z (vers les pages).
 */
const boardFace = (shape: BookShape, from: number, z: number, up: boolean): number[] => {
  const width = shape.width - from;
  const { height } = shape;
  const round = Math.max(0.001, shape.corner);
  // Les deux coins arrondis, comme le contour : une courbe de la tranche vers le haut ou le bas.
  const corners = [
    {
      center: [width - round, round],
      curve: [
        [width - round, 0],
        [width, 0],
        [width, round],
      ],
    },
    {
      center: [width - round, height - round],
      curve: [
        [width, height - round],
        [width, height],
        [width - round, height],
      ],
    },
  ].map(({ center, curve: [a, b, c] }) => ({
    center,
    edge: Array.from({ length: 33 }, (_, i) => {
      const t = i / 32;
      return [0, 1].map((k) => (1 - t) ** 2 * a[k] + 2 * (1 - t) * t * b[k] + t ** 2 * c[k]);
    }),
  }));
  /** Un point de la grille, ramené dans le contour s'il tombe hors d'un coin arrondi. */
  const inside = (x: number, y: number): [number, number] => {
    for (const { center, edge } of corners) {
      const [cx, cy] = center;
      // Tolérance : les rangées du quadrillage tombent aux arrondis de calcul près sur le bord du plat.
      if (x <= cx || Math.abs(y - cy) > round + 1e-9 || (cy < height / 2 ? y > cy : y < cy)) continue;
      const angle = Math.atan2(y - cy, x - cx);
      let best = edge[0];
      for (const point of edge) {
        if (Math.abs(Math.atan2(point[1] - cy, point[0] - cx) - angle) < Math.abs(Math.atan2(best[1] - cy, best[0] - cx) - angle))
          best = point;
      }
      if (Math.hypot(x - cx, y - cy) > Math.hypot(best[0] - cx, best[1] - cy)) return [best[0], best[1]];
    }
    return [x, y];
  };
  // Colonnes et rangées régulières, plus un quadrillage serré dans le carré de chaque coin : sans lui, un
  // coin ne tient qu'à un ou deux points de la grille, reliés en corde (un coin cassé, un trou).
  const lines = (length: number, count: number, cuts: [number, number][]): number[] => {
    const regular = Array.from({ length: count + 1 }, (_, i) => (length * i) / count);
    const all = [
      ...regular.filter((v) => cuts.every(([from, to]) => v < from || v > to)),
      ...cuts.flatMap(([from, to]) => Array.from({ length: CORNER_STEPS + 1 }, (_, i) => from + ((to - from) * i) / CORNER_STEPS)),
    ];
    // Sans doublons (à un rien près : une ligne régulière et une ligne du coin peuvent se confondre).
    return all.sort((a, b) => a - b).filter((v, i, sorted) => i === 0 || v - sorted[i - 1] > 1e-9);
  };
  const xs = lines(width, FACE_COLUMNS, [[width - round, width]]);
  const ys = lines(height, FACE_ROWS, [
    [0, round],
    [height - round, height],
  ]);
  const grid = ys.map((y) => xs.map((x) => inside(x, y)));
  const out: number[] = [];
  const push = (...points: [number, number][]): void => {
    for (const [x, y] of up ? points : [points[0], points[2], points[1]]) out.push(x, y, z);
  };
  for (let row = 0; row < ys.length - 1; row++) {
    for (let column = 0; column < xs.length - 1; column++) {
      const [a, b, c, d] = [grid[row][column], grid[row][column + 1], grid[row + 1][column + 1], grid[row + 1][column]];
      push(a, b, c);
      push(a, c, d);
    }
  }
  return out;
};

/**
 * Plat, du dos + `from` jusqu'à la tranche : le contour extrudé sur son épaisseur.
 * UV : la position rapportée à tout le plat (0 à 1), pour que la couverture se poursuive sans
 * raccord sur le mors ; les chants reprennent la même peau. Origine : l'arête côté dos, face intérieure.
 */
export const boardGeometry = (shape: BookShape, from = 0): THREE.BufferGeometry => {
  // Arêtes franches : un plat arrondi creuserait un sillon là où il rejoint le mors ou le dos, et le
  // glisser dessous ferait se chevaucher deux surfaces (bords noirs qui scintillent).
  const geometry = new THREE.ExtrudeGeometry(boardShape({ ...shape, width: shape.width - from }), {
    depth: shape.board,
    bevelEnabled: false,
    curveSegments: 10,
  });
  // Le plat occupe z de 0 (face intérieure) à son épaisseur (face extérieure).
  // Deux peaux : dehors la couverture (groupe 0), dedans le contre-plat (groupe 2) ; chants : groupe 1.
  // L'extrusion ne met des points que sur le contour : les deux faces seraient des plans tendus entre
  // leurs bords, et, courbées avec le livre ouvert, passeraient devant une pile de pages très mince. Elles
  // sont refaites en grille, qui suit la courbure partout.
  const source = geometry.index ? geometry.toNonIndexed() : geometry;
  const at = source.attributes.position;
  const edges: number[] = [];
  for (let k = 0; k < at.count; k += 3) {
    const z = [0, 1, 2].map((corner) => at.getZ(k + corner));
    const flat = Math.abs(z[1] - z[0]) < 1e-6 && Math.abs(z[2] - z[0]) < 1e-6;
    if (!flat) for (let corner = 0; corner < 3; corner++) edges.push(at.getX(k + corner), at.getY(k + corner), at.getZ(k + corner));
  }
  const outer = boardFace(shape, from, shape.board, true);
  const inner = boardFace(shape, from, 0, false);
  const positions = [...outer, ...edges, ...inner];
  const result = new THREE.BufferGeometry();
  result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const uvs: number[] = [];
  for (let i = 0; i < positions.length; i += 3) uvs.push((positions[i] + from) / shape.width, positions[i + 1] / shape.height);
  result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  result.addGroup(0, outer.length / 3, 0);
  result.addGroup(outer.length / 3, edges.length / 3, 1);
  result.addGroup((outer.length + edges.length) / 3, inner.length / 3, 2);
  result.translate(0, -shape.height / 2, 0);
  result.computeVertexNormals();
  geometry.dispose();
  return result;
};
