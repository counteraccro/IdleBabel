import * as THREE from 'three';

export interface BookRenderer {
  renderer: THREE.WebGLRenderer;
  /** Suit la taille du canvas (et l'aspect de la caméra) ; true s'il a changé de taille. */
  resize: () => boolean;
  /**
   * Le livre quitte l'écran : ses formes, matières et images sont libérées, et le contexte WebGL rendu
   * tout de suite (le navigateur n'en garde qu'une quinzaine ; au-delà, il retire le plus ancien : le décor).
   */
  destroy: (scene: THREE.Object3D) => void;
}

/** Libère tout ce que porte un objet 3D : ses formes, ses matières et leurs images. */
export const disposeObject = (root: THREE.Object3D): void =>
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    for (const material of [object.material].flat()) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
      material.dispose();
    }
  });

/** Rendu d'un livre 3D sur fond transparent, ombres portées adoucies (la couverture sur les feuilles). */
export const createBookRenderer = (canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera): BookRenderer => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  // Ombres adoucies : PCFSoftShadowMap n'existe plus dans three.js, PCF l'a remplacée (flou réglé par shadow.radius).
  renderer.shadowMap.type = THREE.PCFShadowMap;
  let size = '';
  const resize = (): boolean => {
    const { clientWidth: width, clientHeight: height } = canvas;
    if (!width || !height || `${width}x${height}` === size) return false;
    size = `${width}x${height}`;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    return true;
  };
  const destroy = (scene: THREE.Object3D): void => {
    disposeObject(scene);
    renderer.dispose();
    renderer.forceContextLoss();
  };
  return { renderer, resize, destroy };
};
