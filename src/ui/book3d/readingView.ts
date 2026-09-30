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
   * Il se referme (false) : elle garde son angle, glisse avec le livre jusqu'à `rest` (le milieu du livre
   * fermé, autour duquel on le fait tourner ensuite) et redevient libre.
   */
  begin: (reading: boolean, rest?: THREE.Vector3) => void;
  /** Avancement du mouvement (vers la vue de lecture, ou vers le livre fermé), de 0 à 1 (au rythme du plat). */
  step: (amount: number) => void;
}

export const createReadingView = (camera: THREE.PerspectiveCamera, controls: OrbitControls): ReadingView => {
  // En coordonnées sphériques autour du point visé : la caméra tourne autour du livre (en ligne droite,
  // partie de derrière, elle le traverserait).
  const from = new THREE.Spherical();
  const to = new THREE.Spherical();
  const fromTarget = new THREE.Vector3();
  const toTarget = new THREE.Vector3();
  const fromCamera = new THREE.Vector3();
  const now = new THREE.Spherical();
  const offset = new THREE.Vector3();
  let locked = false;
  let moving = false;
  /** Le livre se referme : la caméra glisse sans tourner. */
  let closing = false;
  return {
    get locked() {
      return locked;
    },
    begin: (reading, rest) => {
      locked = reading;
      moving = true;
      closing = !reading;
      controls.enabled = !reading;
      fromTarget.copy(controls.target);
      if (closing) {
        toTarget.copy(rest ?? controls.target);
        fromCamera.copy(camera.position);
        return;
      }
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
      if (closing) {
        controls.target.lerpVectors(fromTarget, toTarget, amount);
        camera.position.copy(fromCamera).add(offset.subVectors(controls.target, fromTarget));
        controls.update();
        if (amount >= 1) moving = false;
        return;
      }
      const mix = (a: number, b: number): number => a + (b - a) * amount;
      now.set(mix(from.radius, to.radius), mix(from.phi, to.phi), mix(from.theta, to.theta));
      controls.target.lerpVectors(fromTarget, READING.target, amount);
      camera.position.setFromSpherical(now).add(controls.target);
      controls.update();
      if (amount >= 1) moving = false;
    },
  };
};
