import './relics.css';
import * as THREE from 'three';
import { messages, t } from '../../i18n';
import { el } from '../dom';
import { RELICS, type RelicId } from '../../data/relics';
import { relicWait } from '../../systems/relics';
import { releaseSharedTextures, disposeObject } from '../book3d/renderer3d';
import { animationNow } from '../animationClock';
import { modalOpen } from '../modal/modal';
import { relicEnvironment, relicModel } from './relicModels';
import { tokenModel } from './tokenModel';
import { compassModel } from './compassModel';
import { relicBonusText, relicName, waitText } from './relicText';
import type { GameState } from '../../core/state';

/**
 * Regarder une relique de la vitrine (demande de l'auteur le 24/10 ; maquette .ai/maquette-regarder-reliques.html, piste B
 * validée le 25/10) : au clic, elle sort de sa case et vient en grand sur la vitrine assombrie, à gauche ; à droite, sa
 * fiche : son nom, d'où elle vient, son récit écrit en entier, ce qu'elle donne, « Remettre » et « Poser ». On la tourne
 * en la faisant glisser ; relâchée, elle revient doucement face à soi. Échap, la croix ou un clic à côté : elle retourne
 * dans sa case. Son rendu n'existe que le temps qu'elle est ouverte.
 */

/** Le regard de départ, [de côté, de haut] : la face vers soi (le jeton et la boussole se lisent mieux plus de haut). */
const START: Record<RelicId, readonly [number, number]> = {
  loupe: [0.5, 0.25],
  astrolabe: [0.15, 0.2],
  hourglass: [0.4, 0.18],
  pencil: [0, 0.55],
  token: [-0.25, 0.12],
  compass: [-0.2, 0.75],
};
/** Le reflet de la pièce : plus faible que dans la maquette, sinon la lentille de la loupe sort grise. */
const SHINE = 0.4;
/** Elle part de sa case à cette taille (et y revient). */
const FROM_SCALE = 0.14;
const FLY_MS = 550;
/** Relâchée, elle revient face à soi (part du chemin par seconde). */
const RETURN_RATE = 1.6;

/** Chacune dans une pose qui la montre, centrée sur elle-même (en mètres) ; et le rayon de la sphère qui la contient. */
const lookModel = (id: RelicId, envMap: THREE.Texture): { group: THREE.Group; radius: number } => {
  const model =
    id === 'token'
      ? tokenModel(envMap, SHINE)
      : id === 'compass'
        ? compassModel(envMap, SHINE, 100)
        : relicModel(id, id === 'loupe' || id === 'astrolabe' ? 'lean' : 'flat', envMap, SHINE);
  // Le crayon, couché en travers : un peu tourné pour qu'on voie sa mine.
  if (id === 'pencil') model.rotation.y = 0.5;
  const group = new THREE.Group();
  group.add(model);
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  model.position.sub(box.getCenter(new THREE.Vector3()));
  return { group, radius: box.getSize(new THREE.Vector3()).length() / 2 };
};

export interface RelicLook {
  /** L'ouvrir, depuis ce point de la scène (en pixels, là où elle est dans la vitrine). */
  open: (id: RelicId, from: { x: number; y: number }) => void;
  /** Ouverte (la vitrine ne répond plus) ? */
  isOpen: () => boolean;
  /** La page quittée : tout est rendu. */
  destroy: () => void;
}

export const createRelicLook = (
  state: GameState,
  stage: HTMLElement,
  /** « Poser » : la fenêtre de la vitrine ; `after` à sa fermeture. */
  choose: (id: RelicId, after: () => void) => void,
  /** Sortie de sa case (false) ou rentrée (true). */
  show: (id: RelicId, visible: boolean) => void,
): RelicLook => {
  const root = el('div', 'relic-look');
  const veil = el('div', 'relic-look-veil');
  // Un canvas neuf à chaque relique : celui d'un rendu rendu (forceContextLoss) ne retrouve plus de contexte WebGL.
  let canvas = el('canvas', 'relic-look-canvas');
  const card = el('div', 'relic-look-card');
  const close = el('button', 'relic-look-close', '×');
  close.type = 'button';
  root.append(veil, canvas, card, close);
  stage.append(root);
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');

  let open: {
    id: RelicId;
    from: { x: number; y: number };
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    turn: THREE.Group;
    yaw: number;
    pitch: number;
    drag: { x: number; y: number; yaw: number; pitch: number } | null;
    size: string;
    state: string;
    closing: boolean;
    /** Le temps de la dernière image (0 : pas encore dessinée). */
    last: number;
  } | null = null;

  const stateText = (id: RelicId): { text: string; acts: boolean } => {
    if (state.relics.active === id) return { text: t('ui.relics.acts'), acts: true };
    const wait = relicWait(state);
    return { text: wait > 0 ? t('ui.relics.wait').replace('{t}', waitText(wait)) : '', acts: false };
  };
  const stateLine = el('div', 'relic-look-state');
  const put = el('button', 'relic-look-put', '');
  put.type = 'button';
  const refresh = (): void => {
    if (!open) return;
    const { text, acts } = stateText(open.id);
    const key = `${text}|${acts}`;
    if (open.state === key) return;
    open.state = key;
    stateLine.textContent = text;
    stateLine.classList.toggle('acts', acts);
    put.disabled = acts || relicWait(state) > 0;
  };
  const fill = (id: RelicId): void => {
    const relic = RELICS.find((candidate) => candidate.id === id)!;
    const lore = (messages().lore as unknown as Record<string, { text: string[] }>)[relic.lore];
    const story = el('div', 'relic-look-story');
    lore.text.forEach((line, index) => {
      const paragraph = el('p', '', line);
      paragraph.style.transitionDelay = `${0.35 + index * 0.45}s`;
      story.append(paragraph);
    });
    const putBack = el('button', 'relic-look-back', t('ui.relics.putBack'));
    putBack.type = 'button';
    putBack.addEventListener('click', () => hide());
    put.textContent = t('ui.relics.confirm');
    const buttons = el('div', 'relic-look-buttons');
    buttons.append(putBack, put);
    card.replaceChildren(
      el('div', 'relic-look-name', relicName(id)),
      el('div', 'relic-look-from', t(`ui.relics.from.${id}`)),
      story,
      el('div', 'relic-look-rule'),
      el('div', 'relic-look-bonus', relicBonusText(state, id)),
      stateLine,
      buttons,
      el('div', 'relic-look-hint', t('ui.relics.turn')),
    );
    close.title = t('ui.relics.putBackTitle');
    close.setAttribute('aria-label', t('ui.relics.putBackTitle'));
  };
  put.addEventListener('click', () => {
    if (!open) return;
    const id = open.id;
    choose(id, () => {
      if (open?.id !== id) return;
      // Posée : ce qu'elle donne ne change pas, mais elle agit (et les autres attendent).
      open.state = '';
      refresh();
    });
  });

  /** Là où la relique part (ou revient) : sa place dans la vitrine, toute petite. */
  const away = (): string => {
    if (!open) return '';
    const box = canvas.getBoundingClientRect();
    const frame = stage.getBoundingClientRect();
    const x = open.from.x - (box.left - frame.left + box.width / 2);
    const y = open.from.y - (box.top - frame.top + box.height / 2);
    return `translate(${x}px, ${y}px) scale(${FROM_SCALE})`;
  };

  const frame = (frameTime: number): void => {
    if (!open || !root.isConnected) return;
    const now = animationNow(frameTime);
    const dt = Math.min(0.05, (now - (open.last || now)) / 1000);
    open.last = now;
    const { renderer, scene, camera, turn } = open;
    const { clientWidth: width, clientHeight: height } = canvas;
    if (width && height && `${width}x${height}` !== open.size) {
      open.size = `${width}x${height}`;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    if (!open.drag) {
      const [homeYaw, homePitch] = START[open.id];
      // Au tour près : elle ne se dévisse pas pour revenir.
      const target = homeYaw + Math.round((open.yaw - homeYaw) / (Math.PI * 2)) * Math.PI * 2;
      const k = Math.min(1, dt * RETURN_RATE);
      open.yaw += (target - open.yaw) * k;
      open.pitch += (homePitch - open.pitch) * k;
    }
    // Elle respire un peu, comme un livre tenu en main.
    const sway = still.matches ? 0 : Math.sin(now / 1900) * 0.03;
    turn.rotation.set(open.pitch, open.yaw + sway, 0, 'XYZ');
    refresh();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };

  const release = (): void => {
    if (!open) return;
    releaseSharedTextures(open.renderer, open.scene);
    disposeObject(open.scene);
    open.renderer.dispose();
    open.renderer.forceContextLoss();
    open = null;
  };

  /** Elle rentre dans sa case : la fin du retour (déjà prévue), qu'une autre relique ouverte entre-temps fait tout de suite. */
  let landing: (() => void) | null = null;
  let landingTimer = 0;
  const hide = (): void => {
    if (!open || open.closing || modalOpen()) return;
    open.closing = true;
    const { id } = open;
    root.classList.remove('shown');
    root.classList.add('closing');
    canvas.style.transform = still.matches ? '' : away();
    canvas.style.opacity = '0';
    landing = () => {
      window.clearTimeout(landingTimer);
      landing = null;
      root.classList.remove('on', 'closing');
      canvas.style.transform = canvas.style.opacity = '';
      release();
      show(id, true);
    };
    landingTimer = window.setTimeout(landing, still.matches ? 0 : FLY_MS);
  };

  const keys = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !open || modalOpen()) return;
    event.preventDefault();
    event.stopPropagation();
    hide();
  };
  window.addEventListener('keydown', keys, true);
  close.addEventListener('click', () => hide());
  veil.addEventListener('click', () => hide());
  root.addEventListener('click', (event) => {
    if (event.target === root) hide();
  });
  root.addEventListener('pointerdown', (event) => {
    if (!open || event.target !== canvas) return;
    open.drag = { x: event.clientX, y: event.clientY, yaw: open.yaw, pitch: open.pitch };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('drag');
  });
  root.addEventListener('pointermove', (event) => {
    if (!open?.drag) return;
    open.yaw = open.drag.yaw + (event.clientX - open.drag.x) * 0.012;
    open.pitch = THREE.MathUtils.clamp(open.drag.pitch + (event.clientY - open.drag.y) * 0.008, -0.5, 1.2);
  });
  const letGo = (): void => {
    if (open) open.drag = null;
    canvas.classList.remove('drag');
  };
  root.addEventListener('pointerup', letGo);
  root.addEventListener('pointercancel', letGo);

  return {
    open: (id, from) => {
      landing?.();
      if (open) return;
      const fresh = el('canvas', 'relic-look-canvas');
      canvas.replaceWith(fresh);
      canvas = fresh;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      const envMap = relicEnvironment(renderer);
      const scene = new THREE.Scene();
      scene.environment = envMap;
      scene.environmentIntensity = 0.45;
      scene.add(new THREE.HemisphereLight(0xfff0dc, 0x3a2a1c, 0.9));
      const key = new THREE.DirectionalLight(0xffe6c0, 2.6);
      key.position.set(0.7, 1.3, 1.1);
      const rim = new THREE.DirectionalLight(0xc0d0ff, 0.7);
      rim.position.set(-1, 0.4, -0.8);
      scene.add(key, rim);
      const { group, radius } = lookModel(id, envMap);
      const turn = new THREE.Group();
      turn.add(group);
      scene.add(turn);
      const camera = new THREE.PerspectiveCamera(28, 1, 0.005, 5);
      camera.position.set(0, 0, (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * 1.02);
      camera.lookAt(0, 0, 0);
      const [yaw, pitch] = START[id];
      open = { id, from, renderer, scene, camera, turn, yaw, pitch, drag: null, size: '', state: '', closing: false, last: 0 };
      fill(id);
      refresh();
      show(id, false);
      root.classList.add('on');
      // Elle part de sa case : la vue commence à sa place, toute petite.
      if (!still.matches) {
        canvas.style.transition = 'none';
        canvas.style.transform = away();
        canvas.getBoundingClientRect();
        canvas.style.transition = '';
      }
      requestAnimationFrame(() => {
        root.classList.add('shown');
        canvas.style.transform = '';
      });
      requestAnimationFrame(frame);
    },
    isOpen: () => open !== null && !open.closing,
    destroy: () => {
      window.removeEventListener('keydown', keys, true);
      window.clearTimeout(landingTimer);
      release();
    },
  };
};
