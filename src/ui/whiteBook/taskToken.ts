import * as THREE from 'three';
import { t } from '../../i18n';
import { writeDigits } from '../../core/format';
import { dailyRunning } from '../../systems/tasks';
import type { PileOrnament } from '../book3d/pile3d';
import type { GameState } from '../../core/state';

/** Le jeton, à la taille de l'anneau de la clé, collé à sa gauche (maquette .ai/maquette-taches.html). */
const RADIUS = 0.12;
const AT = new THREE.Vector3(-0.29, 0.6, 0.03);
/** Au repos, il reste mat : son laiton un peu assombri. */
const MATTE = 0.82;

/** Le jeton de laiton, l'hexagone de Babel frappé dessus, face au lecteur. */
const tokenModel = (brass: THREE.Material, rim: THREE.Material): THREE.Group => {
  const coin = new THREE.Group();
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(RADIUS, RADIUS, 0.03, 32), brass);
  disc.rotation.x = Math.PI / 2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(RADIUS * 0.84, 0.008, 6, 40), rim);
  const hexagon = new THREE.Mesh(new THREE.TorusGeometry(RADIUS * 0.48, 0.008, 6, 6), rim);
  hexagon.rotation.z = Math.PI / 6;
  ring.position.z = hexagon.position.z = 0.016;
  coin.add(disc, ring, hexagon);
  return coin;
};

/**
 * Le raccourci des tâches : un petit jeton collé à la clé, sur la pile, toujours là dès le Nord allumé. Mat au repos, il
 * brille quand une tâche faite attend qu'on prenne ce qu'elle rapporte (pile.news) ; au survol, la légende de la pile
 * (« 2 tâches en cours ») ; au clic, le livre blanc s'ouvre sur les tâches (`onOpen`).
 */
export const taskToken = (state: GameState, onOpen: () => void): PileOrnament => {
  const color = new THREE.Color(0xc99a3e);
  const brass = new THREE.MeshStandardMaterial({
    color: color.clone().multiplyScalar(MATTE),
    metalness: 0.5,
    roughness: 0.35,
    emissive: 0xf0c870,
    emissiveIntensity: 0,
  });
  const rim = new THREE.MeshStandardMaterial({ color: 0x5a3c0f, metalness: 0.3, roughness: 0.6 });
  return {
    id: 'tasks',
    label: () => {
      const running = dailyRunning(state);
      if (running === 0) return t('whiteBook.tasks.allDoneShort');
      return running === 1 ? t('whiteBook.tasks.runningOne') : t('whiteBook.tasks.running').replace('{n}', writeDigits(String(running)));
    },
    model: () => {
      const holder = new THREE.Group();
      holder.add(tokenModel(brass, rim));
      // Une zone invisible un peu plus large : un si petit jeton se rate.
      holder.add(new THREE.Mesh(new THREE.BoxGeometry(RADIUS * 2.6, RADIUS * 2.6, 0.06), new THREE.MeshBasicMaterial({ visible: false })));
      return holder;
    },
    glow: (amount) => {
      brass.color.copy(color).multiplyScalar(MATTE + (1 - MATTE) * Math.min(1, amount * 2));
      brass.emissiveIntensity = 0.6 * amount;
    },
    onOpen,
    lean: 0,
    dz: 0,
    glued: { to: 'library', at: AT },
  };
};
