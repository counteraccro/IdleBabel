import * as THREE from 'three';
import { t } from '../../i18n';
import { writeDigits } from '../../core/format';
import { dailyRunning } from '../../systems/tasks';
import type { ShelfOrnament } from '../book3d/shelf3d';
import type { GameState } from '../../core/state';
import { TOKEN_RADIUS, tokenModel } from '../relics/tokenModel';

/** Le jeton, à la taille de l'anneau de la clé (maquette .ai/maquette-taches.html). */
const RADIUS = 0.12;
/** Contre le livre blanc, un peu plus grand (maquette .ai/maquette-menus.html : 24 px pour des livres de 74). */
const AGAINST_SCALE = 1.35;
/** Au repos, il reste mat : son laiton un peu assombri. */
const MATTE = 0.82;
/** Le rebord n'a pas le reflet de la pièce : moins métallique, le laiton prend la lumière des lampes. */
const METALNESS = 0.5;

/**
 * Le raccourci des tâches : un petit jeton appuyé contre le livre blanc (ses tâches y sont), sur le rebord, toujours là dès
 * le Nord allumé. Mat au repos, il brille quand une tâche faite attend qu'on prenne ce qu'elle rapporte (shelf.news) ; au
 * survol, « 2 tâches en cours » à la place du nom du livre ; au clic, le livre blanc s'ouvre sur les tâches (`onOpen`).
 */
export const taskToken = (state: GameState, onOpen: () => void): ShelfOrnament => {
  // Le vrai Jeton, celui de la relique (relics/tokenModel.ts), ramené à la taille de l'anneau de la clé.
  const coin = tokenModel(null, 0);
  const brass: THREE.MeshStandardMaterial[] = [];
  coin.traverse((object) => {
    if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshStandardMaterial) brass.push(object.material);
  });
  const color = brass[0].color.clone();
  for (const material of brass) {
    material.metalness = METALNESS;
    material.color.copy(color).multiplyScalar(MATTE);
    material.emissive.set(0xf0c870);
  }
  coin.scale.setScalar(RADIUS / TOKEN_RADIUS);
  coin.position.y = -RADIUS;
  // Un peu devant la couverture : sinon le bas du livre le cache à moitié.
  coin.position.z = 0.06;
  return {
    id: 'tasks',
    label: () => {
      const running = dailyRunning(state);
      if (running === 0) return t('whiteBook.tasks.allDoneShort');
      return running === 1 ? t('whiteBook.tasks.runningOne') : t('whiteBook.tasks.running').replace('{n}', writeDigits(String(running)));
    },
    model: () => {
      const holder = new THREE.Group();
      holder.add(coin);
      // Une zone invisible un peu plus large : un si petit jeton se rate.
      holder.add(new THREE.Mesh(new THREE.BoxGeometry(RADIUS * 2.6, RADIUS * 2.6, 0.06), new THREE.MeshBasicMaterial({ visible: false })));
      return holder;
    },
    glow: (amount) => {
      for (const material of brass) {
        material.color.copy(color).multiplyScalar(MATTE + (1 - MATTE) * Math.min(1, amount * 2));
        material.emissiveIntensity = 0.6 * amount;
      }
    },
    onOpen,
    place: { against: 'white', scale: AGAINST_SCALE },
  };
};
