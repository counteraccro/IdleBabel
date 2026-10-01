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
/** Bord doux du cône (comme `penumbra` d'un SpotLight), décroissance de la lumière avec la distance. */
const PENUMBRA = 0.85;
const DECAY = 2;
/** Marge des cases : une face posée pile sur leur bord (étagère, séparation) y appartient. */
const EDGE = 0.003;

const housing = new THREE.CylinderGeometry(RADIUS, RADIUS, THICK, 24);
const bulb = new THREE.CircleGeometry(RADIUS * 0.7, 24);

export interface CellLights {
  /** Éclaire `object` (ses matières) par les spots des cases : à faire pour tout ce qui entre dans la vitrine. */
  light: (object: THREE.Object3D) => void;
}

/**
 * Un spot dans chaque case, sous l'étagère du dessus (ou la corniche) : un cône de lumière chaude vers le
 * bas, et la petite pièce de laiton qui l'abrite. Ce ne sont pas des lumières three.js : avec une lumière
 * par case, chaque point de l'écran les calculerait toutes (24, l'image passait de 3 à 18 ms). Ici, le
 * shader de chaque matière cherche la case où tombe le point et ne calcule que son spot : la lumière ne
 * passe pas non plus d'une case à l'autre. Pas d'ombres : la lampe de la pièce porte celles des livres.
 */
export const addCellLights = (root: THREE.Group, cells: BookcaseCell[]): CellLights => {
  const uniforms = {
    /** Chaque case : x de gauche à droite, y de bas en haut. */
    cellBox: { value: [] as THREE.Vector4[] },
    /** Chaque spot : sa place, sa portée (w). */
    cellLamp: { value: [] as THREE.Vector4[] },
    /** Chaque spot : d'où vient sa lumière (de la tache éclairée vers lui). */
    cellAim: { value: [] as THREE.Vector3[] },
    /** Chaque spot : cosinus du cône et du début de son bord doux. */
    cellCone: { value: [] as THREE.Vector2[] },
    cellColor: { value: new THREE.Color(COLOR).multiplyScalar(INTENSITY) },
  };
  // Les matières, propres à cette vitrine (elles seront retouchées, puis libérées avec elle).
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.35, metalness: 0.85 });
  const glow = new THREE.MeshBasicMaterial({ color: 0xfff0d0 });
  for (const cell of cells) {
    const x = cell.left + cell.width / 2;
    const top = cell.floor + cell.height;
    const fixture = new THREE.Mesh(housing, brass);
    fixture.position.set(x, top - THICK / 2, Z);
    const face = new THREE.Mesh(bulb, glow);
    face.rotation.x = Math.PI / 2;
    face.position.set(x, top - THICK - 0.001, Z);
    root.add(fixture, face);

    // Le cône couvre la case en largeur au niveau de l'étagère.
    const angle = Math.min(Math.atan(cell.width / 2 / cell.height) * 1.6, THREE.MathUtils.degToRad(60));
    const lamp = new THREE.Vector3(x, top - THICK, Z);
    const spot = new THREE.Vector3(x, cell.floor, Z - 0.1);
    uniforms.cellBox.value.push(new THREE.Vector4(cell.left - EDGE, cell.left + cell.width + EDGE, cell.floor - EDGE, top + EDGE));
    uniforms.cellLamp.value.push(new THREE.Vector4(lamp.x, lamp.y, lamp.z, cell.height * 2.2));
    uniforms.cellAim.value.push(lamp.clone().sub(spot).normalize());
    uniforms.cellCone.value.push(new THREE.Vector2(Math.cos(angle), Math.cos(angle * (1 - PENUMBRA))));
  }
  const count = cells.length;

  // Le spot de la case, ajouté aux lumières de la matière (mêmes calculs qu'un SpotLight de three.js).
  const fragment = /* glsl */ `
    #if defined( RE_Direct )
    {
      int cellIndex = -1;
      for ( int i = 0; i < ${count}; i ++ ) {
        vec4 box = cellBox[ i ];
        if ( vCellWorld.x > box.x && vCellWorld.x < box.y && vCellWorld.y > box.z && vCellWorld.y < box.w ) {
          cellIndex = i;
          break;
        }
      }
      if ( cellIndex >= 0 ) {
        vec4 lamp = cellLamp[ cellIndex ];
        vec3 lVector = ( viewMatrix * vec4( lamp.xyz, 1.0 ) ).xyz - geometryPosition;
        directLight.direction = normalize( lVector );
        vec3 aim = normalize( ( viewMatrix * vec4( cellAim[ cellIndex ], 0.0 ) ).xyz );
        vec2 cone = cellCone[ cellIndex ];
        float spot = getSpotAttenuation( cone.x, cone.y, dot( directLight.direction, aim ) );
        if ( spot > 0.0 ) {
          directLight.color = cellColor * spot * getDistanceAttenuation( length( lVector ), lamp.w, ${DECAY.toFixed(1)} );
          directLight.visible = true;
          RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
        }
      }
    }
    #endif`;
  const declarations = `
    varying vec3 vCellWorld;
    uniform vec4 cellBox[ ${count} ];
    uniform vec4 cellLamp[ ${count} ];
    uniform vec3 cellAim[ ${count} ];
    uniform vec2 cellCone[ ${count} ];
    uniform vec3 cellColor;`;

  const patched = new WeakSet<THREE.Material>();
  const patch = (material: THREE.Material): void => {
    if (patched.has(material)) return;
    patched.add(material);
    // La matière a peut-être déjà sa retouche (la lueur des pages) : elle passe d'abord.
    const before = material.onBeforeCompile.bind(material);
    const key = material.customProgramCacheKey();
    material.onBeforeCompile = (shader, renderer) => {
      before(shader, renderer);
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCellWorld;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvCellWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\n${declarations}`)
        .replace('#include <lights_fragment_begin>', `#include <lights_fragment_begin>\n${fragment}`);
    };
    material.customProgramCacheKey = () => `${key}|cells${count}`;
    material.needsUpdate = true;
  };

  const lit: CellLights = {
    light: (object) =>
      object.traverse((child) => {
        if (child instanceof THREE.Mesh) for (const material of [child.material].flat()) patch(material);
      }),
  };
  lit.light(root);
  return lit;
};
