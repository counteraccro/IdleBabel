import * as THREE from 'three';

export interface BookRenderer {
  renderer: THREE.WebGLRenderer;
  /** Suit la taille du canvas (et l'aspect de la caméra) ; true s'il a changé de taille. */
  resize: () => boolean;
}

/** Rendu d'un livre 3D sur fond transparent, ombres portées adoucies (la couverture sur les feuilles). */
export const createBookRenderer = (canvas: HTMLCanvasElement, camera: THREE.PerspectiveCamera): BookRenderer => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
  return { renderer, resize };
};
