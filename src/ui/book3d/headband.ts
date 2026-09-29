import * as THREE from 'three';

/** Rayon du bourrelet (au plus gros d'une perle), et sa longueur (d'un bout coupé à l'autre). */
export const HEADBAND_RADIUS = 0.0055;
export const HEADBAND_LENGTH = 0.045;
/** Perles de fil le long du bourrelet : chacune est un point de broderie, enroulé en biais. */
const BEADS = 24;
/** Biais d'enroulement : une perle de décalage pour un tour complet (sans raccord à la couture). */
const TWIST = 1;
const ALONG = BEADS * 6;
const AROUND = 20;

/** Position d'un point dans la suite des perles (entier : entre deux perles). */
const phase = (t: number, turn: number): number => t * BEADS + turn * TWIST;

/**
 * Tranchefile : un bourrelet de fil de soie brodé sur une âme, le long du pli (axe x, centré). Une suite
 * de perles enroulées en biais, creusées entre elles ; les deux bouts sont coupés net. UV : u le long du
 * bourrelet, v autour.
 */
export const createHeadbandGeometry = (): THREE.BufferGeometry => {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= ALONG; i++) {
    const t = i / ALONG;
    for (let j = 0; j <= AROUND; j++) {
      // Couture de la grille sous le bourrelet (angle -π/2), là où on ne la voit pas.
      const turn = j / AROUND;
      const angle = -Math.PI / 2 + 2 * Math.PI * turn;
      const f = phase(t, turn) % 1;
      const r = HEADBAND_RADIUS * (0.9 + 0.1 * Math.sqrt(Math.sin(Math.PI * f)));
      positions.push((t - 0.5) * HEADBAND_LENGTH, r * Math.sin(angle), r * Math.cos(angle));
      uvs.push(t, turn);
    }
  }
  for (let i = 0; i < ALONG; i++) {
    for (let j = 0; j < AROUND; j++) {
      const a = i * (AROUND + 1) + j;
      const b = a + AROUND + 1;
      indices.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  // Bouts coupés : un disque de fil vu par la tranche (couleur du milieu de la texture).
  for (const end of [0, 1]) {
    const center = positions.length / 3;
    positions.push((end - 0.5) * HEADBAND_LENGTH, 0, 0);
    uvs.push(end, 0.5);
    for (let j = 0; j < AROUND; j++) {
      const a = end * ALONG * (AROUND + 1) + j;
      if (end === 0) indices.push(center, a + 1, a);
      else indices.push(center, a, a + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
};

/**
 * Fil des tranchefiles : les perles de `createHeadbandGeometry`, de deux couleurs en alternance, chacune
 * faite de brins serrés, plus sombre dans le creux entre deux perles.
 */
export const headbandTexture = (a: string, b: string): THREE.CanvasTexture => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const context = canvas.getContext('2d')!;
  const image = context.createImageData(canvas.width, canvas.height);
  // Composantes telles qu'écrites (sRGB, comme le canvas), de 0 à 1.
  const colors = [a, b].map((css) => {
    const hex = new THREE.Color(css).getHex();
    return { r: ((hex >> 16) & 255) / 255, g: ((hex >> 8) & 255) / 255, b: (hex & 255) / 255 };
  });
  for (let y = 0; y < canvas.height; y++) {
    const turn = y / canvas.height;
    for (let x = 0; x < canvas.width; x++) {
      const p = phase(x / canvas.width, turn);
      const bead = Math.floor(p);
      const f = p - bead;
      const color = colors[((bead % 2) + 2) % 2];
      // Bombé de la perle, et brins de soie parallèles à l'enroulement.
      const round = 0.62 + 0.38 * Math.sin(Math.PI * f) ** 0.5;
      const strands = 0.86 + 0.14 * Math.sin(2 * Math.PI * (turn * 9 + f * 1.5));
      const light = round * strands;
      const k = (y * canvas.width + x) * 4;
      image.data[k] = Math.min(255, color.r * 255 * light);
      image.data[k + 1] = Math.min(255, color.g * 255 * light);
      image.data[k + 2] = Math.min(255, color.b * 255 * light);
      image.data[k + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
};
