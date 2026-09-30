import * as THREE from 'three';

/** Respiration de la lueur : de 1 - BREATH à 1, en BREATH_S secondes. */
const BREATH = 0.3;
const BREATH_S = 2.8;
/** Reflet qui passe sur la trouvaille, en travers de la page : un passage toutes les SHEEN_S secondes. */
const SHEEN_S = 4.5;
/** Force de la lueur (au plus fort de la respiration) et du reflet. */
const GLOW = 0.7;
const SHEEN = 0.5;

/**
 * Lueur des trouvailles sur les pages du livre 3D : la page porte son masque de lueur
 * (texture.userData.glow, pageCache.ts), qui brille en or, respire doucement, et qu'un reflet traverse
 * de temps en temps. Toutes les pages d'un livre partagent la même horloge.
 */
export const createPageGlow = () => {
  const time = { value: 0 };
  const materials: THREE.MeshStandardMaterial[] = [];
  return {
    /** Prépare une matière de page à briller. */
    add: (material: THREE.MeshStandardMaterial): void => {
      material.emissive.set(0x000000);
      material.onBeforeCompile = (shader) => {
        shader.uniforms.glowTime = time;
        shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float glowTime;').replace(
          '#include <emissivemap_fragment>',
          `#ifdef USE_EMISSIVEMAP
              vec3 glowMask = texture2D(emissiveMap, vEmissiveMapUv).rgb;
              float breath = 1.0 - ${BREATH.toFixed(3)} * (0.5 + 0.5 * cos(glowTime * ${((2 * Math.PI) / BREATH_S).toFixed(4)}));
              float band = fract(glowTime / ${SHEEN_S.toFixed(2)}) * 2.6 - 0.8;
              float across = vEmissiveMapUv.x + 0.4 * (1.0 - vEmissiveMapUv.y) - band;
              float sheen = exp(-across * across * 90.0);
              totalEmissiveRadiance *= glowMask * (${GLOW.toFixed(3)} * breath + ${SHEEN.toFixed(3)} * sheen);
            #endif`,
        );
      };
      materials.push(material);
    },
    /** La page `map` est posée sur `material` : sa lueur avec elle, s'il y en a une. */
    show: (material: THREE.MeshStandardMaterial, map: THREE.Texture | null): void => {
      const glow = (map?.userData.glow as THREE.Texture | undefined) ?? null;
      if (material.emissiveMap === glow) return;
      material.emissiveMap = glow;
      material.emissive.set(glow ? 0xffffff : 0x000000);
      material.needsUpdate = true;
    },
    /** Une page visible brille-t-elle ? (l'image est alors refaite à chaque instant) */
    get shining(): boolean {
      return materials.some((material) => material.emissiveMap !== null);
    },
    /** Avance l'horloge de la lueur (secondes). */
    set time(seconds: number) {
      time.value = seconds;
    },
  };
};

export type PageGlow = ReturnType<typeof createPageGlow>;
