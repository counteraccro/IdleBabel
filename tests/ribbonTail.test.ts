import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createRibbonTail } from '../src/ui/book3d/ribbonTail';

const SEGMENT = 0.13 / 8;
const down = new THREE.Vector3(0, -1, 0);
const free = (): void => undefined;
const hanging = (root: THREE.Vector3, direction: THREE.Vector3): THREE.Vector3[] =>
  Array.from({ length: 9 }, (_, i) => root.clone().addScaledVector(direction, i * SEGMENT));

describe('bout du signet', () => {
  it('pend au repos sans bouger, à sa longueur', () => {
    const tail = createRibbonTail(SEGMENT);
    const root = new THREE.Vector3();
    tail.reset(hanging(root, down));
    for (let frame = 0; frame < 120; frame++) tail.step(root, down, 1 / 60, free);
    expect(tail.step(root, down, 1 / 60, free)).toBe(false);
    for (let i = 1; i < tail.nodes.length; i++) expect(tail.nodes[i].distanceTo(tail.nodes[i - 1])).toBeCloseTo(SEGMENT, 3);
  });

  it('se balance quand le bas change, puis se pose dans le nouveau sens', () => {
    const tail = createRibbonTail(SEGMENT);
    const root = new THREE.Vector3();
    tail.reset(hanging(root, down));
    // On fait tourner le livre d'un quart de tour : le bas est maintenant à gauche.
    const left = new THREE.Vector3(-1, 0, 0);
    expect(tail.step(root, left, 1 / 60, free)).toBe(true);
    let overshoot = 0;
    for (let frame = 0; frame < 300; frame++) {
      tail.step(root, left, 1 / 60, free);
      overshoot = Math.max(overshoot, tail.nodes[8].y);
    }
    // Il dépasse la verticale de son nouveau bas (son élan), puis s'y pose.
    expect(overshoot).toBeGreaterThan(0.01);
    expect(tail.step(root, left, 1 / 60, free)).toBe(false);
    expect(tail.nodes[8].x).toBeCloseTo(-8 * SEGMENT, 2);
    expect(Math.abs(tail.nodes[8].y)).toBeLessThan(0.01);
  });

  it('ne claque pas comme un fouet : un quart de tour, il dépasse à peine et se pose vite', () => {
    const tail = createRibbonTail(SEGMENT);
    const root = new THREE.Vector3();
    tail.reset(hanging(root, down));
    const left = new THREE.Vector3(-1, 0, 0);
    let overshoot = 0;
    let moving = true;
    // Deux secondes.
    for (let frame = 0; frame < 120; frame++) {
      moving = tail.step(root, left, 1 / 60, free);
      overshoot = Math.max(overshoot, tail.nodes[8].y);
    }
    expect(overshoot).toBeLessThan(0.25 * 8 * SEGMENT);
    expect(moving).toBe(false);
  });

  it("suit son point d'attache", () => {
    const tail = createRibbonTail(SEGMENT);
    const root = new THREE.Vector3();
    tail.reset(hanging(root, down));
    root.set(0.5, 0, 0);
    for (let frame = 0; frame < 300; frame++) tail.step(root, down, 1 / 60, free);
    expect(tail.nodes[0].x).toBe(0.5);
    expect(tail.nodes[8].x).toBeCloseTo(0.5, 2);
  });
});
