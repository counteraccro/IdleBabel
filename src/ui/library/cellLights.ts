import * as THREE from 'three';
import type { BookcaseCell } from './bookcase3d';

/** Le petit spot rond vissé sous le plafond de chaque case : rayon, épaisseur. */
const RADIUS = 0.035;
const THICK = 0.014;
/** Le spot est un peu en avant du milieu de la case : il éclaire les dos des livres, pas seulement le fond. */
const Z = 0.2;
/** La lumière d'un spot : chaude, comme une ampoule à filament. */
const COLOR = 0xffc98a;
const INTENSITY = 6;

const brass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.35, metalness: 0.85 });
const glow = new THREE.MeshBasicMaterial({ color: 0xfff0d0 });
const housing = new THREE.CylinderGeometry(RADIUS, RADIUS, THICK, 24);
const bulb = new THREE.CircleGeometry(RADIUS * 0.7, 24);

/**
 * Un spot dans chaque case, sous l'étagère du dessus (ou la corniche) : un cône de lumière chaude vers le
 * bas, qui reste dans sa case (bord doux, portée de la case), et la petite pièce de laiton qui l'abrite.
 * Pas d'ombres : une ombre par spot coûterait trop ; la lampe de la pièce porte celles des livres.
 */
export const addCellLights = (root: THREE.Group, cells: BookcaseCell[]): void => {
  for (const cell of cells) {
    const x = cell.left + cell.width / 2;
    const top = cell.floor + cell.height;
    const fixture = new THREE.Mesh(housing, brass);
    fixture.position.set(x, top - THICK / 2, Z);
    const face = new THREE.Mesh(bulb, glow);
    face.rotation.x = Math.PI / 2;
    face.position.set(x, top - THICK - 0.001, Z);

    // Le cône couvre la case en largeur au niveau de l'étagère, sans trop déborder sur les voisines.
    const angle = Math.min(Math.atan(cell.width / 2 / cell.height) * 1.6, THREE.MathUtils.degToRad(60));
    const spot = new THREE.SpotLight(COLOR, INTENSITY, cell.height * 2.2, angle, 0.85, 2);
    spot.position.set(x, top - THICK, Z);
    spot.target.position.set(x, cell.floor, Z - 0.1);
    root.add(fixture, face, spot, spot.target);
  }
};
