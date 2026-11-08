import * as THREE from 'three';
import { el } from '../dom';
import { createBookMesh, type BookShape } from '../book3d/bookMesh';
import { createLighting } from '../book3d/lighting';
import { createBookRenderer } from '../book3d/renderer3d';
import { createTweens } from '../book3d/tweens';
import { animationNow } from '../animationClock';
import type { BookMesh } from '../book3d/bookMesh';
import { goldBookLook } from './goldBookLook';

/** Un grand livre, ouvert vers son milieu. */
export const GOLD_BOOK_SHAPE: BookShape = { width: 0.78, height: 1, thickness: 0.14, board: 0.018, overhang: 0.03, corner: 0.035 };
const READ = 0.45;
/** Posé devant le joueur, vu d'au-dessus et de face. */
const TILT = THREE.MathUtils.degToRad(48);
/** Part de la largeur du canvas occupée par le livre ouvert. */
const FILL = 0.8;
/** Finesse du rendu, au plus (écrans à haute densité). */
const PIXEL_RATIO = 1.25;
/** Durée de la couverture qui s'ouvre ou se referme. */
const TURN_MS = 900;
/** Une page qui tourne pendant la partie, comme soulevée par une lettre qui s'échappe : sa durée, l'écart minimal entre deux. */
const LEAF_MS = 800;
const LEAF_GAP_MS = 3000;

export interface GoldBook3d {
  root: HTMLElement;
  /** La couverture s'ouvre (fin de la promesse : livre ouvert, la partie peut commencer). */
  open: () => Promise<void>;
  /** Partie finie : le livre se referme. */
  close: () => Promise<void>;
  /** Une lettre s'échappe : parfois, une page tourne (jamais deux à la fois, ni trop souvent). */
  leaf: () => void;
}

/**
 * Le Livre d'or en 3D, ouvert devant le joueur, d'où montent les lettres : le même livre que les autres (bookMesh), relié
 * de maroquin rouge, tranche dorée, pages couvertes de lettres d'or. Fermé hors des parties, il s'ouvre pour l'une et se referme
 * à la fin ; il ne tourne pas ses pages. L'image n'est refaite que s'il bouge ou si le canvas change de taille.
 */
export const createGoldBook3d = (): GoldBook3d => {
  const canvas = el('canvas', 'gold-book-canvas');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
  const { renderer, resize, destroy } = createBookRenderer(canvas, camera);
  // Moins fin que les autres livres : il reste en bas de l'écran, sous les lettres, et se redessine pendant la partie.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, PIXEL_RATIO));
  // Sa taille n'est relue que quand elle change : la lire à chaque image forcerait la mise en page, juste après que les
  // lettres ont bougé.
  let resized = true;
  const sizes = new ResizeObserver(() => (resized = true));
  sizes.observe(canvas);
  createLighting(scene, new THREE.Vector3(0, -1, 2), new THREE.Vector3());
  // Une lueur chaude au-dessus des pages : l'or brille de lui-même.
  const shine = new THREE.PointLight(0xffd27a, 0.5, 3);
  shine.position.set(0, 0, 0.9);
  scene.add(shine);

  const place = (): void => {
    const width = 2 * (GOLD_BOOK_SHAPE.width + GOLD_BOOK_SHAPE.overhang);
    const halfFov = Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect);
    const distance = width / 2 / FILL / Math.tan(halfFov);
    camera.position.set(0, -distance * Math.sin(TILT), distance * Math.cos(TILT));
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
  };

  // Fermé, le livre n'occupe que la moitié droite : on le ramène au milieu.
  const holder = new THREE.Group();
  scene.add(holder);
  const tweens = createTweens();
  let book: BookMesh | null = null;
  let openness = 0;
  const setOpen = (amount: number): void => {
    openness = amount;
    book?.setOpen(amount);
    holder.position.x = (-GOLD_BOOK_SHAPE.width / 2) * (1 - amount);
    drawn = false;
  };
  const turn = (to: number): Promise<void> => {
    const from = openness;
    return tweens.run(TURN_MS, (e) => setOpen(from + (to - from) * e));
  };

  let ready = false;
  let gone = false;
  let pages: ((n: number) => THREE.Texture) | null = null;
  /** Page de gauche visible (paire : la double page commence par elle). */
  let spread = 0;
  const showSpread = (n: number): void => {
    spread = n;
    book?.setPages(pages!(n), pages!(n + 1));
    drawn = false;
  };
  let leafing = false;
  let lastLeaf = 0;
  /** Attente avant la prochaine : de 3 à 6 s, pour que ce ne soit pas réglé comme une horloge. */
  let gap = LEAF_GAP_MS;
  const leaf = (): void => {
    const now = animationNow();
    if (!book || leafing || openness < 1 || now - lastLeaf < gap) return;
    leafing = true;
    lastLeaf = now;
    gap = LEAF_GAP_MS * (1 + Math.random());
    const [front, back] = [pages!(spread + 1), pages!(spread + 2)];
    // Sous la feuille qui se lève, la page de droite suivante ; prise par le coin du haut ou du bas.
    book.setPages(pages!(spread), pages!(spread + 3));
    const corner = Math.random() < 0.5 ? 1 : -1;
    void tweens
      .run(LEAF_MS, (e) => {
        book?.setLeaf(e, front, back, corner);
        drawn = false;
      })
      .then(() => {
        book?.setLeaf(null);
        showSpread(spread + 2);
        leafing = false;
      });
  };

  void goldBookLook().then((made) => {
    if (gone) return;
    pages = made.pages;
    book = createBookMesh(GOLD_BOOK_SHAPE, made.look);
    book.setProgress(READ);
    showSpread(0);
    book.setRibbon(READ);
    holder.add(book.root);
    setOpen(openness);
    ready = true;
  });

  let drawn = false;
  let seen = false;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const frame = (frameTime: number): void => {
    // Écran quitté : le contexte WebGL est rendu tout de suite.
    if (canvas.isConnected) seen = true;
    else if (seen) {
      gone = true;
      sizes.disconnect();
      destroy(scene);
      return;
    }
    tweens.update(animationNow(frameTime), still.matches);
    if (resized && resize()) {
      place();
      drawn = false;
    }
    resized = false;
    if (ready && !drawn && seen) {
      renderer.render(scene, camera);
      drawn = true;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return {
    root: canvas,
    // Sous la couverture, la page du titre.
    open: () => {
      if (pages) showSpread(0);
      return turn(1);
    },
    close: () => turn(0),
    leaf,
  };
};
