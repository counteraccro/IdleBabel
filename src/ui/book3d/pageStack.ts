import * as THREE from 'three';
import { SPINE_BULGE } from './binding';
import type { BookShape } from './bookMesh';

/** Hauteur du bombement des pages (part de l'épaisseur qui le porte), livre grand ouvert (BookShape.arch). */
export const ARCH = 0.8;
/** Où les pages sont au plus haut (part de la largeur de la page, depuis le pli). */
const PEAK = 0.24;
/** Raideur de la montée depuis le pli (pente de départ : RISE fois la pente moyenne jusqu'au sommet). */
const RISE = 5;

const smooth = (t: number): number => t * t * (3 - 2 * t);

/**
 * Forme de la page visible d'une pile ouverte, à la distance `x` du pli (écart à sa hauteur à plat),
 * comme un livre posé ouvert : au pli, toutes les feuilles de la pile (`stack` : son épaisseur)
 * convergent au fond du dos, où elles sont cousues ; de là, la page monte en arc de cercle (verticale
 * au pli, à plat à son sommet), puis redescend doucement jusqu'à la tranche. `lift` : la hauteur du
 * bombement (nulle quand un côté n'a pas de pages : la page ne fait que plonger au pli).
 */
export const pageProfile = (x: number, lift: number, opened: number, width: number, stack: number): number => {
  if (opened <= 0) return 0;
  const t = Math.min(1, Math.max(0, x / width));
  const arch = Math.max(0, lift);
  if (t >= PEAK) return arch * opened * (1 - smooth((t - PEAK) / (1 - PEAK)));
  // Du point de couture (-stack) au sommet (+arch) : raide au pli, sans jamais y être tout à fait
  // verticale (inclinée avec sa moitié, elle passerait sur la page d'en face), à plat au sommet.
  const rise = 1 - (1 - t / PEAK) ** RISE;
  return (-stack + (stack + arch) * rise) * opened;
};

/** Points le long d'une page, plus serrés près du pli où elle se courbe. */
const PAGE_STEPS = 40;

/**
 * Une pile de feuilles, vue par sa tête : entre les hauteurs `z0` et `z1` du bloc (le bloc entier va
 * de -half à +half, entre les plats), dos (x = 0) arrondi comme l'intérieur de la coque (demi-ellipse
 * de rayon `inner`, aplatie comme elle), extrudée sur la hauteur du livre moins les débords.
 * `side` : la page visible (1 le dessus, -1 le dessous, 0 aucune) prend la forme d'une page ouverte
 * (`pageProfile`, selon `opened` ; `lift` : l'épaisseur qui la tire vers le haut au pli). `bulge` : bombé du dos des feuilles (1 fermé, 0 ouvert à plat).
 * Groupes de matériau : 0 les bords (la tranche, la tête, la queue), 1 le dessus, 2 le dessous, 3 le
 * dos arrondi (au fond du pli : du papier).
 * UV : sur les bords, v suit l'épaisseur (les lignes des feuilles leur restent parallèles) ; dessus
 * et dessous, la page entière (u du dos vers la tranche ; dessous vu de l'autre côté, u inversé).
 */
export const stackGeometry = (
  { width, height, overhang }: BookShape,
  inner: number,
  half: number,
  z0: number,
  z1: number,
  side = 0,
  bulge = 1,
  opened = 0,
  lift = 0,
  curl: (x: number) => number = () => 0,
): THREE.BufferGeometry => {
  // Dos arrondi des feuilles : il remplit la reliure du livre fermé ; ouvert, il s'aplatit (`bulge`
  // tend vers 0), sinon il déborderait par-dessus la page d'en face.
  const back = (z: number): number => -bulge * SPINE_BULGE * inner * Math.sqrt(Math.max(0, 1 - (z / inner) ** 2));
  const fore = width - overhang;
  // Page visible : creusée au pli, bombée ensuite ; la pile garde toujours un peu d'épaisseur. Toute
  // la pile suit la courbure de son plat (`curl` : son décalage, à la distance x du dos).
  const shape = (x: number): number => pageProfile(x, lift, opened, fore, z1 - z0);
  const top = (x: number): number => curl(x) + (side > 0 ? Math.max(z0 + 0.001, z1 + shape(x)) : z1);
  const bottom = (x: number): number => curl(x) + (side < 0 ? Math.min(z1 - 0.001, z0 - shape(x)) : z0);
  const along = Array.from({ length: PAGE_STEPS + 1 }, (_, i) => fore * (i / PAGE_STEPS) ** 2);
  const section = new THREE.Shape();
  // Dessous, de la tranche au dos ; le dos arrondi ; dessus, du dos à la tranche.
  section.moveTo(fore, bottom(fore));
  for (let i = PAGE_STEPS - 1; i >= 1; i--) section.lineTo(along[i], bottom(along[i]));
  const [from, to] = [bottom(0), top(0)];
  for (let i = 0; i <= 12; i++) {
    const z = from + ((to - from) * i) / 12;
    section.lineTo(back(z), z);
  }
  for (let i = 1; i <= PAGE_STEPS; i++) section.lineTo(along[i], top(along[i]));
  section.closePath();
  const tall = height - 2 * overhang;
  const extruded = new THREE.ExtrudeGeometry(section, { depth: tall, bevelEnabled: false, curveSegments: 1 });
  // Le profil (x, z du livre) est dans le plan de la forme ; l'extrusion devient la hauteur (y).
  extruded.rotateX(Math.PI / 2);
  extruded.translate(0, tall / 2, 0);
  const source = extruded.toNonIndexed();
  source.computeVertexNormals();
  const position = source.attributes.position;
  const uv = source.attributes.uv;
  const on = (surface: (x: number) => number, i: number): boolean =>
    position.getX(i) > 0.002 && Math.abs(position.getZ(i) - surface(position.getX(i))) < 1e-5;
  const groups: number[][] = [[], [], [], []];
  for (let triangle = 0; triangle < position.count / 3; triangle++) {
    const corners = [0, 1, 2].map((corner) => triangle * 3 + corner);
    // Tête et queue (les deux bouts de l'extrusion) : de la tranche, pas des pages.
    const cap = corners.every((i) => Math.abs(position.getY(i) - position.getY(corners[0])) < 1e-6);
    // Dos arrondi de la pile (côté x ≤ 0) : au fond du pli, le papier qui s'enroule vers la couture.
    const fold = corners.every((i) => position.getX(i) <= 0.0021);
    const group = cap ? 0 : fold ? 3 : corners.every((i) => on(top, i)) ? 1 : corners.every((i) => on(bottom, i)) ? 2 : 0;
    groups[group].push(triangle);
    for (const i of corners) {
      const across = Math.min(1, Math.max(0, position.getX(i) / fore));
      const up = (position.getY(i) + tall / 2) / tall;
      if (group === 1) uv.setXY(i, across, up);
      else if (group === 2) uv.setXY(i, 1 - across, up);
      else {
        // Chaque feuille suit la forme de la pile : sa ligne garde sa place entre le dessous et le dessus
        // à cette distance du pli (les lignes montent vers le pli avec la page du dessus).
        const x = position.getX(i);
        const low = bottom(Math.max(0, x));
        const high = top(Math.max(0, x));
        const share = high - low > 1e-6 ? (position.getZ(i) - low) / (high - low) : 0;
        const sheet = z0 + Math.min(1, Math.max(0, share)) * (z1 - z0);
        uv.setXY(i, up, (sheet + half) / (2 * half));
      }
    }
  }
  const order = groups.flat();
  const result = new THREE.BufferGeometry();
  for (const name of Object.keys(source.attributes)) {
    const attribute = source.attributes[name];
    const size = attribute.itemSize;
    const data = new Float32Array(order.length * 3 * size);
    order.forEach((triangle, index) => {
      for (let k = 0; k < 3 * size; k++) data[index * 3 * size + k] = attribute.array[triangle * 3 * size + k];
    });
    result.setAttribute(name, new THREE.BufferAttribute(data, size));
  }
  let start = 0;
  groups.forEach((triangles, group) => {
    result.addGroup(start, triangles.length * 3, group);
    start += triangles.length * 3;
  });
  return result;
};
