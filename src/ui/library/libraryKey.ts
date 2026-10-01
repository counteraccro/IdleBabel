import * as THREE from 'three';
import { t } from '../../i18n';
import type { PileOrnament } from '../book3d/pile3d';

/** Une vieille clé de laiton : l'anneau, la tige, le collet, le panneton (ses dents). Longue de 1,3 environ. */
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

/** Taille de la clé : un peu plus haute que la pile de livres. */
const SCALE = 0.5;

/**
 * La clé de la bibliothèque personnelle, debout au pied de la pile de livres de l'en-tête, appuyée contre
 * elle : au survol elle brille et son nom s'écrit dessous ; au clic, on entre dans la bibliothèque (`onOpen`).
 */
export const libraryKey = (onOpen: () => void): PileOrnament => {
  const brass = new THREE.MeshStandardMaterial({
    color: 0xc9a24a,
    metalness: 0.45,
    roughness: 0.35,
    emissive: 0xf0c870,
    emissiveIntensity: 0,
  });
  return {
    // Le même nom que la page ouverte (openBook) : dans la bibliothèque, la clé n'est plus contre la pile.
    id: 'library',
    label: () => t('ui.library'),
    model: () => {
      const key = keyModel(brass);
      // Debout, l'anneau en haut, face au lecteur ; le bout du panneton posé en y = 0.
      key.rotation.z = -Math.PI / 2;
      key.scale.setScalar(SCALE);
      key.position.y = 0.55 * SCALE;
      // Une zone invisible un peu plus large qu'elle : une clé si fine, dans une si petite pile, se rate.
      const hit = new THREE.Mesh(new THREE.BoxGeometry(0.55 * SCALE, 1.4 * SCALE, 0.12), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = 0.7 * SCALE;
      const holder = new THREE.Group();
      holder.add(key, hit);
      return holder;
    },
    glow: (amount) => {
      brass.emissiveIntensity = 0.45 * amount;
    },
    onOpen,
    lean: 0.3,
    dz: 0.3,
  };
};
