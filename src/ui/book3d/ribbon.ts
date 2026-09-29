import * as THREE from 'three';

/** Largeur du ruban (en unités de scène : le livre fait 1 de haut). */
export const RIBBON_WIDTH = 0.014;
/** Points le long du ruban : dans le livre (sur la page, du haut au bas), puis le bout qui dépasse. */
export const RIBBON_INSIDE = 16;
export const RIBBON_TAIL = 8;

/** Un point du ruban : ses deux bords (x, y, z), de part et d'autre de sa largeur. */
export type RibbonPoint = [THREE.Vector3Tuple, THREE.Vector3Tuple];

export interface Ribbon {
  mesh: THREE.Mesh;
  /** Pose le ruban le long de ces points (RIBBON_INSIDE + RIBBON_TAIL + 1), du dos jusqu'à son bout. */
  lay: (points: RibbonPoint[]) => void;
}

/**
 * Signet : un ruban de soie cousu en haut du dos, glissé entre deux pages, dont le bout dépasse en bas
 * du livre. Une bande souple, posée point par point par le livre.
 */
export const createRibbon = (color: THREE.ColorRepresentation): Ribbon => {
  const geometry = new THREE.PlaneGeometry(1, 1, 1, RIBBON_INSIDE + RIBBON_TAIL);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.45, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const uv = geometry.attributes.uv;
  return {
    mesh,
    lay: (points) => {
      const position = geometry.attributes.position;
      const last = points.length - 1;
      for (let i = 0; i < position.count; i++) {
        // Du haut du plan (uv.y = 1) au bas : du dos jusqu'au bout du ruban.
        const point = points[Math.round((1 - uv.getY(i)) * last)];
        position.setXYZ(i, ...point[uv.getX(i) < 0.5 ? 0 : 1]);
      }
      position.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
    },
  };
};
