import * as THREE from 'three';

/**
 * La boîte de ce qui se voit de `object` (dans le monde) : Box3.setFromObject compte aussi les objets
 * cachés, comme les feuilles qui tournent d'un livre fermé (1 × 1, autour du dos), qui débordent devant lui.
 */
export const visibleBox = (object: THREE.Object3D): THREE.Box3 => {
  const box = new THREE.Box3();
  object.updateWorldMatrix(true, true);
  const visit = (node: THREE.Object3D): void => {
    if (!node.visible) return;
    if (node instanceof THREE.Mesh) {
      node.geometry.computeBoundingBox();
      box.union(node.geometry.boundingBox!.clone().applyMatrix4(node.matrixWorld));
    }
    node.children.forEach(visit);
  };
  visit(object);
  return box;
};
