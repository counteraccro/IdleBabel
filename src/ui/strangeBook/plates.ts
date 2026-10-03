import { getLocale, t } from '../../i18n';
import { formatNumber, writeDigits } from '../../core/format';
import { PLATES, SEALS, type PlateId, type SealDef } from '../../data/seals';
import { babelName, completion, countObtained, plateSeals, sealObtained } from '../../systems/seals';
import { statsRevealed } from '../../systems/strangeBook';
import { isDeciphered } from '../../systems/decipher';
import { folio, heading, type Item, type TextItem } from './pageItems';
import type { GameState } from '../../core/state';

/**
 * Les sceaux dans le livre étrange : une page d'avancement, puis une planche par thème, en alvéoles
 * (cinq rangées de 4 et 5 sceaux par page ; une planche trop remplie continue sur la page suivante).
 */
const ROWS = [4, 5, 4, 5, 4];
const PER_PAGE = ROWS.reduce((sum, count) => sum + count, 0);
const SEAL_SIZE = 100;
/** Un hexagone fait 0,81 × 0,94 de son carré : un peu d'écart entre les alvéoles, rangées en quinconce. */
const STEP_X = 94;
const FIRST_ROW = 235;
const STEP_Y = 82;

export interface PlatePage {
  plate: PlateId;
  seals: SealDef[];
  /** Morceau de la planche (0 : sa première page) ; `page` : index de la page dans le livre. */
  part: number;
  page: number;
}

/** Les pages des planches, à partir de la page `first`. */
export const platePages = (first: number): PlatePage[] => {
  const pages: PlatePage[] = [];
  for (const plate of PLATES) {
    const seals = plateSeals(plate);
    for (let part = 0; part * PER_PAGE < seals.length; part++) {
      pages.push({ plate, seals: seals.slice(part * PER_PAGE, (part + 1) * PER_PAGE), part, page: first + pages.length });
    }
  }
  return pages;
};

// Titres (lisibles avec le sommaire) et légendes (avec la partie « sceaux ») : en symboles de Babel
// tant qu'ils ne sont pas déchiffrés. Titres d'un ou deux mots, comme ceux des chapitres (ils tiennent
// devant les points de conduite du sommaire).
export const sealsTitle = (state: GameState): string =>
  isDeciphered(state, 'contents') ? t('strangeBook.sealsTitle') : babelName('seals', 1);
export const plateTitle = (state: GameState, plate: PlateId): string =>
  isDeciphered(state, 'contents') ? t(`strangeBook.plates.${plate}`) : babelName(`plate:${plate}`, 1);

const sealText = (seal: SealDef): string => {
  const text = t(`strangeBook.seals.${seal.text}`).replace('{title}', seal.rareBook ? t(`rareBooks.${seal.rareBook}.name`) : '');
  return seal.tier ? text.replace('{n}', formatNumber(seal.tier.n, getLocale())) : text;
};

const date = (at: number): string =>
  writeDigits(new Date(at).toLocaleDateString(getLocale(), { day: '2-digit', month: '2-digit', year: 'numeric' }));

/** Légende du sceau survolé : son nom en symboles, et ce qu'il récompense une fois obtenu. */
export const sealLegend = (state: GameState, id: string | null): { name: string; text: string } => {
  const seal = SEALS.find((candidate) => candidate.id === id);
  if (!seal) return { name: '', text: '' };
  const obtained = sealObtained(state, seal);
  const when = obtained ? date(state.seals[seal.id]) : '…';
  // Lisible : ce que le sceau récompense, puis sa date.
  if (isDeciphered(state, 'seals')) return { name: sealText(seal), text: when };
  // Illisible comme le reste du livre (en symboles de Babel) ; la date, en chiffres.
  return { name: babelName(seal.id), text: obtained ? `${babelName(`${seal.id}:text`, 4)} — ${when}` : when };
};

/** Planches qui ne disent pas combien il reste à trouver. */
const HIDDEN_PLATES: readonly PlateId[] = ['rare', 'secrets'];

/** Obtenus sur total ; les secrets et les livres rares ne disent pas combien il en reste. */
const tally = (state: GameState, plate: PlateId): string => {
  const seals = plateSeals(plate);
  return writeDigits(`${countObtained(state, seals)} / ${HIDDEN_PLATES.includes(plate) && !statsRevealed() ? '?' : seals.length}`);
};

const LINE_TOP = 400;
const LINE_STEP = 46;

/** Légende du pourcentage des sceaux (illisible tant que les sceaux ne sont pas déchiffrés). */
export const completionCaption = (state: GameState): TextItem => ({
  kind: 'text',
  text: isDeciphered(state, 'seals') ? t('strangeBook.sealsCompletion') : babelName('completion'),
  x: 320,
  y: 305,
  size: 20,
  align: 'center',
  italic: true,
  faded: true,
  spacing: 3,
});

/** Introduction : la part des sceaux obtenus, et l'avancement de chaque planche. */
export const completionItems = (state: GameState, plates: PlatePage[], number: number): Item[] => [
  ...heading(sealsTitle(state)),
  { kind: 'text', text: writeDigits(`${Math.floor(completion(state) * 100)} %`), x: 320, y: 200, size: 84, align: 'center', spacing: 2 },
  completionCaption(state),
  ...plates
    .filter((plate) => plate.part === 0)
    .flatMap((plate, index): Item[] => {
      const y = LINE_TOP + index * LINE_STEP;
      return [
        ...(plateHasNews(state, plate.plate) ? [newsMark(98, y, 22)] : []),
        { kind: 'text', text: plateTitle(state, plate.plate), x: 110, y, size: 22, align: 'left', spacing: 2 },
        { kind: 'dots', x1: 330, x2: 450, y: y + 17 },
        { kind: 'text', text: tally(state, plate.plate), x: 530, y, size: 22, align: 'right' },
        { kind: 'link', y: y - 8, height: LINE_STEP - 4, target: plate.page },
      ];
    }),
  folio(number),
];

/** Des sceaux de la planche n'ont pas encore été vus : une étoile le signale au sommaire. */
export const plateHasNews = (state: GameState, plate: PlateId): boolean =>
  plateSeals(plate).some((seal) => state.newSeals.includes(seal.id));
/** Étoile dorée dans la marge, devant un titre dont la planche a du nouveau. */
export const newsMark = (x: number, y: number, size: number): Item => ({ kind: 'text', text: '✦', x, y, size, align: 'right', gold: true });

/**
 * Une page de planche : titre, compte, alvéoles, et la légende du sceau survolé. `fresh` : sceaux tout
 * juste obtenus, qui luisent plus fort jusqu'à ce qu'on les survole.
 */
export const plateItems = (
  state: GameState,
  page: PlatePage,
  legend: { name: string; text: string },
  fresh: (id: string) => boolean,
): Item[] => {
  let index = 0;
  const seals = ROWS.flatMap((count, row): Item[] => {
    const inRow = page.seals.slice(index, index + count);
    index += count;
    // Emplacements fixes de la rangée (quinconce) : une rangée incomplète en occupe ceux du milieu,
    // sans se recentrer d'une demi-alvéole (elle s'alignerait sur ses voisines et les chevaucherait).
    const first = Math.floor((count - inRow.length) / 2);
    return inRow.map((seal, i): Item => {
      const obtained = sealObtained(state, seal);
      const look = obtained ? 'gold' : HIDDEN_PLATES.includes(seal.plate) && !statsRevealed() ? 'hidden' : 'embossed';
      return {
        kind: 'seal',
        id: seal.id,
        series: seal.text,
        tier: seal.tier?.index ?? 0,
        look,
        x: 320 + (first + i - (count - 1) / 2) * STEP_X,
        y: FIRST_ROW + row * STEP_Y,
        size: SEAL_SIZE,
        fresh: obtained && fresh(seal.id),
      };
    });
  });
  return [
    ...heading(plateTitle(state, page.plate)),
    {
      kind: 'text',
      text: `✦ ${tally(state, page.plate)}`,
      x: 320,
      y: 150,
      size: 20,
      align: 'center',
      italic: true,
      faded: true,
      spacing: 3,
    },
    ...seals,
    { kind: 'text', text: legend.name, x: 320, y: 628, size: 24, align: 'center', spacing: 4, steady: true },
    { kind: 'text', text: legend.text, x: 320, y: 666, size: 18, align: 'center', italic: true, faded: true, steady: true },
    folio(page.page + 1),
  ];
};
