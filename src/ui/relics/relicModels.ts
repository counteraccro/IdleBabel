import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { RelicId, RelicPose } from '../../data/relics';

/**
 * Les reliques en 3D (maquette validée le 12/10, .ai/maquette-reliques.html) : un seul modèle par objet, en mètres, posé
 * en y = 0 et centré, pour la salle comme pour la vitrine. Des formes tournées (LatheGeometry) et des tores, le laiton
 * reflète une pièce (RoomEnvironment) ; la face de l'astrolabe et son araignée sont dessinées sur des canevas.
 */

/** Le reflet d'une pièce, pour le laiton et le verre : propre à chaque rendu (un PMREM par renderer). */
export const relicEnvironment = (renderer: THREE.WebGLRenderer): THREE.Texture => {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const texture = pmrem.fromScene(room, 0.04).texture;
  room.dispose();
  pmrem.dispose();
  return texture;
};

interface Look {
  /** Le reflet de la pièce, et sa force. */
  envMap: THREE.Texture | null;
  envMapIntensity: number;
}

const brass = (look: Look) =>
  new THREE.MeshStandardMaterial({
    color: 0xb8904e,
    metalness: 0.9,
    roughness: 0.36,
    envMap: look.envMap,
    envMapIntensity: look.envMapIntensity,
  });
const darkBrass = (look: Look) =>
  new THREE.MeshStandardMaterial({
    color: 0x8c6a34,
    metalness: 0.85,
    roughness: 0.5,
    envMap: look.envMap,
    envMapIntensity: look.envMapIntensity,
  });
const wood = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: 0.62 });
/** Le verre ; `dim` : terni (le sablier, « à force d'être retourné »). */
const glass = (look: Look, dim = 0) =>
  new THREE.MeshPhysicalMaterial({
    color: dim ? 0xd8d4c8 : 0xe8f0ff,
    roughness: 0.06 + dim * 0.3,
    metalness: 0,
    transparent: true,
    opacity: 0.18 + dim * 0.2,
    clearcoat: 1,
    side: THREE.DoubleSide,
    depthWrite: false,
    envMap: look.envMap,
    envMapIntensity: look.envMapIntensity,
  });
const lathe = (points: [number, number][], segments = 40) =>
  new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  );

/** La loupe, couchée : la lentille à plat, le manche vers +x (bois tourné, une virole de laiton). Longue de 0,27 m. */
const loupe = (look: Look): THREE.Group => {
  const group = new THREE.Group();
  const R = 0.05;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(R, 0.0055, 14, 64), brass(look));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.0055;
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.004, 64), glass(look));
  lens.position.y = 0.0055;
  const collar = new THREE.Mesh(
    lathe(
      [
        [0, 0],
        [0.0085, 0],
        [0.0095, 0.006],
        [0.011, 0.026],
        [0, 0.026],
      ],
      20,
    ),
    brass(look),
  );
  collar.rotation.z = -Math.PI / 2;
  collar.position.set(R + 0.004, 0.0095, 0);
  const handle = new THREE.Mesh(
    lathe(
      [
        [0, 0],
        [0.0095, 0],
        [0.011, 0.02],
        [0.0125, 0.07],
        [0.0105, 0.115],
        [0.0125, 0.128],
        [0.006, 0.136],
        [0, 0.137],
      ],
      24,
    ),
    wood(0x3d2212),
  );
  handle.rotation.z = -Math.PI / 2;
  handle.position.set(R + 0.029, 0.0115, 0);
  group.add(rim, lens, collar, handle);
  return group;
};

/** Appuyée : debout, le manche en bas, la lentille vers le lecteur, un peu penchée en arrière. */
const leaningLoupe = (look: Look): THREE.Group => {
  const flat = loupe(look);
  flat.rotation.x = Math.PI / 2;
  const turned = new THREE.Group();
  turned.add(flat);
  turned.rotation.z = -Math.PI / 2;
  const leaning = new THREE.Group();
  leaning.add(turned);
  leaning.rotation.x = -0.14;
  return leaning;
};

/** La face gravée de l'astrolabe : cercles, graduations, et sur le bord les encoches de celui qui comptait les salles. */
const astrolabeFace = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const x = canvas.getContext('2d')!;
  const m = 256;
  x.fillStyle = '#b8904e';
  x.fillRect(0, 0, 512, 512);
  const shine = x.createRadialGradient(200, 180, 20, 256, 256, 300);
  shine.addColorStop(0, 'rgba(255,230,170,0.35)');
  shine.addColorStop(1, 'rgba(60,40,10,0.35)');
  x.fillStyle = shine;
  x.fillRect(0, 0, 512, 512);
  x.strokeStyle = 'rgba(50,32,10,0.85)';
  x.lineWidth = 2;
  for (const r of [236, 214, 196, 120, 60]) {
    x.beginPath();
    x.arc(m, m, r, 0, Math.PI * 2);
    x.stroke();
  }
  for (let degree = 0; degree < 360; degree += 2) {
    const a = (degree * Math.PI) / 180;
    const length = degree % 10 ? 8 : 18;
    x.beginPath();
    x.moveTo(m + Math.cos(a) * 214, m + Math.sin(a) * 214);
    x.lineTo(m + Math.cos(a) * (214 - length), m + Math.sin(a) * (214 - length));
    x.stroke();
  }
  x.font = '15px Georgia';
  x.fillStyle = 'rgba(50,32,10,0.85)';
  x.textAlign = 'center';
  const hours = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  hours.forEach((hour, i) => {
    const a = (i * Math.PI) / 6 - Math.PI / 2;
    x.fillText(hour, m + Math.cos(a) * 180, m + Math.sin(a) * 180 + 5);
  });
  // Les almucantarats : des arcs serrés vers le haut.
  for (let k = 0; k < 7; k++) {
    x.beginPath();
    x.arc(m, m - 40 - k * 8, 120 - k * 14, 0, Math.PI * 2);
    x.stroke();
  }
  // Les encoches du compte : des bâtons par cinq, barrés, de plus en plus serrés, puis plus rien.
  x.strokeStyle = 'rgba(30,18,4,0.95)';
  x.lineWidth = 2.6;
  let step = 0.034;
  for (let n = 0; n < 47; n++) {
    const a = -Math.PI * 0.95 + n * step + Math.floor(n / 5) * 0.03;
    x.beginPath();
    x.moveTo(m + Math.cos(a) * 248, m + Math.sin(a) * 248);
    x.lineTo(m + Math.cos(a) * 232, m + Math.sin(a) * 232);
    x.stroke();
    if (n % 5 === 4) {
      const b = a - step * 4.5;
      x.beginPath();
      x.moveTo(m + Math.cos(b) * 236, m + Math.sin(b) * 236);
      x.lineTo(m + Math.cos(a + 0.01) * 245, m + Math.sin(a + 0.01) * 245);
      x.stroke();
    }
    step *= 0.995;
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};

/** L'araignée (rete) : une plaque ajourée, l'écliptique décentré et les pointes des étoiles (le blanc est le métal). */
const reteAlpha = (): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const x = canvas.getContext('2d')!;
  const m = 256;
  x.strokeStyle = '#fff';
  x.fillStyle = '#fff';
  x.lineCap = 'round';
  x.lineWidth = 9;
  x.beginPath();
  x.arc(m, m, 200, 0, Math.PI * 2);
  x.stroke();
  x.lineWidth = 7;
  x.beginPath();
  x.arc(m, m - 46, 140, 0, Math.PI * 2);
  x.stroke();
  x.lineWidth = 6;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.3;
    x.beginPath();
    x.moveTo(m, m);
    x.lineTo(m + Math.cos(a) * 200, m + Math.sin(a) * 200);
    x.stroke();
  }
  for (let i = 0; i < 14; i++) {
    const a = i * 0.9 + 0.2;
    const r = 90 + ((i * 37) % 100);
    const px = m + Math.cos(a) * r;
    const py = m + Math.sin(a) * r;
    x.lineWidth = 4;
    x.beginPath();
    x.moveTo(px, py);
    x.quadraticCurveTo(
      m + Math.cos(a + 0.25) * (r + 30),
      m + Math.sin(a + 0.25) * (r + 30),
      m + Math.cos(a + 0.2) * 200,
      m + Math.sin(a + 0.2) * 200,
    );
    x.stroke();
    x.beginPath();
    x.moveTo(px, py);
    x.lineTo(px + Math.cos(a - 1.2) * 14, py + Math.sin(a - 1.2) * 14);
    x.lineTo(px + Math.cos(a + 1.2) * 6, py + Math.sin(a + 1.2) * 6);
    x.fill();
  }
  x.beginPath();
  x.arc(m, m, 14, 0, Math.PI * 2);
  x.fill();
  return new THREE.CanvasTexture(canvas);
};

/** L'astrolabe (Ø 0,2 m), dressé face à +z : couché sur le dos (`flat`), ou appuyé contre les livres (`lean`). */
const astrolabe = (look: Look, pose: RelicPose): THREE.Group => {
  const group = new THREE.Group();
  const R = 0.1;
  const face = new THREE.MeshStandardMaterial({
    map: astrolabeFace(),
    // Une plaque gravée, moins miroir que le limbe : ses traits restent lisibles.
    metalness: 0.6,
    roughness: 0.55,
    envMap: look.envMap,
    envMapIntensity: look.envMapIntensity,
  });
  const mater = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.007, 72), [darkBrass(look), face, darkBrass(look)]);
  mater.rotation.x = Math.PI / 2;
  const limb = new THREE.Mesh(new THREE.TorusGeometry(R - 0.004, 0.0045, 10, 72), brass(look));
  limb.position.z = 0.004;
  const rete = new THREE.Mesh(
    new THREE.CircleGeometry(R * 0.86, 64),
    new THREE.MeshStandardMaterial({
      color: 0xd8b064,
      alphaMap: reteAlpha(),
      alphaTest: 0.5,
      metalness: 0.9,
      roughness: 0.3,
      side: THREE.DoubleSide,
      envMap: look.envMap,
      envMapIntensity: look.envMapIntensity,
    }),
  );
  rete.position.z = 0.0055;
  const alidade = new THREE.Mesh(new THREE.BoxGeometry(R * 1.9, 0.009, 0.003), brass(look));
  alidade.position.z = 0.0085;
  alidade.rotation.z = 0.55;
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.012, 16), brass(look));
  pin.rotation.x = Math.PI / 2;
  pin.position.z = 0.008;
  const throne = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.007, 3, 1), darkBrass(look));
  throne.rotation.set(Math.PI / 2, Math.PI, 0);
  throne.position.y = R + 0.006;
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.0025, 8, 24), brass(look));
  shackle.position.y = R + 0.024;
  group.add(mater, limb, rete, alidade, pin, throne, shackle);
  group.rotation.x = pose === 'flat' ? -Math.PI / 2 : -0.28;
  return group;
};

/** Le sablier (0,24 m) : deux plateaux, trois colonnes tournées, le verre terni, le sable arrêté (il ne coule plus). */
const hourglass = (look: Look): THREE.Group => {
  const group = new THREE.Group();
  const H = 0.24;
  const P = 0.014;
  const top = H - P;
  const plateWood = wood(0x5a3418);
  const plate = (y: number) => {
    const mesh = new THREE.Mesh(
      lathe(
        [
          [0, 0],
          [0.056, 0],
          [0.058, 0.004],
          [0.056, 0.01],
          [0.052, P],
          [0, P],
        ],
        36,
      ),
      plateWood,
    );
    mesh.position.y = y;
    return mesh;
  };
  group.add(plate(0), plate(H - P));
  const column = lathe(
    [
      [0, 0],
      [0.0055, 0],
      [0.004, 0.02],
      [0.006, 0.05],
      [0.0035, 0.09],
      [0.006, 0.106],
      [0.0035, 0.122],
      [0.006, 0.162],
      [0.004, 0.192],
      [0.0055, top - P],
      [0, top - P],
    ],
    12,
  );
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI * 2) / 3 + 0.4;
    const mesh = new THREE.Mesh(column, plateWood);
    mesh.position.set(Math.cos(a) * 0.044, P, Math.sin(a) * 0.044);
    group.add(mesh);
  }
  // Le verre : deux bulbes, un col étroit.
  const y0 = P + 0.002;
  const span = top - 0.002 - y0;
  const radius = (y: number): number => {
    const u = (y - y0) / span;
    const v = u < 0.5 ? u / 0.5 : (u - 0.5) / 0.5;
    return 0.004 + 0.03 * Math.pow(Math.sin(Math.PI * v), 0.7);
  };
  const profile: [number, number][] = [];
  for (let i = 0; i <= 48; i++) {
    const y = y0 + (span * i) / 48;
    profile.push([radius(y), y]);
  }
  group.add(new THREE.Mesh(lathe(profile), glass(look, 1)));
  // Le sable : un tas en bas, un reste accroché en haut, rien entre les deux.
  const sand = new THREE.MeshStandardMaterial({ color: 0xd2ab70, roughness: 0.95 });
  const low: [number, number][] = [[0, y0 + 0.001]];
  for (let y = y0 + 0.001; y < y0 + 0.042; y += 0.004) low.push([radius(y) - 0.0015, y]);
  low.push([0.012, y0 + 0.05], [0, y0 + 0.058]);
  group.add(new THREE.Mesh(lathe(low, 32), sand));
  const mid = y0 + span / 2;
  const high: [number, number][] = [
    [0, mid + 0.006],
    [0.006, mid + 0.014],
  ];
  for (let y = mid + 0.022; y < mid + 0.06; y += 0.005) high.push([radius(y) - 0.0015, y]);
  high.push([0, mid + 0.062]);
  group.add(new THREE.Mesh(lathe(high, 32), sand));
  return group;
};

/** Pose l'objet : son dessous en y = 0, centré en x et z. */
const settle = (inner: THREE.Object3D): THREE.Group => {
  const group = new THREE.Group();
  group.add(inner);
  inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner);
  const center = box.getCenter(new THREE.Vector3());
  inner.position.set(-center.x, -box.min.y, -center.z);
  return group;
};

/** Le modèle d'une relique, posé (y = 0) et centré ; `pose` pour la loupe et l'astrolabe. */
export const relicModel = (id: RelicId, pose: RelicPose, envMap: THREE.Texture | null, envMapIntensity = 0.5): THREE.Group => {
  const look = { envMap, envMapIntensity };
  if (id === 'loupe') return settle(pose === 'lean' ? leaningLoupe(look) : loupe(look));
  if (id === 'astrolabe') return settle(astrolabe(look, pose));
  return settle(hourglass(look));
};
