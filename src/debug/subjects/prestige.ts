import { ETHERIUM_PAGES, STARS, type PageId } from '../../data/etheriumStars';
import { etherDeserved, nextEtherPages, prestige, prestigeGain } from '../../systems/prestige';
import { starLit } from '../../systems/etherium';
import { t } from '../../i18n';
import { format, type DebugSubject } from './subject';

const starsOf = (page: PageId) => STARS.filter((star) => star.page === page);

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
