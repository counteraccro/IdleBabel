import * as THREE from 'three';

/**
 * La Boussole en 3D (maquette validée le 24/10, .ai/maquette-relique-boussole.html, piste A « De poche ») : un boîtier de
 * laiton de 10 cm, le couvercle ouvert sur sa charnière (l'hexagone gravé dedans), un anneau pour la chaîne. Sous un verre
 * presque invisible, le cadran de papier et une aiguille qui se dédouble : une pointe nette d'acier bleui, l'autre comme
 * une image en surimpression, à 140°. Couchée, le cadran vers +y, posée en y = 0 ; la charnière derrière (−z).
 */

const R = 0.05;
const H = 0.014;
const STEEL = 0x2a3a58;

/** Le laiton : `rough`, plus lisse pour la lunette, la charnière et l'anneau. */
const brass = (envMap: THREE.Texture | null, envMapIntensity: number, rough = 0.38) =>
  new THREE.MeshStandardMaterial({ color: 0xb8904e, metalness: 0.9, roughness: rough, envMap, envMapIntensity });

const square = (size: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  return [canvas, canvas.getContext('2d')!];
};

/** Un hexagone de rayon `r` autour de (c, c), pointe en haut. */
const hexagon = (x: CanvasRenderingContext2D, c: number, r: number): void => {
  x.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    x.lineTo(c + r * Math.cos(a), c + r * Math.sin(a));
  }
  x.closePath();
};

/** Le cadran : papier jauni, graduations, une rose à huit pointes, l'hexagone des galeries au centre. */
const dialTexture = (): THREE.CanvasTexture => {
  const [canvas, x] = square(512);
  x.fillStyle = '#e6d8b8';
  x.fillRect(0, 0, 512, 512);
  const g = x.createRadialGradient(256, 256, 60, 256, 256, 260);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(90,60,20,0.35)');
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 512);
  x.strokeStyle = '#3a2a16';
  x.fillStyle = '#3a2a16';
  x.lineWidth = 3;
  x.beginPath();
  x.arc(256, 256, 236, 0, 7);
  x.stroke();
  x.lineWidth = 1.5;
  x.beginPath();
  x.arc(256, 256, 200, 0, 7);
  x.stroke();
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    const long = i % 8 === 0 ? 30 : i % 2 === 0 ? 18 : 10;
    x.lineWidth = i % 8 === 0 ? 3 : 1.4;
    x.beginPath();
    x.moveTo(256 + 236 * Math.cos(a), 256 + 236 * Math.sin(a));
    x.lineTo(256 + (236 - long) * Math.cos(a), 256 + (236 - long) * Math.sin(a));
    x.stroke();
  }
  // La rose : huit pointes, les grandes ombrées d'un côté.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const len = i % 2 === 0 ? 180 : 110;
    const w = i % 2 === 0 ? 22 : 14;
    for (const side of [-1, 1]) {
      x.beginPath();
      x.moveTo(256, 256);
      x.lineTo(256 + len * Math.cos(a), 256 + len * Math.sin(a));
      x.lineTo(256 + w * Math.cos(a + (side * Math.PI) / 2), 256 + w * Math.sin(a + (side * Math.PI) / 2));
      x.closePath();
      x.fillStyle = side < 0 ? '#3a2a16' : 'rgba(58,42,22,0.25)';
      x.fill();
      x.stroke();
    }
  }
  x.lineWidth = 2;
  hexagon(x, 256, 34);
  x.fillStyle = '#e6d8b8';
  x.fill();
  x.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

/** L'intérieur du couvercle : l'hexagone gravé, deux fois, dans un cercle. */
const lidTexture = (): THREE.CanvasTexture => {
  const [canvas, x] = square(256);
  x.fillStyle = '#ffffff';
  x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(60,36,10,0.75)';
  x.lineWidth = 4;
  for (const r of [70, 52]) {
    hexagon(x, 128, r);
    x.stroke();
  }
  x.lineWidth = 2;
  x.beginPath();
  x.arc(128, 128, 118, 0, 7);
  x.stroke();
  return new THREE.CanvasTexture(canvas);
};

/** Une aiguille : un losange plat, pointe vers +x. */
const needle = (len: number, opacity: number, metalness: number): THREE.Mesh => {
  const shape = new THREE.Shape();
  shape.moveTo(len, 0);
  shape.lineTo(0, len * 0.11);
  shape.lineTo(-len * 0.75, 0);
  shape.lineTo(0, -len * 0.11);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.0008, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  return new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      color: STEEL,
      metalness,
      roughness: 0.35,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
    }),
  );
};

/** Le cadran, l'aiguille dédoublée, le pivot et le verre, à la hauteur `y` (au-dessus du fond plein du boîtier). */
const face = (y: number, envMap: THREE.Texture | null, envMapIntensity: number): THREE.Group => {
  const group = new THREE.Group();
  const dial = new THREE.Mesh(
    new THREE.CircleGeometry(R, 96),
    new THREE.MeshStandardMaterial({ map: dialTexture(), roughness: 0.85, metalness: 0 }),
  );
  dial.rotation.x = -Math.PI / 2;
  dial.position.y = y;
  const len = R * 0.82;
  const sharp = needle(len, 1, 0.8);
  sharp.position.y = y + 0.002;
  sharp.rotation.y = 0.5;
  // L'autre pointe, comme une image en surimpression, à 140°.
  const ghost = needle(len, 0.45, 0.5);
  ghost.position.y = y + 0.0024;
  ghost.rotation.y = 0.5 + (140 * Math.PI) / 180;
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.05, R * 0.05, 0.004, 24), brass(envMap, envMapIntensity, 0.3));
  pin.position.y = y + 0.003;
  const glass = new THREE.Mesh(
    new THREE.CircleGeometry(R, 96),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0,
      roughness: 0.05,
      transparent: true,
      opacity: 0.08,
      depthWrite: false,
      envMap,
      envMapIntensity,
    }),
  );
  glass.rotation.x = -Math.PI / 2;
  glass.position.y = y + 0.006;
  group.add(dial, sharp, ghost, pin, glass);
  return group;
};

/**
 * La Boussole, couchée. `lidDeg` : l'ouverture du couvercle (100° dans la salle ; 180° dans la vitrine, rabattu à plat
 * derrière, comme une montre de poche ouverte).
 */
export const compassModel = (envMap: THREE.Texture | null, envMapIntensity: number, lidDeg = 100): THREE.Group => {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.06, R * 1.08, H, 96), brass(envMap, envMapIntensity));
  body.position.y = H / 2;
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(R * 1.03, R * 0.05, 12, 96), brass(envMap, envMapIntensity, 0.3));
  bezel.rotation.x = Math.PI / 2;
  bezel.position.y = H;
  group.add(body, bezel, face(H + 0.0006, envMap, envMapIntensity));
  // La charnière derrière (−z), le couvercle ouvert, l'anneau de la chaîne devant la charnière.
  const hinge = new THREE.Group();
  hinge.position.set(0, H, -R * 1.07);
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.06, R * 1.06, 0.004, 96), brass(envMap, envMapIntensity));
  const inside = new THREE.Mesh(
    new THREE.CircleGeometry(R * 0.98, 96),
    new THREE.MeshStandardMaterial({ color: 0xc8a060, metalness: 0.85, roughness: 0.4, map: lidTexture(), envMap, envMapIntensity }),
  );
  inside.rotation.x = -Math.PI / 2;
  inside.position.y = -0.0022;
  inside.rotation.z = Math.PI;
  const flip = new THREE.Group();
  flip.add(shell, inside);
  flip.rotation.x = Math.PI;
  flip.position.z = R * 1.07;
  const lid = new THREE.Group();
  lid.add(flip);
  lid.rotation.x = -(lidDeg * Math.PI) / 180;
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, R * 0.5, 16), brass(envMap, envMapIntensity, 0.3));
  pin.rotation.z = Math.PI / 2;
  hinge.add(pin, lid);
  const bow = new THREE.Mesh(new THREE.TorusGeometry(R * 0.22, R * 0.035, 12, 48), brass(envMap, envMapIntensity, 0.3));
  bow.position.set(R * 0.9, H * 0.6, -R * 0.75);
  bow.rotation.y = Math.PI / 4;
  group.add(hinge, bow);
  return group;
};

/**
 * Dans la vitrine (maquette) : dressée face au joueur, appuyée au fond de sa case, le couvercle rabattu à plat au-dessus ;
 * à l'échelle `k` des livres. Le groupe est à poser au sol de la case, 0,5 en retrait du bord.
 */
export const compassOnShelf = (envMap: THREE.Texture | null, k: number, envMapIntensity = 0.1): THREE.Group => {
  const compass = compassModel(envMap, envMapIntensity, 180);
  compass.scale.setScalar(k);
  const tilt = new THREE.Group();
  tilt.add(compass);
  tilt.rotation.x = 1.25;
  tilt.position.y = R * k * 1.05;
  const group = new THREE.Group();
  group.add(tilt);
  return group;
};

/** Son retrait dans la vitrine (au lieu de 0,42 pour les autres reliques). */
export const COMPASS_SET_BACK = 0.5;
