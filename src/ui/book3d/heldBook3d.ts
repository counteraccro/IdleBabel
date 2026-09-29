import './heldBook3d.css';
import * as THREE from 'three';
import { el, type Component } from '../dom';
import { t } from '../../i18n';
import { createBookMesh, type BookMesh } from './bookMesh';
import { createPageCache } from './pageCache';
import { spreadCount } from './pageSource';
import { createTurner, type Turner } from './turner';
import { attachBookGesture } from './bookGesture';
import { createLighting } from './lighting';
import { createAutoTurn3d } from './autoTurn3d';
import { createBookRenderer } from './renderer3d';
import { createHeldPose } from './heldPose';
import { createTweens } from './tweens';
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
/** Fin du livre, comme le livre 2D (bookClose.ts) : il se referme, descend, le suivant remonte. */
const CLOSE_MS = 1000;
const LOWER_MS = 500;
const RAISE_MS = 550;
/** Livre neuf fermé : sa couverture s'ouvre au clic. */
const OPEN_MS = 900;

export interface HeldBookOptions {
  /** Option « le livre bouge » : les mains ne sont jamais parfaitement immobiles. */
  sway: () => boolean;
  /** Double page où s'ouvre le premier livre (les feuilles déjà tournées). */
  startSpread?: number;
  /** Le livre suivant attend-il fermé qu'on l'ouvre d'un clic (pages qui tournent seules coupées) ? */
  stayClosed: () => boolean;
  /**
   * Une feuille s'est posée, le livre est ouvert à la double page `spread` : `counted` si le lecteur l'a
   * tournée (les pages qui tournent seules sont déjà comptées par la production). Renvoie true si le
   * livre est terminé : il se referme. Sans elle, le livre se referme à sa dernière double page.
   * Les pages ne se tournent alors qu'en avant.
   */
  onLeaf?: (spread: number, counted: boolean) => boolean;
}

/** Le livre en main, avec de quoi le remplacer (débogage : page ou livre changés à la main). */
export interface HeldBook extends Component {
  reset: (spec: Book3d, spread: number, closed: boolean) => void;
}

/** Libère un livre qu'on a reposé : ses formes, ses matières et leurs images. */
const disposeBook = (book: BookMesh): void =>
  book.root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    for (const material of [object.material].flat()) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
      material.dispose();
    }
  });

/**
 * Le livre tenu en main, en 3D : ouvert devant le lecteur, vu à la première personne, caméra fixe. Il
 * bouge à peine, comme tenu par des mains (option « le livre bouge »), et ses pages se tournent au clic,
 * à la main ou seules, au rythme de la production. Terminé, il se referme et le suivant le remplace.
 */
export const createHeldBook3d = (first: Book3d, options: HeldBookOptions): HeldBook => {
  const root = el('section', 'reading held-book3d');
  const canvas = el('canvas', 'held-book3d-canvas');
  canvas.setAttribute('role', 'button');
  canvas.setAttribute('aria-label', t('ui.read'));
  root.append(canvas);

  // Tous les livres en main ont la même forme et le même nombre de pages.
  const { shape } = first;
  const spreads = spreadCount(first.source);
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
  scene.add(hands);
  const pose = createHeldPose(hands, shape.width);
  const tweens = createTweens();

  let dirty = true;
  let book: BookMesh | null = null;
  let turner: Turner | null = null;
  /** Où en est le livre : on le lit, il attend fermé qu'on l'ouvre, ou il passe de main (animation). */
  let phase: 'reading' | 'closed' | 'busy' = 'busy';
  /** Prend en main le livre `spec`, ouvert à la double page `spread`, ou fermé. */
  const take = async (spec: Book3d, spread: number, closed: boolean): Promise<void> => {
    const look = await spec.look();
    if (book) {
      hands.remove(book.root);
      disposeBook(book);
    }
    book = createBookMesh(shape, look);
    book.setOpen(closed ? 0 : 1);
    hands.add(book.root);
    auto.clear();
    turner = createTurner(book, createPageCache(spec.source), spreads, land);
    turner.jump(spread);
    pose.set({ closed: closed ? 1 : 0 });
    dirty = true;
  };
  /** Doubles pages où mènent des feuilles tournées seules (non comptées). */
  const auto = new Set<number>();
  /** Une feuille s'est posée : comptée si le lecteur l'a tournée ; fin du livre si la partie le dit. */
  function land(spread: number): void {
    const counted = !auto.delete(spread);
    if (options.onLeaf?.(spread, counted)) void finish();
  }
  let current = first;
  void take(first, options.startSpread ?? 0, false).then(() => {
    phase = 'reading';
  });

  /** Livre neuf fermé : sa couverture s'ouvre, il se recentre sur ses deux pages. */
  const openBook = async (): Promise<void> => {
    if (phase !== 'closed') return;
    phase = 'busy';
    await tweens.run(OPEN_MS, (e) => {
      book?.setOpen(e);
      pose.set({ closed: 1 - e });
    });
    phase = 'reading';
  };
  /**
   * Dernière page tournée : le plat arrière se referme sur les pages pendant que le chercheur tourne le
   * livre (on voit son dos), puis le livre descend et le suivant remonte entre ses mains : ouvert, ou
   * fermé si les pages ne tournent pas seules.
   */
  const finish = async (): Promise<void> => {
    phase = 'busy';
    await tweens.run(CLOSE_MS, (e) => {
      book?.setShut(e);
      pose.set({ shut: e });
    });
    await tweens.run(LOWER_MS, (e) => pose.set({ drop: e }), 'in');
    const closed = options.stayClosed();
    current = current.next?.() ?? current;
    await take(current, 0, closed);
    pose.set({ shut: 0 });
    await tweens.run(RAISE_MS, (e) => pose.set({ drop: 1 - e }), 'out');
    phase = closed ? 'closed' : 'reading';
  };

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
    open: () => phase === 'reading',
    step: (forward) => {
      if (phase === 'closed') return void openBook();
      if (!turner || phase !== 'reading' || (!forward && options.onLeaf)) return;
      const to = turner.target + (forward ? 1 : -1);
      if (to >= 0 && to < spreads) turner.go(to);
    },
    busy: (on) => {
      grabbing = on;
    },
    backward: !options.onLeaf,
  });
  const autoTurn = first.turnsPerSecond ? createAutoTurn3d(first.turnsPerSecond) : null;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');

  let before = performance.now();
  let turning = false;
  const frame = (now: number): void => {
    if (!root.isConnected) return renderer.dispose();
    const dt = Math.min(0.05, (now - before) / 1000);
    before = now;
    if (autoTurn && turner) {
      const aimed = turner.target;
      autoTurn(dt, turner, spreads - 1, phase === 'reading' && !grabbing);
      if (turner.target > aimed) auto.add(turner.target);
    }
    const moving = turner?.update(dt) ?? false;
    // Sans la partie : posé sur l'intérieur du plat arrière, le livre est lu.
    if (!options.onLeaf && phase === 'reading' && !grabbing && turner?.idle && turner.target === spreads - 1) void finish();
    // Pages qui tournent seules remises en route pendant qu'un livre attend fermé : on l'ouvre.
    if (phase === 'closed' && !options.stayClosed()) void openBook();
    const animating = tweens.update(now, still.matches);
    if (resize()) {
      place();
      dirty = true;
    }
    // Les mains ne sont jamais parfaitement immobiles (sauf page tenue, option coupée, mouvements réduits).
    const swaying = options.sway() && !still.matches;
    pose.update(swaying && !grabbing ? dt : 0);
    if (swaying || moving || turning || animating || dirty) {
      lighting.follow(camera, new THREE.Vector3(), 0);
      renderer.render(scene, camera);
      dirty = false;
    }
    turning = moving;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  // Débogage : accès au livre depuis la console (window.book3d.turner.hold…).
  (window as unknown as { book3d?: unknown }).book3d = {
    get book() {
      return book;
    },
    get turner() {
      return turner;
    },
    camera,
    hands,
    pose,
  };
  const reset = (spec: Book3d, spread: number, closed: boolean): void => {
    if (phase === 'busy') return;
    current = spec;
    phase = 'busy';
    void take(spec, spread, closed).then(() => {
      phase = closed ? 'closed' : 'reading';
    });
  };
  return { root, update: () => {}, reset };
};
