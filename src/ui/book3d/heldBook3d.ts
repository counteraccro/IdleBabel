import './heldBook3d.css';
import * as THREE from 'three';
import { el, type Component } from '../dom';
import { t } from '../../i18n';
import { createBookMesh } from './bookMesh';
import { createPageCache } from './pageCache';
import { spreadCount } from './pageSource';
import { createTurner, type Turner } from './turner';
import { attachBookGesture } from './bookGesture';
import { createLighting } from './lighting';
import { createAutoTurn3d } from './autoTurn3d';
import { createBookRenderer } from './renderer3d';
import type { Book3d } from './book3dBook';

/** Inclinaison du livre vers le lecteur : la caméra le regarde d'un peu plus bas que d'aplomb. */
const TILT = THREE.MathUtils.degToRad(20);
/** Part de la largeur du canvas occupée par le livre ouvert (le reste : les mains, la marge). */
const FILL = 0.86;
/**
 * Le livre est placé bas dans le canvas : au-dessus, la place qu'il faut à la feuille qui se lève vers le
 * lecteur en tournant (en part de la hauteur de la page visée plus haut que le dos).
 */
const RAISE = 0.18;
/** Le livre penche un peu de côté, comme tenu d'une main plus haute que l'autre (book.css). */
const ROLL = THREE.MathUtils.degToRad(-1.5);
/** Balancement des mains qui tiennent le livre : durée d'un cycle, comme le livre 2D (book.css). */
const SWAY_S = 7;

/**
 * Le livre tenu en main, en 3D : ouvert devant le lecteur, vu à la première personne, caméra fixe. Il
 * bouge à peine, comme tenu par des mains (option « le livre bouge »), et ses pages se tournent au clic,
 * à la main ou seules, au rythme de la production.
 */
export const createHeldBook3d = (spec: Book3d, options: { sway: () => boolean; startSpread?: number }): Component => {
  const root = el('section', 'reading held-book3d');
  const canvas = el('canvas', 'held-book3d-canvas');
  canvas.setAttribute('role', 'button');
  canvas.setAttribute('aria-label', t('ui.read'));
  root.append(canvas);

  const { shape, source } = spec;
  const spreads = spreadCount(source);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
  const { renderer, resize } = createBookRenderer(canvas, camera);
  /** Recule la caméra pour que le livre ouvert tienne dans la largeur du canvas. */
  const place = (): void => {
    const width = 2 * (shape.width + shape.overhang);
    const halfFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const distance = width / 2 / FILL / Math.tan(halfFov);
    const target = new THREE.Vector3(0, shape.height * RAISE, 0);
    camera.position.set(0, target.y - distance * Math.sin(TILT), distance * Math.cos(TILT));
    camera.up.set(0, 1, 0);
    camera.lookAt(target);
  };
  const lighting = createLighting(scene, new THREE.Vector3(0, -1, 2), new THREE.Vector3());
  // Les mains : le livre bouge dans ce groupe, la lumière de la pièce reste où elle est.
  const hands = new THREE.Group();
  hands.rotation.z = ROLL;
  scene.add(hands);

  let dirty = true;
  let book: ReturnType<typeof createBookMesh> | null = null;
  let turner: Turner | null = null;
  void spec.look().then((look) => {
    book = createBookMesh(shape, look);
    book.setOpen(1);
    hands.add(book.root);
    turner = createTurner(book, createPageCache(source), spreads);
    turner.jump(options.startSpread ?? 0);
    dirty = true;
  });

  /** Le lecteur tient une page : les mains ne bougent plus, les pages ne tournent pas seules. */
  let grabbing = false;
  attachBookGesture({
    canvas,
    camera,
    book: () => book?.root ?? null,
    turner: () => turner,
    spreads,
    width: shape.width,
    height: shape.height,
    open: () => true,
    step: (forward) => {
      if (!turner) return;
      const to = turner.target + (forward ? 1 : -1);
      if (to >= 0 && to < spreads) turner.go(to);
    },
    busy: (on) => {
      grabbing = on;
    },
  });
  const autoTurn = spec.turnsPerSecond ? createAutoTurn3d(spec.turnsPerSecond) : null;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');

  let before = performance.now();
  let clock = 0;
  let turning = false;
  const frame = (now: number): void => {
    if (!root.isConnected) return renderer.dispose();
    const dt = Math.min(0.05, (now - before) / 1000);
    before = now;
    if (autoTurn && turner) autoTurn(dt, turner, spreads - 1, !grabbing);
    const moving = turner?.update(dt) ?? false;
    if (resize()) {
      place();
      dirty = true;
    }
    // Les mains ne sont jamais parfaitement immobiles (sauf page tenue, option coupée, mouvements réduits).
    const swaying = options.sway() && !still.matches;
    if (swaying && !grabbing) {
      clock += dt;
      const phase = (2 * Math.PI * clock) / SWAY_S;
      hands.rotation.x = THREE.MathUtils.degToRad(0.9 * Math.sin(phase) + 0.4 * Math.sin(2 * phase));
      hands.rotation.y = THREE.MathUtils.degToRad(0.5 * Math.sin(phase + 1.3));
      hands.rotation.z = ROLL + THREE.MathUtils.degToRad(0.7 * Math.sin(phase + 0.6));
      hands.position.y = 0.006 * Math.sin(phase + 0.3);
    }
    if (swaying || moving || turning || dirty) {
      lighting.follow(camera, new THREE.Vector3(), 0);
      renderer.render(scene, camera);
      dirty = false;
    }
    turning = moving;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  // Débogage : accès au livre depuis la console (window.book3d.turner.hold…).
  (window as unknown as { book3d?: unknown }).book3d = { get book() { return book; }, get turner() { return turner; }, camera, hands };
  return { root, update: () => {} };
};
