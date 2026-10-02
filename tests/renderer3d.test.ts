import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { releaseSharedTextures } from '../src/ui/book3d/renderer3d';

describe('rendu 3D quitté', () => {
  it('se décroche de la table DFG que three.js partage entre tous ses rendus', () => {
    // La table partagée, et un rendu qui s'y est accroché en l'envoyant à la carte graphique.
    const lut = new THREE.DataTexture(new Uint8Array(4), 1, 1);
    let attached = true;
    const onDispose = (): void => {
      attached = false;
      lut.removeEventListener('dispose', onDispose);
    };
    lut.addEventListener('dispose', onDispose);
    const material = new THREE.MeshStandardMaterial();
    const scene = new THREE.Scene();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
    const properties = new WeakMap<object, unknown>([[material, { uniforms: { dfgLUT: { value: lut } } }]]);
    const renderer = { properties: { get: (object: object) => properties.get(object) ?? {} } } as unknown as THREE.WebGLRenderer;
    releaseSharedTextures(renderer, scene);
    expect(attached).toBe(false);
  });
});
