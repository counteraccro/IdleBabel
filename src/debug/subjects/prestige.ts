import { ETHERIUM_TREES } from '../../data/etherium';
import { etherDeserved, nextEtherPages, nodesOf, prestige, prestigeGain } from '../../systems/prestige';
import { format, type DebugSubject } from './subject';

/** Le prestige (conception §4) : l'Éther, ce qu'il rapporterait, et les arbres de l'Etherium. */
export const PRESTIGE_SUBJECTS: DebugSubject[] = [
  {
    id: 'prestige',
    chapter: 'prestige',
    name: 'Le prestige',
    description: 'L’Éther mérité par les pages à vie, ce que rapporterait le prestige, l’Etherium en main.',
    peek: (state) => `${format(state.ether)} Éther · +${format(prestigeGain(state))}`,
    build: (kit, state) => {
      kit.info('Pages à vie', () => format(state.totalPagesRead), 'L’Éther vient d’elles : ⌊∛(pages / 1 Md)⌋.');
      kit.info('Éther mérité', () => `${format(etherDeserved(state))} (le suivant à ${format(nextEtherPages(state))} pages)`);
      kit.info('Prestige', () => `+${format(prestigeGain(state))} Éther`, 'Le livre violet attend dans la pile dès +1.');
      kit.number(
        'Éther à dépenser',
        () => state.ether,
        (v) => (state.ether = Math.max(0, Math.round(v))),
        { steps: true },
      );
      kit.number(
        'Éther reçu',
        () => state.etherReceived,
        (v) => (state.etherReceived = Math.max(0, Math.round(v))),
        { steps: true },
      );
      kit.info('Prestiges faits', () => String(state.exiles));
      kit.check(
        'Etherium en main',
        'Au réveil : ses pages s’ouvrent ; refermé, il reste sur la pile, fermé jusqu’au prochain prestige.',
        () => state.etheriumInHand,
        (on) => (state.etheriumInHand = on),
      );
      kit.actions(
        [
          'Pages pour l’Éther suivant',
          () => {
            const missing = nextEtherPages(state) - state.totalPagesRead;
            state.totalPagesRead += missing;
            state.pages += missing;
          },
          { title: 'Ajoute aux pages (et aux pages à vie) ce qu’il manque pour le prochain Éther.' },
        ],
        [
          'Prestige tout de suite',
          () => void prestige(state),
          { title: 'Sans confirmation ni récit : l’Éther reçu, tout est remis à zéro, l’Etherium en main.' },
        ],
      );
    },
  },
  {
    id: 'etherium',
    chapter: 'prestige',
    name: 'L’Etherium',
    description: 'Les nœuds pris dans chaque arbre.',
    peek: (state) => `${ETHERIUM_TREES.reduce((sum, tree) => sum + nodesOf(state, tree.id), 0)} nœuds`,
    build: (kit, state) => {
      for (const tree of ETHERIUM_TREES)
        kit.number(
          tree.id,
          () => nodesOf(state, tree.id),
          (v) => (state.etherium[tree.id] = Math.max(0, Math.min(tree.costs.length, Math.round(v)))),
          { steps: true, max: tree.costs.length },
        );
      kit.actions([
        'Tout effacer',
        () => (state.etherium = {}),
        { danger: true, title: 'Aucun nœud pris (l’Éther dépensé n’est pas rendu).' },
      ]);
    },
  },
];
