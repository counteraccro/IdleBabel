import * as THREE from 'three';
import { drawBabelDigit } from '../babelDigits';
import { RELIC_REELS } from '../../data/lottery';

/**
 * Le Jeton en 3D (maquette validée le 18/10, .ai/maquette-relique-jeton.html, piste A « Frappé ») : laiton, tranche
 * cannelée, un grènetis au bord ; au milieu, l'hexagone des galeries et 4 · 1 · 0 en chiffres de Babel, en creux ; au
 * revers, le double hexagone seul. Dans la vitrine, debout sur un petit chevalet de bois, agrandi (c'est une
 * représentation : à sa vraie taille, 3,2 cm, ce serait une tête d'épingle).
 */

const R = 0.016;
const T = 0.0026;
/** Agrandi dans la vitrine (choix de l'auteur, 18/10 : « qu'il apparaisse agrandi ») : 9 fois la taille d'une relique. */
export const TOKEN_SHELF_SCALE = 9;
const COLOR = 0xb8904e;
const ENGRAVED = 'rgba(40,24,8,0.85)';
const DEEP = '#606060';

/** Une graine fixe, pour que le grain du métal reste le même d'un chargement à l'autre (Park-Miller, comme la maquette). */
const seeded = (seed: number) => (): number => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const square = (size: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return [canvas, canvas.getContext('2d')!];
};

/** Les chiffres de Babel en creux : dessinés en or par le jeu, puis repeints de la couleur de la gravure. */
const engrave = (context: CanvasRenderingContext2D, color: string): void => {
  const [layer, l] = square(512);
  RELIC_REELS.forEach((digit, i) => drawBabelDigit(l, digit, 256 + (i - 1) * 92, 256, 92, 10));
  l.globalCompositeOperation = 'source-in';
  l.fillStyle = color;
  l.fillRect(0, 0, 512, 512);
  context.drawImage(layer, 0, 0);
};

const hexagon = (context: CanvasRenderingContext2D, r: number): void => {
  context.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    context.lineTo(256 + r * Math.cos(a), 256 + r * Math.sin(a));
  }
  context.closePath();
};

/** La face (ou le revers) : une carte de couleur et une carte de relief (blanc = haut). */
const faceMaps = (front: boolean): [THREE.CanvasTexture, THREE.CanvasTexture] => {
  const [color, c] = square(512);
  const [bump, b] = square(512);
  const random = seeded(11);
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 512, 512);
  b.fillStyle = '#ffffff';
  b.fillRect(0, 0, 512, 512);
  // Un léger grain.
  for (let i = 0; i < 900; i++) {
    c.fillStyle = `rgba(80,60,30,${0.03 + random() * 0.05})`;
    c.fillRect(random() * 512, random() * 512, 1 + random() * 3, 1 + random() * 2);
  }
  // Le listel : un bord relevé.
  b.strokeStyle = '#ffffff';
  b.lineWidth = 18;
  b.beginPath();
  b.arc(256, 256, 244, 0, Math.PI * 2);
  b.stroke();
  b.strokeStyle = '#9a9a9a';
  b.lineWidth = 3;
  b.beginPath();
  b.arc(256, 256, 232, 0, Math.PI * 2);
  b.stroke();
  for (const [x, ink] of [
    [c, ENGRAVED],
    [b, DEEP],
  ] as const) {
    // Le grènetis.
    x.fillStyle = ink;
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      x.beginPath();
      x.arc(256 + 214 * Math.cos(a), 256 + 214 * Math.sin(a), 4, 0, Math.PI * 2);
      x.fill();
    }
    x.strokeStyle = ink;
    x.lineWidth = 7;
    hexagon(x, 168);
    x.stroke();
    if (!front) {
      x.lineWidth = 5;
      hexagon(x, 140);
      x.stroke();
    }
  }
  if (front) {
    engrave(c, ENGRAVED);
    engrave(b, DEEP);
  }
  return [new THREE.CanvasTexture(color), new THREE.CanvasTexture(bump)];
};

/** La tranche cannelée : une bande de 1024 × 32 qui fait le tour. */
const edgeMaps = (): [THREE.CanvasTexture, THREE.CanvasTexture] => {
  const color = document.createElement('canvas');
  const bump = document.createElement('canvas');
  color.width = bump.width = 1024;
  color.height = bump.height = 32;
  const c = color.getContext('2d')!;
  const b = bump.getContext('2d')!;
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 1024, 32);
  b.fillStyle = '#c0c0c0';
  b.fillRect(0, 0, 1024, 32);
  for (let i = 0; i < 160; i++) {
    b.fillStyle = '#ffffff';
    b.fillRect(i * 6.4, 0, 3.2, 32);
    c.fillStyle = 'rgba(60,40,10,0.18)';
    c.fillRect(i * 6.4 + 3.2, 0, 3.2, 32);
  }
  return [new THREE.CanvasTexture(color), new THREE.CanvasTexture(bump)];
};

/** Le Jeton, debout, la face vers +z, posé en y = 0 (en mètres). */
export const tokenModel = (envMap: THREE.Texture | null): THREE.Group => {
  const material = (map: THREE.Texture, bumpMap: THREE.Texture) =>
    new THREE.MeshStandardMaterial({
      color: COLOR,
      metalness: 0.92,
      roughness: 0.34,
      map,
      bumpMap,
      bumpScale: 1.4,
      envMap,
      envMapIntensity: 0.55,
    });
  const coin = new THREE.Group();
  const edge = new THREE.Mesh(new THREE.CylinderGeometry(R, R, T, 128, 1, true), material(...edgeMaps()));
  edge.rotation.x = Math.PI / 2;
  coin.add(edge);
  for (const front of [true, false]) {
    const face = new THREE.Mesh(new THREE.CircleGeometry(R, 128), material(...faceMaps(front)));
    face.position.z = front ? T / 2 : -T / 2;
    if (!front) face.rotation.y = Math.PI;
    coin.add(face);
  }
  coin.position.y = R;
  const holder = new THREE.Group();
  holder.add(coin);
  return holder;
};

/**
 * Le Jeton sur son chevalet (piste A du présentoir), à l'échelle des livres, `k` fois sa taille : deux montants penchés,
 * une traverse où il repose, une béquille derrière. Posé en y = 0, centré.
 */
export const tokenOnEasel = (envMap: THREE.Texture | null, k = TOKEN_SHELF_SCALE): THREE.Group => {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3418, roughness: 0.62 });
  const r = R * k;
  const h = r * 2.6;
  const w = r * 1.5;
  const th = r * 0.09;
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(th, h, th), wood);
    leg.position.set(side * w * 0.32, h / 2 - th, 0);
    leg.rotation.z = -side * 0.12;
    leg.rotation.x = -0.18;
    group.add(leg);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(th, h * 0.95, th), wood);
  back.position.set(0, h * 0.42, -h * 0.28);
  back.rotation.x = 0.42;
  const ledge = new THREE.Mesh(new THREE.BoxGeometry(w, th * 1.2, th * 3.2), wood);
  ledge.position.set(0, r * 0.5, th * 1.1);
  const token = tokenModel(envMap);
  token.scale.setScalar(k);
  token.position.set(0, r * 0.5 + th * 0.6, th * 1.4);
  token.rotation.x = -0.18;
  group.add(back, ledge, token);
  return group;
};
