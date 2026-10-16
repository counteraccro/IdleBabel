import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { canvasTexture } from '../book3d/textures';
import { drawBabelDigit } from '../babelDigits';
import { jackpotPanel, signPanel, tokensPanel, type Panel } from './lotteryPanels';

/**
 * La machine de la Loterie (maquette validée le 16/10, .ai/maquette-meuble-des-fins.html ; mesures reprises telles quelles) :
 * un bandit manchot de casino, sur le modèle donné par l'auteur, sans bois : métal cuivré et doré, panneaux bordeaux,
 * ampoules ; trois rouleaux aux chiffres de Babel ; le levier et le bouton rouge se prennent à la souris. Elle est vide :
 * sans jeton, on ne peut rien faire (le bouton s'enfonce, le levier descend un peu et remonte ; rien ne tourne).
 */
const W = 1.16;
const LOW_Y0 = 0.2;
const BOX_H = 0.86;
const CONSOLE_Y = LOW_Y0 + BOX_H + 0.05;
const UP_Y0 = CONSOLE_Y + 0.05;
const UP_H = 0.66;
const WIN_W = 0.27;
const WIN_H = 0.4;
const WIN_GAP = 0.06;
const WIN_Y = UP_Y0 + UP_H / 2;
const SIGN_Y = UP_Y0 + UP_H + 0.02;
const SIGN_W = 1.04;
const SIGN_H = 0.4;
const REEL_R = 0.3;
const BUTTON_Y = CONSOLE_Y + 0.07;
/** Les rouleaux : dix chiffres de Babel chacun, dans un ordre à eux. */
const SYMBOLS = [7, 3, 0, 5, 9, 1, 8, 4, 6, 2];
/** Sans jeton, le levier ne descend que d'autant (1 : tout en bas), et revient plus vite. */
const EMPTY_PULL = 0.28;
const EMPTY_PULL_MS = 420;
const BUTTON_MS = 320;
/** Les ampoules clignotent une sur deux, à tour de rôle, à ce rythme. */
const BLINK_MS = 480;

export type LotteryHandle = 'lever' | 'button';

export interface LotteryMachine {
  root: THREE.Group;
  /** Le levier ou le bouton sous le rayon (souris), ou rien. */
  handleAt: (raycaster: THREE.Raycaster) => LotteryHandle | null;
  /** On tire le levier, on appuie sur le bouton. */
  press: (by: LotteryHandle, now: number) => void;
  /** Fait avancer le levier, le bouton, les ampoules ; vrai si l'image a changé. */
  tick: (now: number) => boolean;
  /** Réécrit les panneaux (la langue a changé, une police est arrivée). */
  relabel: () => void;
}

const rounded = (w: number, h: number, d: number, r: number, material: THREE.Material): THREE.Mesh =>
  new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), material);
/** Une forme plate, extrudée et arrondie sur ses bords, avec ses trous éventuels. */
const extruded = (shape: THREE.Shape, depth: number, bevel: number, material: THREE.Material): THREE.Mesh =>
  new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 4,
      curveSegments: 32,
    }),
    material,
  );
const rectPath = <P extends THREE.Path>(path: P, x: number, y: number, w: number, h: number, r: number): P => {
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y);
  path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r);
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h);
  path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r);
  path.quadraticCurveTo(x, y, x + r, y);
  return path;
};

/** La bande d'un rouleau : ses dix chiffres de Babel, dorés sur un fond sombre. */
const reelTexture = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 300;
  const context = canvas.getContext('2d')!;
  const band = context.createLinearGradient(0, 0, 0, 300);
  band.addColorStop(0, '#2a1c16');
  band.addColorStop(0.5, '#3a2820');
  band.addColorStop(1, '#2a1c16');
  context.fillStyle = band;
  context.fillRect(0, 0, 2048, 300);
  const step = 2048 / SYMBOLS.length;
  SYMBOLS.forEach((digit, i) => {
    context.save();
    context.translate((i + 0.5) * step, 150);
    context.rotate(Math.PI / 2);
    drawBabelDigit(context, digit, 0, 0, 170, 8);
    context.restore();
  });
  return canvasTexture(canvas);
};

/**
 * La machine, son socle en y = 0. `labels` : ses deux textes, dans la langue du jeu ; `environment` : le reflet de la pièce,
 * pour le métal (comme dans la maquette, à 0,25).
 */
export const createLotteryMachine = (
  labels: { sign: () => string; jackpot: () => string },
  environment: THREE.Texture,
  tokens: () => number,
): LotteryMachine => {
  const root = new THREE.Group();
  const copper = new THREE.MeshStandardMaterial({ color: 0xc98a52, roughness: 0.32, metalness: 0.9 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b45a, roughness: 0.25, metalness: 0.95 });
  const add = <M extends THREE.Object3D>(mesh: M, x: number, y: number, z: number): M => {
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  };

  // Le socle, à deux marches ; le coffre, son panneau du gros lot, l'écran des jetons.
  add(rounded(W + 0.16, 0.12, 0.84, 0.04, copper), 0, 0.06, 0);
  add(rounded(W + 0.06, 0.08, 0.78, 0.03, copper), 0, 0.16, 0);
  add(rounded(W, BOX_H, 0.7, 0.06, copper), 0, LOW_Y0 + BOX_H / 2, 0);
  add(rounded(0.96, 0.56, 0.04, 0.03, gold), 0, LOW_Y0 + 0.5, 0.35);
  const panels: Panel[] = [jackpotPanel(labels.jackpot), tokensPanel(tokens)];
  add(panels[0].mesh, 0, LOW_Y0 + 0.5, 0.374);
  add(panels[1].mesh, 0, LOW_Y0 + 0.13, 0.36);
  add(rounded(0.4, 0.12, 0.03, 0.02, gold), 0, LOW_Y0 + 0.13, 0.338);
  // Les ampoules, de chaque côté du coffre.
  const bulbs: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>[] = [];
  const bulbShape = new THREE.SphereGeometry(0.022, 16, 12);
  for (const side of [-1, 1])
    for (let i = 0; i < 6; i++) {
      const bulb = new THREE.Mesh(bulbShape, new THREE.MeshStandardMaterial({ color: 0xff7a3a, emissive: 0xff5a20, emissiveIntensity: 1 }));
      bulbs.push(add(bulb, side * (W / 2 - 0.035), LOW_Y0 + 0.14 + i * 0.12, 0.355));
    }
  // La console : une tablette, six touches blanches, le gros bouton rouge.
  add(rounded(W + 0.1, 0.1, 0.86, 0.04, copper), 0, CONSOLE_Y, 0.05);
  const keys = new THREE.MeshStandardMaterial({ color: 0xf2ece2, roughness: 0.4 });
  for (let i = 0; i < 6; i++) add(rounded(0.09, 0.03, 0.06, 0.01, keys), -0.38 + i * 0.11, CONSOLE_Y + 0.06, 0.36);
  const redButton = add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.065, 0.04, 32),
      new THREE.MeshStandardMaterial({ color: 0xd8201a, emissive: 0x801010, roughness: 0.3 }),
    ),
    0.42,
    BUTTON_Y,
    0.34,
  );
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.02, 32), gold), 0.42, CONSOLE_Y + 0.055, 0.34);

  // Le haut : la caisse des rouleaux (elle s'arrête derrière eux, deux joues ferment les côtés), une façade cuivrée
  // percée de trois fenêtres à cadre doré.
  add(rounded(W - 0.08, UP_H, 0.5, 0.05, copper), 0, UP_Y0 + UP_H / 2, -0.33);
  for (const side of [-1, 1]) add(rounded(0.06, UP_H, 0.36, 0.02, copper), side * ((W - 0.08) / 2 - 0.03), UP_Y0 + UP_H / 2, 0.1);
  const face = rectPath(new THREE.Shape(), -0.5, -UP_H / 2, 1.0, UP_H, 0.05);
  for (let i = -1; i <= 1; i++)
    face.holes.push(rectPath(new THREE.Path(), i * (WIN_W + WIN_GAP) - WIN_W / 2, -WIN_H / 2, WIN_W, WIN_H, 0.03));
  add(extruded(face, 0.03, 0.012, copper), 0, WIN_Y, 0.27);
  for (let i = -1; i <= 1; i++) {
    const ring = rectPath(new THREE.Shape(), -WIN_W / 2 - 0.025, -WIN_H / 2 - 0.025, WIN_W + 0.05, WIN_H + 0.05, 0.04);
    ring.holes.push(rectPath(new THREE.Path(), -WIN_W / 2, -WIN_H / 2, WIN_W, WIN_H, 0.03));
    add(extruded(ring, 0.015, 0.01, gold), i * (WIN_W + WIN_GAP), WIN_Y, 0.31);
  }
  // Les rouleaux, arrêtés chacun sur un chiffre à lui.
  const reelBand = new THREE.MeshStandardMaterial({ map: reelTexture(), roughness: 0.55, side: THREE.DoubleSide });
  [-1, 0, 1].forEach((i, n) => {
    const reel = new THREE.Group();
    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(REEL_R, REEL_R, WIN_W - 0.02, 64, 1, true), reelBand);
    cylinder.rotation.z = Math.PI / 2;
    reel.add(cylinder);
    reel.position.set(i * (WIN_W + WIN_GAP), WIN_Y, 0.25 - REEL_R);
    reel.rotation.x = ((((n * 3 + 1) % SYMBOLS.length) + 0.5) / SYMBOLS.length) * Math.PI * 2;
    root.add(reel);
  });

  // Le fronton : une enseigne en arc, cuivrée, son panneau « LOTERIE » ; au sommet, un hexagone doré.
  add(rounded(W, 0.07, 0.66, 0.03, copper), 0, SIGN_Y, -0.02);
  const arch = new THREE.Shape();
  arch.moveTo(-SIGN_W / 2, 0);
  arch.lineTo(SIGN_W / 2, 0);
  arch.lineTo(SIGN_W / 2, SIGN_H * 0.55);
  arch.quadraticCurveTo(SIGN_W / 2, SIGN_H, 0, SIGN_H);
  arch.quadraticCurveTo(-SIGN_W / 2, SIGN_H, -SIGN_W / 2, SIGN_H * 0.55);
  arch.lineTo(-SIGN_W / 2, 0);
  add(extruded(arch, 0.1, 0.025, copper), 0, SIGN_Y + 0.035, 0.1);
  panels.push(signPanel(labels.sign));
  add(panels[2].mesh, 0, SIGN_Y + 0.2, 0.232);
  const hexagon = add(new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.035, 6), gold), 0, SIGN_Y + 0.035 + SIGN_H + 0.1, 0.15);
  hexagon.rotation.x = Math.PI / 2;
  add(new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.025, 0.06, 12), gold), 0, SIGN_Y + 0.035 + SIGN_H + 0.03, 0.15);

  // Le levier, à droite : un moyeu cuivré, une tige dorée, la boule rouge.
  const lever = new THREE.Group();
  lever.position.set(W / 2 + 0.05, WIN_Y - 0.12, 0.02);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 32), copper);
  hub.rotation.z = Math.PI / 2;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 0.62, 16), gold);
  rod.position.set(0.06, 0.32, 0);
  const knob = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 32, 20),
    new THREE.MeshStandardMaterial({ color: 0xd8201a, roughness: 0.2, metalness: 0.1 }),
  );
  knob.position.set(0.06, 0.66, 0);
  lever.add(hub, rod, knob);
  for (const part of [hub, rod, knob]) part.castShadow = true;
  root.add(lever);

  // Le reflet de la pièce sur tout ce qui est de métal (et le reste), comme dans la maquette.
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    for (const material of [object.material].flat())
      if (material instanceof THREE.MeshStandardMaterial) Object.assign(material, { envMap: environment, envMapIntensity: 0.25 });
  });

  let leverStart = -1;
  let buttonStart = -1;
  let beat = -1;
  return {
    root,
    handleAt: (raycaster) => {
      root.updateMatrixWorld();
      const hit = raycaster.intersectObjects([lever, redButton], true)[0];
      return !hit ? null : hit.object === redButton ? 'button' : 'lever';
    },
    press: (by, now) => {
      if (by === 'button') {
        if (buttonStart < 0) buttonStart = now;
      } else if (leverStart < 0) leverStart = now;
      // Pas encore de jeton : rien ne tourne (les tirages viendront avec eux).
    },
    tick: (now) => {
      let changed = false;
      if (leverStart >= 0) {
        const k = (now - leverStart) / EMPTY_PULL_MS;
        lever.rotation.x = EMPTY_PULL * (k < 0.4 ? k / 0.4 : Math.max(0, 1 - (k - 0.4) / 0.6));
        if (k >= 1) {
          lever.rotation.x = 0;
          leverStart = -1;
        }
        changed = true;
      }
      // Le bouton s'enfonce, tient un instant, remonte.
      if (buttonStart >= 0) {
        const k = (now - buttonStart) / BUTTON_MS;
        redButton.position.y = BUTTON_Y - 0.016 * (k < 0.25 ? k / 0.25 : k < 0.55 ? 1 : Math.max(0, 1 - (k - 0.55) / 0.45));
        if (k >= 1) {
          redButton.position.y = BUTTON_Y;
          buttonStart = -1;
        }
        changed = true;
      }
      const next = Math.floor(now / BLINK_MS);
      if (next !== beat) {
        beat = next;
        bulbs.forEach((bulb, i) => (bulb.material.emissiveIntensity = (i + beat) % 2 === 0 ? 2.2 : 0.25));
        changed = true;
      }
      return changed;
    },
    relabel: () => panels.forEach((one) => one.redraw()),
  };
};
