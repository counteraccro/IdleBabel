import { ETHERIUM_PAGES, STARS, type PageId } from '../../data/etheriumStars';
import { etherDeserved, nextEtherPages, prestige, prestigeGain } from '../../systems/prestige';
import { starLit } from '../../systems/etherium';
import { t } from '../../i18n';
import { ETHER_PAGES } from '../../data/etherium';
import type { GameState } from '../../core/state';
import { saveGame } from '../../core/save';
import { ETHERIUM_HASH } from '../../ui/etherium/prestigeStory';
import { rebuildScreen } from '../refresh';
import { format, type DebugSubject } from './subject';

const starsOf = (page: PageId) => STARS.filter((star) => star.page === page);

/**
 * L'ouverture de l'Etherium rapportera `gain` Éther : les pages à vie montent jusqu'à le mériter (ajoutées aux pages,
 * comme si on les avait lues), ou, s'il en faut moins, l'Éther déjà reçu monte. Les pages à vie ne baissent jamais.
 */
const setGain = (state: GameState, gain: number): void => {
  const wanted = Math.max(0, Math.round(gain));
  const deserved = state.etherReceived + wanted;
  if (deserved > etherDeserved(state)) {
    // Un rien de plus : la racine cubique de n³ milliards tombe parfois juste sous n.
    const missing = deserved ** 3 * ETHER_PAGES * (1 + 1e-12) - state.totalPagesRead;
    state.totalPagesRead += missing;
    state.pages += missing;
  } else state.etherReceived = etherDeserved(state) - wanted;
};

/** Le prestige (conception §4) : l'Éther, ce qu'il rapporterait, et les étoiles de l'Etherium. */
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
      kit.number(
        'Éther à l’ouverture',
        () => prestigeGain(state),
        (v) => setGain(state, v),
        {
          hint: 'Ce que rapporterait le prestige (la couverture de l’Etherium l’affiche dès 1). Plus haut : les pages à vie qu’il faut sont ajoutées (et aux pages) ; plus bas : l’Éther reçu monte.',
          steps: true,
        },
      );
      kit.number(
        'Éther à dépenser',
        () => state.ether,
        (v) => (state.ether = Math.max(0, Math.round(v))),
        { steps: true },
      );
      kit.info(
        'Éther reçu',
        () => format(state.etherReceived),
        'Tout l’Éther déjà touché, prestiges compris : l’ouverture rapporte l’Éther mérité moins celui-ci.',
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
          () => {
            if (prestige(state) < 1) return;
            // Comme dans le jeu : enregistré aussitôt, et l'on se réveille l'Etherium ouvert.
            saveGame(state);
            if (window.location.hash === ETHERIUM_HASH) rebuildScreen();
            else window.location.hash = ETHERIUM_HASH;
          },
          {
            title: 'Sans confirmation ni récit : l’Éther reçu, tout est remis à zéro, la partie enregistrée, l’Etherium ouvert.',
          },
        ],
      );
    },
  },
  {
    id: 'etherium',
    chapter: 'prestige',
    name: 'L’Etherium',
    description: 'Les étoiles allumées sur chaque page (dans l’ordre des données, chacune après son étoile d’avant).',
    peek: (state) => `${state.etherium.length} étoiles`,
    build: (kit, state) => {
      for (const page of ETHERIUM_PAGES)
        kit.number(
          t(`etherium.pages.${page}.name`),
          () => starsOf(page).filter((star) => starLit(state, star.id)).length,
          (v) => {
            const lit = starsOf(page)
              .slice(0, Math.max(0, Math.round(v)))
              .map((star) => star.id);
            state.etherium = [...state.etherium.filter((id) => !id.startsWith(`${page}.`)), ...lit];
          },
          { steps: true, max: starsOf(page).length },
        );
      kit.actions([
        'Tout éteindre',
        () => (state.etherium = []),
        { danger: true, title: 'Aucune étoile allumée (l’Éther dépensé n’est pas rendu).' },
      ]);
    },
  },
];
