import { el } from '../../ui/dom';
import { PLATES, SEALS, type PlateId } from '../../data/seals';
import { announceSeals, countObtained, plateSeals, sealAll } from '../../systems/seals';
import { rewriteBigBook } from '../refresh';
import type { DebugSubject } from './subject';

const PLATE_NAMES: Record<PlateId, string> = {
  pages: 'Pages',
  books: 'Livres',
  fragments: 'Trouvailles',
  time: 'Temps',
  methods: 'Méthodes',
  secrets: 'Secrets',
};

const ALL: DebugSubject = {
  id: 'seals',
  chapter: 'seals',
  name: 'Tous les sceaux',
  description: 'Combien sont obtenus, une vision, tout débloquer.',
  peek: (state) => `${countObtained(state, SEALS)}/${SEALS.length}`,
  build: (kit, state) => {
    kit.info('Obtenus', () => `${countObtained(state, SEALS)} / ${SEALS.length}`);
    kit.info('Pas encore vus', () => String(state.newSeals.length));
    kit.actions(
      [
        'Une vision',
        () => announceSeals([SEALS[Math.floor(Math.random() * SEALS.length)].id]),
        { title: 'Annonce un sceau sans rien débloquer' },
      ],
      ['Tout débloquer', () => (sealAll(state), rewriteBigBook())],
      [
        'Tout reprendre',
        () => {
          state.seals = {};
          state.newSeals = [];
          rewriteBigBook();
        },
        { danger: true, title: 'Ceux déjà atteints reviennent aussitôt' },
      ],
    );
  },
};

/** Une fiche par planche : ses sceaux, obtenus ou non, qu'un clic appose ou reprend. */
const PLATE_SUBJECTS: DebugSubject[] = PLATES.map((plate) => ({
  id: `plate:${plate}`,
  chapter: 'seals',
  name: `Planche ${PLATE_NAMES[plate]}`,
  description: 'Ses sceaux un par un, à apposer ou reprendre.',
  peek: (state) => `${countObtained(state, plateSeals(plate))}/${plateSeals(plate).length}`,
  build: (kit, state) => {
    const seals = plateSeals(plate);
    const list = el('div', 'debug-segments');
    let shown = '';
    const draw = (): void => {
      list.replaceChildren(
        ...seals.map((seal) => {
          const obtained = seal.id in state.seals;
          const button = el('button', obtained ? 'written' : 'missing', seal.id);
          button.title = obtained ? 'Obtenu : cliquer pour le reprendre' : 'Cliquer pour l’apposer';
          button.addEventListener('click', () => {
            if (obtained) {
              delete state.seals[seal.id];
              state.newSeals = state.newSeals.filter((id) => id !== seal.id);
            } else {
              state.seals[seal.id] = Date.now();
              state.newSeals.push(seal.id);
              announceSeals([seal.id]);
            }
            rewriteBigBook();
          });
          return button;
        }),
      );
    };
    kit.custom(list);
    kit.info(
      'Obtenus',
      () => {
        // Relu avec les autres lignes : les sceaux se redessinent quand ils changent.
        const now = seals.map((seal) => (seal.id in state.seals ? 1 : 0)).join('');
        if (now !== shown) {
          shown = now;
          draw();
        }
        return `${countObtained(state, seals)} / ${seals.length}`;
      },
      'Un clic sur un sceau l’appose ou le reprend.',
    );
  },
}));

export const SEAL_SUBJECTS: DebugSubject[] = [ALL, ...PLATE_SUBJECTS];
