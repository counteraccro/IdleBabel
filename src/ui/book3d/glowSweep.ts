import * as THREE from 'three';

/** Un passage de lumière toutes les PERIOD_S secondes ; il traverse le titre en SWEEP_S secondes. */
const PERIOD_S = 3.6;
const SWEEP_S = 1.6;
/** Surcroît de lumière sous le passage (la lueur du titre vaut 1 en dehors). */
const BOOST = 1.6;

/**
 * Où court le titre dans sa texture : l'axe (u de gauche à droite, v de bas en haut), du début du titre
 * à sa fin, et son nombre de lettres (le passage est large d'une lettre environ).
 */
export interface GlowSpan {
  axis: 'u' | 'v';
  from: number;
  to: number;
  letters: number;
}

/**
 * Une lumière qui passe sur un titre lumineux (BookLook.coverGlow, spineGlow) de lettre en lettre, puis
 * repart du début après un temps. Le plat et le dos partagent la même horloge. Mouvement réduit : le
 * titre brille sans passage.
 */
export const createGlowSweep = () => {
  const time = { value: -1 };
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    /** Fait passer la lumière sur la lueur de cette matière (son emissiveMap), le long de `span`. */
    add: (material: THREE.MeshStandardMaterial, span: GlowSpan): void => {
      material.onBeforeCompile = (shader) => {
        shader.uniforms.sweepTime = time;
        shader.uniforms.sweepAxis = { value: span.axis === 'u' ? new THREE.Vector2(1, 0) : new THREE.Vector2(0, 1) };
        shader.uniforms.sweepSpan = { value: new THREE.Vector3(span.from, span.to, 0.7 / Math.max(1, span.letters)) };
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float sweepTime;\nuniform vec2 sweepAxis;\nuniform vec3 sweepSpan;')
          .replace(
            '#include <emissivemap_fragment>',
            `#ifdef USE_EMISSIVEMAP
              vec4 emissiveColor = texture2D(emissiveMap, vEmissiveMapUv);
              float along = (dot(vEmissiveMapUv, sweepAxis) - sweepSpan.x) / (sweepSpan.y - sweepSpan.x);
              float center = sweepTime < 0.0 ? -9.0 : mix(-0.3, 1.3, mod(sweepTime, ${PERIOD_S.toFixed(2)}) / ${SWEEP_S.toFixed(2)});
              float d = (along - center) / sweepSpan.z;
              totalEmissiveRadiance *= emissiveColor.rgb * (1.0 + ${BOOST.toFixed(2)} * exp(-d * d));
            #endif`,
          );
      };
    },
    /** Avance l'horloge (ms) : true tant que la lumière passe (l'image est à refaire). */
    tick: (now: number): boolean => {
      if (still) return false;
      const seconds = now / 1000;
      const passing = seconds % PERIOD_S < SWEEP_S * 1.1;
      // Une dernière image après le passage, pour l'effacer.
      const changed = passing || time.value % PERIOD_S < SWEEP_S * 1.1;
      time.value = seconds;
      return changed;
    },
  };
};

export type GlowSweep = ReturnType<typeof createGlowSweep>;
