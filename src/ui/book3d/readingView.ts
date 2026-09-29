import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/** Vue de lecture : un peu au-dessus du livre ouvert, face à lui, légèrement du côté du lecteur. */
const READING = { position: new THREE.Vector3(0, -0.35, 2.4), target: new THREE.Vector3(0, 0, 0) };
/** Largeur du livre ouvert à garder à l'écran (deux pages et leurs plats, un peu de marge). */
const OPEN_WIDTH = 1.9;

export interface ReadingView {
  /** Caméra bloquée : le livre est ouvert, on lit. */
  readonly locked: boolean;
  /**
   * Le livre s'ouvre (true) : la caméra part de là où elle est vers la vue de lecture, puis s'y bloque.
   * Il se referme (false) : elle reste où elle est et redevient libre (on fait tourner le livre fermé).
   */
  begin: (reading: boolean) => void;
  /** Avancement du mouvement vers la vue de lecture, de 0 à 1 (au rythme du plat qui s'ouvre). */
  step: (amount: number) => void;
}

export const createReadingView = (camera: THREE.PerspectiveCamera, controls: OrbitControls): ReadingView => {
  // En coordonnées sphériques autour du point visé : la caméra tourne autour du livre (en ligne droite,
  // partie de derrière, elle le traverserait).
  const from = new THREE.Spherical();
  const to = new THREE.Spherical();
  const fromTarget = new THREE.Vector3();
  const now = new THREE.Spherical();
  const offset = new THREE.Vector3();
  let locked = false;
  let moving = false;
  return {
    get locked() {
      return locked;
    },
    begin: (reading) => {
      locked = reading;
      moving = reading;
      controls.enabled = !reading;
      if (!reading) return;
      fromTarget.copy(controls.target);
      from.setFromVector3(offset.copy(camera.position).sub(fromTarget));
      // Assez de recul pour tout le livre ouvert, même sur un écran étroit.
      const fit = OPEN_WIDTH / 2 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / Math.max(0.1, camera.aspect);
      to.setFromVector3(offset.copy(READING.position).sub(READING.target));
      to.radius = Math.max(to.radius, fit);
      // Par le plus court autour du livre.
      while (to.theta - from.theta > Math.PI) to.theta -= 2 * Math.PI;
      while (from.theta - to.theta > Math.PI) to.theta += 2 * Math.PI;
      camera.up.set(0, 1, 0);
    },
    step: (amount) => {
      if (!moving) return;
      const mix = (a: number, b: number): number => a + (b - a) * amount;
      now.set(mix(from.radius, to.radius), mix(from.phi, to.phi), mix(from.theta, to.theta));
      controls.target.lerpVectors(fromTarget, READING.target, amount);
      camera.position.setFromSpherical(now).add(controls.target);
      controls.update();
      if (amount >= 1) moving = false;
    },
  };
};
