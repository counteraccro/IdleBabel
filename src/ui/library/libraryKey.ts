import './library.css';
import * as THREE from 'three';
import { el } from '../dom';
import { t } from '../../i18n';
import { createBookRenderer } from '../book3d/renderer3d';

export interface LibraryKey {
  root: HTMLElement;
  /** Montre la clé (un livre rare trouvé), la cache (aucun, ou la bibliothèque déjà ouverte). */
  show: (shown: boolean) => void;
  /** Nom réécrit dans la langue courante. */
  relabel: () => void;
}

/** Au survol, la clé se redresse un peu et brille. */
const LIFT = THREE.MathUtils.degToRad(14);
const RATE = 10;

/** Une vieille clé de laiton : l'anneau, la tige, le collet, le panneton (ses dents). */
const keyModel = (material: THREE.Material): THREE.Group => {
  const key = new THREE.Group();
  const add = (geometry: THREE.BufferGeometry, x: number, y = 0, rotation = 0): void => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0);
    mesh.rotation.z = rotation;
    key.add(mesh);
  };
  add(new THREE.TorusGeometry(0.2, 0.05, 12, 40), -0.62);
  add(new THREE.TorusGeometry(0.08, 0.025, 10, 24), -0.62);
  add(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 16), 0.04, 0, Math.PI / 2);
  add(new THREE.TorusGeometry(0.055, 0.022, 8, 20), -0.38, 0, Math.PI / 2);
  add(new THREE.BoxGeometry(0.06, 0.2, 0.05), 0.42, -0.1);
  add(new THREE.BoxGeometry(0.06, 0.14, 0.05), 0.33, -0.07);
  add(new THREE.BoxGeometry(0.05, 0.1, 0.05), 0.5, -0.05);
  return key;
};

/**
 * La clé de la bibliothèque personnelle, posée à côté de la pile de livres de l'en-tête : un petit
 * modèle 3D de laiton, de travers. Au survol elle se redresse et brille, son nom s'écrit dessous ; au
 * clic, on entre dans la bibliothèque. Un bouton invisible la double pour le clavier.
 */
export const createLibraryKey = (onOpen: () => void): LibraryKey => {
  const root = el('div', 'library-key');
  const canvas = el('canvas', 'library-key-canvas');
  const button = el('button', 'library-key-button', t('ui.library'));
  const caption = el('div', 'library-key-caption', t('ui.library'));
  root.append(canvas, button, caption);
  button.addEventListener('click', onOpen);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 20);
  camera.position.set(0, 0.45, 2.3);
  camera.lookAt(0, 0, 0);
  const { renderer, resize, destroy } = createBookRenderer(canvas, camera);
  renderer.shadowMap.enabled = false;
  scene.add(new THREE.HemisphereLight(0xfff2dc, 0x4a3a28, 1.6));
  const light = new THREE.DirectionalLight(0xffe2b0, 2.6);
  light.position.set(-1.5, 2, 2.5);
  scene.add(light);
  const brass = new THREE.MeshStandardMaterial({
    color: 0xc9a24a,
    metalness: 0.45,
    roughness: 0.35,
    emissive: 0xf0c870,
    emissiveIntensity: 0,
  });
  const key = keyModel(brass);
  // De travers, comme jetée là.
  key.rotation.set(0.5, 0, 0.6);
  scene.add(key);

  let aim = 0;
  let glow = 0;
  let dirty = true;
  canvas.addEventListener('pointerenter', () => (aim = 1));
  canvas.addEventListener('pointerleave', () => (aim = 0));
  button.addEventListener('focus', () => (aim = 1));
  button.addEventListener('blur', () => (aim = 0));
  canvas.addEventListener('click', onOpen);
  canvas.style.cursor = 'pointer';

  let before = performance.now();
  let mounted = false;
  const frame = (now: number): void => {
    if (!root.isConnected) {
      if (mounted) return destroy(scene);
    } else mounted = true;
    const dt = Math.min(0.05, (now - before) / 1000);
    before = now;
    if (glow !== aim) {
      glow = Math.abs(aim - glow) < 0.002 ? aim : glow + (aim - glow) * Math.min(1, dt * RATE);
      key.rotation.z = 0.6 - LIFT * glow;
      brass.emissiveIntensity = 0.35 * glow;
      dirty = true;
    }
    if (resize()) dirty = true;
    if (dirty && !root.hidden) {
      renderer.render(scene, camera);
      dirty = false;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  return {
    root,
    show: (shown) => {
      if (root.hidden === !shown) return;
      root.hidden = !shown;
      dirty = true;
    },
    relabel: () => {
      const label = t('ui.library');
      if (button.textContent !== label) button.textContent = caption.textContent = label;
    },
  };
};
