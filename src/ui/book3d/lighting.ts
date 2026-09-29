import * as THREE from 'three';

export interface Lighting {
  /**
   * Oriente les lumières : livre fermé (`closed` 1), elles tournent avec la caméra autour de `target`,
   * la face qu'on regarde reste éclairée comme celle vue de biais ; livre ouvert (0), elles restent
   * dans la pièce, à la place réglée pour lire. Entre les deux, elles glissent de l'une à l'autre.
   */
  follow: (camera: THREE.Camera, target: THREE.Vector3, closed: number) => void;
}

/**
 * Lumière de la pièce : une lueur chaude venue d'en haut à gauche (la lampe), qui porte les ombres ;
 * un fond doux partout (aucune face ne tombe dans le noir) et un peu de lumière froide de la fenêtre,
 * à droite, qui dessine la tranche et le dos. `reference` : d'où la caméra voit le livre quand elles sont
 * à leur place (la vue de biais).
 */
export const createLighting = (scene: THREE.Scene, reference: THREE.Vector3, target: THREE.Vector3): Lighting => {
  const rig = new THREE.Group();
  scene.add(rig);
  rig.add(new THREE.HemisphereLight(0xfff2dc, 0x4a3a28, 1.3));
  const lamp = new THREE.DirectionalLight(0xffe2b0, 2.4);
  // À gauche, à mi-hauteur, à peine vers le lecteur : l'ombre d'une feuille qui tourne déborde d'elle en
  // travers de la page, sur toute sa hauteur (venue de la tête du livre, elle glissait vers le bas).
  lamp.position.set(-1.9, -0.4, 2.8);
  lamp.castShadow = true;
  lamp.shadow.mapSize.set(2048, 2048);
  lamp.shadow.camera.left = -1;
  lamp.shadow.camera.right = 1.5;
  lamp.shadow.camera.top = 1;
  lamp.shadow.camera.bottom = -1;
  lamp.shadow.bias = -0.0015;
  lamp.shadow.normalBias = 0.02;
  lamp.shadow.radius = 4;
  lamp.target.position.set(0.4, 0, 0);
  rig.add(lamp, lamp.target);
  const window_ = new THREE.DirectionalLight(0xc8d4ff, 0.6);
  window_.position.set(2.5, 0.5, -1);
  // Lumière douce venue de devant (la pièce) : le bord avant du bloc, ses feuilles, ne tombe pas dans le noir.
  const room = new THREE.DirectionalLight(0xffe8c8, 0.9);
  room.position.set(0.3, -2.5, 1.2);
  rig.add(window_, room);

  // Orientation de la caméra dans la vue de biais : les lumières tournent de ce qui l'en sépare (comme
  // fixées à elle), sans direction privilégiée même vue exactement de dos.
  const pose = new THREE.PerspectiveCamera();
  pose.position.copy(reference);
  pose.up.set(0, 1, 0);
  pose.lookAt(target);
  const home = pose.quaternion.clone().invert();
  const turn = new THREE.Quaternion();
  const still = new THREE.Quaternion();
  return {
    follow: (camera, center, closed) => {
      // La rotation qui mène la vue de biais à la vue actuelle, appliquée aux lumières autour du centre.
      turn.multiplyQuaternions(camera.quaternion, home);
      rig.quaternion.copy(still).slerp(turn, Math.min(1, Math.max(0, closed)));
      rig.position.copy(center).sub(center.clone().applyQuaternion(rig.quaternion));
    },
  };
};
