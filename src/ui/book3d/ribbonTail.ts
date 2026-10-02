import * as THREE from 'three';

/**
 * Le bout du signet qui pend sous le livre : une chaîne de nœuds reliés par des longueurs fixes (intégration
 * de Verlet), tirée vers le bas de l'écran. Quand le livre (ou la vue) tourne, le bout suit avec son élan,
 * se balance, puis se pose. Tout est dans le repère de la scène.
 */

/** La pesanteur du ruban (unités de scène par s² ; le livre fait 1 de haut). */
const GRAVITY = 30;
/** Part de la vitesse gardée à chaque pas : le ruban de soie se calme en une seconde ou deux. */
const DAMPING = 0.975;
/** Pas de calcul (s), et passes pour remettre chaque longueur à sa place. */
const STEP = 1 / 120;
const PASSES = 6;
/** En dessous de ce déplacement par pas, le ruban est posé (plus besoin de redessiner). */
const AT_REST = 2e-6;

/** Le bas de l'écran, dans la scène : le signet y pend, comme dans un livre tenu face à soi. */
export const screenDown = (camera: THREE.Camera): THREE.Vector3 => new THREE.Vector3(0, -1, 0).applyQuaternion(camera.quaternion);

export interface RibbonTail {
  /** Les nœuds, du point d'attache (0) au bout. */
  nodes: THREE.Vector3[];
  /** Pose les nœuds sans élan. */
  reset: (nodes: THREE.Vector3[]) => void;
  /**
   * Avance de `dt` secondes : le nœud 0 suit `root`, les autres tombent vers `down` (unitaire) ; `keep` ramène
   * un nœud hors du livre. Rend vrai tant que le ruban bouge.
   */
  step: (root: THREE.Vector3, down: THREE.Vector3, dt: number, keep: (node: THREE.Vector3) => void) => boolean;
}

export const createRibbonTail = (segment: number): RibbonTail => {
  let nodes: THREE.Vector3[] = [];
  let previous: THREE.Vector3[] = [];
  let pending = 0;
  /** Le ruban bougeait-il au dernier pas (entre deux pas, on garde la réponse). */
  let moving = false;
  const velocity = new THREE.Vector3();
  const between = new THREE.Vector3();
  return {
    get nodes() {
      return nodes;
    },
    reset: (start) => {
      nodes = start.map((node) => node.clone());
      previous = start.map((node) => node.clone());
      pending = 0;
      moving = true;
    },
    step: (root, down, dt, keep) => {
      if (!nodes.length) return false;
      pending = Math.min(pending + dt, 0.1);
      while (pending >= STEP) {
        let moved = 0;
        pending -= STEP;
        nodes[0].copy(root);
        previous[0].copy(root);
        for (let i = 1; i < nodes.length; i++) {
          velocity.subVectors(nodes[i], previous[i]).multiplyScalar(DAMPING);
          previous[i].copy(nodes[i]);
          nodes[i].add(velocity).addScaledVector(down, GRAVITY * STEP * STEP);
        }
        for (let pass = 0; pass < PASSES; pass++) {
          for (let i = 1; i < nodes.length; i++) {
            between.subVectors(nodes[i], nodes[i - 1]);
            const length = between.length() || 1e-9;
            nodes[i].addScaledVector(between, (segment - length) / length);
          }
          for (let i = 1; i < nodes.length; i++) keep(nodes[i]);
        }
        for (let i = 1; i < nodes.length; i++) moved = Math.max(moved, nodes[i].distanceTo(previous[i]));
        moving = moved > AT_REST;
      }
      return moving;
    },
  };
};
