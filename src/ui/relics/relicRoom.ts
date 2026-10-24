import './relics.css';
import * as THREE from 'three';
import { el, type Component } from '../dom';
import { t } from '../../i18n';
import { modalOpen } from '../modal/modal';
import { shownScene } from '../../scene';
import { SCENES, type SceneId } from '../../scene/scenes';
import { EYE_HEIGHT, FOCAL, ROOM_IMAGE } from '../../data/mimic';
import { ROOM_RELICS, RELIC_LIGHT, type RoomRelic } from '../../data/relics';
import { findRelic, relicWaiting } from '../../systems/relics';
import { cover, hiveTop, screenBox as toScreen, shaderLight, type RoomView } from '../roomView';
import { leaveWith, sweepLeftovers } from '../leftovers';
import { relicEnvironment, relicModel } from './relicModels';
import { relicIcon } from './relicIcons';
import type { GameState } from '../../core/state';

/**
 * Une relique posée dans sa salle (maquette validée le 12/10, .ai/maquette-reliques.html) : son modèle 3D, à sa vraie
 * taille, mis en perspective par l'appareil photo du fond (data/mimic.ts), sans rien qui la signale (« tout doit rester
 * naturel »). Un clic : elle s'efface, son récit (systems/relics.ts, un moment de lore), son sceau. Sans place visible
 * (écran en portrait, interface par-dessus), un sceau au bord droit, comme la Mimic. L'image n'est refaite que si la
 * salle, l'écran ou la relique changent.
 */

/** Autour de l'objet, le canvas garde de quoi dessiner son ombre (part de sa taille). */
const PAD = 0.35;
/** Le clic compte un peu autour de l'objet (px). */
const HIT = 6;
/** Le temps de s'effacer, une fois trouvée (voir .relic-canvas.found). */
const FADE_MS = 800;

/** D'où vient la lumière dans chaque salle (depuis l'objet, en mètres), et sa couleur. */
const SUN: Record<SceneId, { from: [number, number, number]; color: number }> = {
  desert: { from: [-2, 3, 1], color: 0xffd6a0 },
  nuit: { from: [0, 4, -2], color: 0xc8d0ff },
  verriere: { from: [0.3, 5, -0.6], color: 0xffe2b8 },
  // Le jour entre par les arches, sur les côtés.
  'jour-nuit': { from: [-2.5, 2.5, 0.5], color: 0xfff0d8 },
};

/** Débogage : la taille de l'objet (1 : sa vraie taille). */
let relicScale = 1;
export const setRelicScale = (value: number): void => {
  relicScale = value;
};
export const relicScaleNow = (): number => relicScale;

/** Une ombre douce sous l'objet : il est posé, il ne flotte pas. */
const contactTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const x = canvas.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,0.75)');
  g.addColorStop(0.5, 'rgba(0,0,0,0.35)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
};

/** Le cadre de l'image dans un cadre plus grand centré sur le point de fuite (la caméra du fond), en pixels d'image. */
const frameOf = (room: SceneId) => {
  const vanishing = SCENES.find((scene) => scene.id === room)!.vanishing;
  const vx = vanishing.x * ROOM_IMAGE.w;
  const vy = vanishing.y * ROOM_IMAGE.h;
  const fullW = 2 * Math.max(vx, ROOM_IMAGE.w - vx);
  const fullH = 2 * Math.max(vy, ROOM_IMAGE.h - vy);
  return { fullW, fullH, ox: fullW / 2 - vx, oy: fullH / 2 - vy };
};

/** Un rendu : le canvas, la scène et sa caméra, l'objet et ce qu'il couvre (pixels d'image). */
interface Shot {
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  envMap: THREE.Texture;
  relic: RoomRelic | null;
  holder: THREE.Group | null;
  /** Le carré de l'objet, en pixels d'image (sans la marge). */
  box: { x0: number; y0: number; x1: number; y1: number } | null;
}

/** Le côté : un sceau au bord droit, sous celui de la Mimic. */
interface Side {
  root: HTMLElement;
  id: string;
}

/** Vide la scène d'un rendu : ses objets, leurs matières et leurs textures (le reflet de la pièce reste). */
const emptyScene = (shot: Shot): void => {
  shot.scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    for (const material of [object.material].flat()) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture && value !== shot.envMap) value.dispose();
      material.dispose();
    }
  });
  shot.scene.clear();
  shot.holder = null;
};

export const createRelicRoom = (state: GameState): Component => {
  const root = el('div', 'relic-stage');
  let shot: Shot | null = null;
  let side: Side | null = null;
  /** Ce que montre l'image (relique, salle, écran, taille) : refaite seulement s'il change. */
  let shown = '';
  /** Le carré de l'objet à l'écran (px), pour le clic. */
  let screenBox: { x0: number; y0: number; x1: number; y1: number } | null = null;
  /** Trouvée : elle s'efface, on ne la touche plus. */
  let leaving = false;

  const release = (): void => {
    if (!shot) return;
    emptyScene(shot);
    shot.envMap.dispose();
    shot.renderer.dispose();
    shot.renderer.forceContextLoss();
    shot.canvas.remove();
    shot = null;
  };
  const clearSide = (): void => {
    side?.root.remove();
    side = null;
  };
  const clear = (): void => {
    release();
    clearSide();
    shown = '';
    screenBox = null;
    document.documentElement.classList.remove('relic-hover');
  };

  const makeShot = (): Shot => {
    const canvas = el('canvas', 'relic-canvas');
    root.append(canvas);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 100);
    camera.position.set(0, EYE_HEIGHT, 0);
    camera.lookAt(0, EYE_HEIGHT, -1);
    return { renderer, canvas, scene: new THREE.Scene(), camera, envMap: relicEnvironment(renderer), relic: null, holder: null, box: null };
  };

  /** L'objet de `relic`, à sa place, éclairé comme la salle à cet endroit de l'écran. */
  const stage = (current: Shot, relic: RoomRelic, view: RoomView): void => {
    emptyScene(current);
    const { X, Y, Z, yaw, pose } = relic.spot;
    const frame = frameOf(relic.room);
    // Le centre de l'objet à l'écran : la lumière du shader y est la sienne.
    const centerX = (frame.fullW / 2 - frame.ox + (FOCAL * X) / Z) * view.scale + view.left;
    const centerY = (frame.fullH / 2 - frame.oy + (FOCAL * (EYE_HEIGHT - Y)) / Z) * view.scale + view.top;
    const light = RELIC_LIGHT[relic.room] * shaderLight(centerX, centerY);
    const model = relicModel(relic.id, pose, current.envMap, 0.2 * light);
    const holder = new THREE.Group();
    holder.add(model);
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(size.x * 1.5, size.z * 1.5 + 0.03),
      new THREE.MeshBasicMaterial({ map: contactTexture(), transparent: true, depthWrite: false, opacity: 0.8 }),
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.y = 0.001;
    holder.add(contact);
    holder.position.set(X, Y, -Z);
    // Face au joueur, puis tournée de `yaw`.
    holder.rotation.y = Math.atan2(-X, Z) + THREE.MathUtils.degToRad(yaw);
    holder.scale.setScalar(relicScale);
    const sun = SUN[relic.room];
    const lamp = new THREE.DirectionalLight(sun.color, 2.4 * light);
    lamp.position.set(X + sun.from[0], Y + sun.from[1], -Z + sun.from[2]);
    lamp.target.position.set(X, Y, -Z);
    current.scene.add(holder, new THREE.HemisphereLight(0xfff0dc, 0x3a2a1c, 1.1 * light), lamp, lamp.target);
    current.holder = holder;
    current.relic = relic;
    // Le carré de l'objet dans l'image : ses huit coins, vus par la caméra du fond (l'image entière).
    current.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(frame.fullH / 2 / FOCAL));
    current.camera.aspect = frame.fullW / frame.fullH;
    current.camera.setViewOffset(frame.fullW, frame.fullH, frame.ox, frame.oy, ROOM_IMAGE.w, ROOM_IMAGE.h);
    current.camera.updateProjectionMatrix();
    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const xs: number[] = [];
    const ys: number[] = [];
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) {
          const p = new THREE.Vector3(x, y, z).project(current.camera);
          xs.push(((p.x + 1) / 2) * ROOM_IMAGE.w);
          ys.push(((1 - p.y) / 2) * ROOM_IMAGE.h);
        }
    current.box = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  };

  /** Le canvas sur le carré de l'objet (et sa marge), la caméra réglée sur ce morceau de l'image ; une image. */
  const draw = (current: Shot, view: RoomView): void => {
    const box = current.box!;
    const pad = Math.max(box.x1 - box.x0, box.y1 - box.y0) * PAD;
    const x0 = box.x0 - pad;
    const y0 = box.y0 - pad;
    const w = box.x1 - box.x0 + 2 * pad;
    const h = box.y1 - box.y0 + 2 * pad;
    const frame = frameOf(current.relic!.room);
    current.camera.setViewOffset(frame.fullW, frame.fullH, frame.ox + x0, frame.oy + y0, w, h);
    current.camera.updateProjectionMatrix();
    Object.assign(current.canvas.style, {
      left: `${x0 * view.scale + view.left}px`,
      top: `${y0 * view.scale + view.top}px`,
      width: `${w * view.scale}px`,
      height: `${h * view.scale}px`,
    });
    current.renderer.setSize(Math.max(1, Math.round(w * view.scale)), Math.max(1, Math.round(h * view.scale)), false);
    current.renderer.render(current.scene, current.camera);
  };

  /** Le carré à l'écran : hors des bords et de l'interface, on la voit ; sinon, null. */
  const visibleBox = (box: Shot['box'], view: RoomView) => (box ? toScreen(box, view) : null);

  /** Trouvée : elle s'efface (ou son sceau), puis elle est dans la vitrine. */
  const take = (relic: RoomRelic): void => {
    if (leaving || !findRelic(state, relic.id)) return;
    leaving = true;
    document.documentElement.classList.remove('relic-hover');
    shot?.canvas.classList.add('found');
    side?.root.classList.add('found');
    window.setTimeout(() => {
      leaving = false;
      clear();
    }, FADE_MS);
  };

  const showSide = (relic: RoomRelic): void => {
    release();
    screenBox = null;
    if (side?.id === relic.id) return;
    clearSide();
    const node = el('div', 'relic-side');
    const seal = el('button', 'method-seal relic');
    seal.type = 'button';
    seal.setAttribute('aria-label', t(`ui.relics.names.${relic.id}`));
    seal.innerHTML = `<span class="method-rim"></span><span class="method-core"></span>${relicIcon(relic.id, 'method-sigil')}`;
    seal.addEventListener('click', (event) => {
      event.stopPropagation();
      take(relic);
    });
    node.append(seal);
    root.append(node);
    side = { root: node, id: relic.id };
  };

  /** Au bord droit, sous le sceau de la Mimic (à la hauteur de la ruche). */
  const placeSide = (): void => {
    side!.root.style.top = `${hiveTop() + 70}px`;
  };

  const blocked = (event: PointerEvent): boolean =>
    leaving ||
    modalOpen() ||
    root.classList.contains('screen-out') ||
    !!(event.target as Element | null)?.closest('button, a, input, select, .modal-backdrop');
  const hits = (event: PointerEvent): boolean =>
    !!screenBox &&
    event.clientX > screenBox.x0 - HIT &&
    event.clientX < screenBox.x1 + HIT &&
    event.clientY > screenBox.y0 - HIT &&
    event.clientY < screenBox.y1 + HIT;

  const onDown = (event: PointerEvent): void => {
    // L'écran du jeu quitté : l'écouteur part avec lui, et le rendu aussi (leftovers.ts).
    if (!root.isConnected) return retire();
    if (!shot?.relic || blocked(event) || !hits(event)) return;
    event.stopPropagation();
    event.preventDefault();
    take(shot.relic);
  };
  const onMove = (event: PointerEvent): void => {
    if (!root.isConnected) return retire();
    document.documentElement.classList.toggle('relic-hover', !!shot?.relic && !blocked(event) && hits(event));
  };
  window.addEventListener('pointerdown', onDown, true);
  window.addEventListener('pointermove', onMove, { passive: true });
  const retire = leaveWith(root, () => {
    window.removeEventListener('pointerdown', onDown, true);
    window.removeEventListener('pointermove', onMove);
    clear();
  });

  const update = (): void => {
    sweepLeftovers();
    if (leaving) return;
    const scene = shownScene();
    const relic = ROOM_RELICS.find((candidate) => candidate.room === scene && relicWaiting(state, candidate.id));
    if (!relic) {
      if (shot || side) clear();
      return;
    }
    const view = cover();
    const key = `${relic.id}:${window.innerWidth}×${window.innerHeight}×${relicScale}`;
    if (key === shown) {
      if (side) placeSide();
      return;
    }
    shown = key;
    shot ??= makeShot();
    stage(shot, relic, view);
    screenBox = visibleBox(shot.box, view);
    if (!screenBox) {
      showSide(relic);
      placeSide();
      return;
    }
    clearSide();
    draw(shot, view);
  };
  return { root, update };
};
