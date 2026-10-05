import { getLocale, t } from '../../i18n';
import { formatCount, writeDigits } from '../../core/format';
import { BOOK_PAGES, PLATES, SEALS, sealSeries, type PlateId, type SealDef } from '../../data/seals';
import { babelName, completion, countObtained, plateSeals, sealFindMultiplier, sealObtained } from '../../systems/seals';
import { statsRevealed } from '../../systems/strangeBook';
import { isDeciphered } from '../../systems/decipher';
import { CAPTION_WIDTH, fitCaption, folio, heading, textWidth, type Item, type TextItem } from './pageItems';
import type { GameState } from '../../core/state';
import { TOOLS, type ToolId } from '../../data/tools';

/**
 * Les sceaux dans le livre étrange : une page d'avancement, puis une planche par thème, en alvéoles
 * (cinq rangées de 4 et 5 sceaux par page ; une planche trop remplie continue sur la page suivante).
 */
const ROWS = [4, 5, 4, 5, 4];
const PER_PAGE = ROWS.reduce((sum, count) => sum + count, 0);
const SEAL_SIZE = 100;
/** Un hexagone fait 0,81 × 0,94 de son carré : un peu d'écart entre les alvéoles, rangées en quinconce. */
const STEP_X = 94;
const FIRST_ROW = 228;
const STEP_Y = 82;
/** Une page de méthode descend ses alvéoles sous le sous-titre. */
const METHOD_SHIFT = 40;

export interface PlatePage {
  plate: PlateId;
  seals: SealDef[];
  /** Morceau de la planche (0 : sa première page) ; `page` : index de la page dans le livre. */
  part: number;
  /** Planche « Méthodes » : la méthode de la page (une page chacune) ; `all`, toutes à la fois. */
  method?: ToolId | 'all';
  page: number;
}

/** Les pages des planches, à partir de la page `first`. */
export const platePages = (first: number): PlatePage[] => {
  const pages: PlatePage[] = [];
  for (const plate of PLATES) {
    const seals = plateSeals(plate);
    // Une page par méthode, ses sceaux seulement (l'auteur a d'autres idées de sceaux pour chacune), puis
    // celle de toutes les méthodes à la fois.
    if (seals.some((seal) => seal.method)) {
      [...TOOLS.map((tool) => tool.id), 'all' as const].forEach((method, part) =>
        pages.push({ plate, seals: seals.filter((seal) => seal.method === method), part, method, page: first + pages.length }),
      );
      continue;
    }
    // Une série peut avoir sa propre page (seal.page) ; une page trop remplie continue sur la suivante.
    const groups = [...new Set(seals.map((seal) => seal.page ?? 0))].sort((a, b) => a - b);
    let part = 0;
    for (const group of groups) {
      const inGroup = seals.filter((seal) => (seal.page ?? 0) === group);
      for (let start = 0; start < inGroup.length; start += PER_PAGE, part++) {
        pages.push({ plate, seals: inGroup.slice(start, start + PER_PAGE), part, page: first + pages.length });
      }
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
  const title = seal.rareBook ? t(`rareBooks.${seal.rareBook}.name`) : seal.tool ? t(`tools.${seal.tool}.name`) : '';
  // Une phrase à lui, à son palier ; le nombre, dans la notation choisie au cahier d'options comme les autres.
  const key = seal.phrases && seal.tier ? `${seal.text}.${seal.tier.index}` : seal.text;
  const text = t(`strangeBook.seals.${key}`).replace('{title}', title);
  if (!seal.tier) return text;
  // Les volumes de méthodes : « un volume », « deux volumes »… (410 achats chacun).
  return text
    .replace('{volumes}', () => t(`strangeBook.volumes.${seal.tier!.n / BOOK_PAGES}`))
    .replace('{n}', formatCount(seal.tier.n, getLocale()));
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
const tally = (state: GameState, plate: PlateId, seals = plateSeals(plate)): string =>
  writeDigits(`${countObtained(state, seals)} / ${HIDDEN_PLATES.includes(plate) && !statsRevealed() ? '?' : seals.length}`);

/**
 * Sous-titre d'une page de méthode : son nom, une fois la méthode possédée au moins une fois (son premier
 * sceau), et le sommaire déchiffré ; sinon en symboles (le livre ne la révèle pas avant le livre blanc).
 */
const methodTitle = (state: GameState, method: ToolId | 'all'): string => {
  if (!isDeciphered(state, 'contents')) return babelName(`method:${method}`, 2);
  if (method === 'all') return t('strangeBook.allMethods');
  return `${method}-1` in state.seals ? t(`tools.${method}.name`) : babelName(`method:${method}`, 2);
};

const LINE_TOP = 400;
const LINE_STEP = 40;

/** Légende du pourcentage des sceaux (illisible tant que les sceaux ne sont pas déchiffrés). */
const completionCaption = (state: GameState): TextItem => ({
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

/** Ce que les sceaux rapportent : +1 % de trouvailles chacun, et le total (illisible tant qu'ils ne sont pas déchiffrés). */
const bonusLine = (state: GameState): TextItem => {
  const total = writeDigits(`+${Math.round((sealFindMultiplier(state) - 1) * 100)} %`);
  return fitCaption({
    kind: 'text',
    text: isDeciphered(state, 'seals') ? t('strangeBook.sealsBonus').replace('{total}', total) : `${babelName('bonus', 3)} · ${total}`,
    x: 320,
    y: 340,
    size: 20,
    align: 'center',
    spacing: 2,
  });
};

/** Introduction : la part des sceaux obtenus, et l'avancement de chaque planche. */
export const completionItems = (state: GameState, plates: PlatePage[], number: number): Item[] => [
  ...heading(sealsTitle(state)),
  { kind: 'text', text: writeDigits(`${Math.floor(completion(state) * 100)} %`), x: 320, y: 200, size: 84, align: 'center', spacing: 2 },
  completionCaption(state),
  bonusLine(state),
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

/** Nom du sceau survolé, sous les alvéoles. */
const LEGEND = { kind: 'text', text: '', x: 320, size: 24, align: 'center', spacing: 4, steady: true } as const;
const LEGEND_TOP = 612;
const LEGEND_STEP = 30;

/**
 * Le nom tient sur une ligne, ou se coupe en deux, plus serré (les légendes des secrets sont des phrases).
 * Toujours deux lignes, aux mêmes places (la première vide pour un nom court) : survoler un sceau ne
 * fait que réécrire leur texte, sans reconstruire la page.
 */
const legendLines = (name: string): TextItem[] => {
  const line = (text: string, row: number, size: number, spacing: number): TextItem => ({
    ...LEGEND,
    text,
    y: LEGEND_TOP + row * LEGEND_STEP,
    size,
    spacing,
  });
  if (textWidth(line(name, 1, LEGEND.size, LEGEND.spacing)) <= CAPTION_WIDTH)
    return [line('', 0, 22, 2), line(name, 1, LEGEND.size, LEGEND.spacing)];
  // Coupure au mot le plus proche du milieu (en largeur).
  const words = name.split(' ');
  const cut = (at: number): [string, string] => [words.slice(0, at).join(' '), words.slice(at).join(' ')];
  const width = (text: string): number => textWidth(line(text, 0, 22, 2));
  let best = 1;
  for (let at = 2; at < words.length; at++) {
    const [a, b] = cut(at);
    const [ba, bb] = cut(best);
    if (Math.max(width(a), width(b)) < Math.max(width(ba), width(bb))) best = at;
  }
  const [first, second] = cut(best);
  return [fitCaption(line(first, 0, 22, 2)), fitCaption(line(second, 1, 22, 2))];
};

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
        series: sealSeries(seal),
        tier: seal.tier?.index ?? 0,
        look,
        x: 320 + (first + i - (count - 1) / 2) * STEP_X,
        y: FIRST_ROW + (page.method ? METHOD_SHIFT : 0) + row * STEP_Y,
        size: SEAL_SIZE,
        fresh: obtained && fresh(seal.id),
      };
    });
  });
  const subtitle: Item[] = page.method
    ? [
        fitCaption({
          kind: 'text',
          text: methodTitle(state, page.method),
          x: 320,
          y: 146,
          size: 24,
          align: 'center',
          italic: true,
          spacing: 2,
        }),
      ]
    : [];
  return [
    ...heading(plateTitle(state, page.plate)),
    ...subtitle,
    {
      kind: 'text',
      text: `✦ ${tally(state, page.plate, page.method ? page.seals : undefined)}`,
      x: 320,
      y: page.method ? 182 : 150,
      size: 20,
      align: 'center',
      italic: true,
      faded: true,
      spacing: 3,
    },
    ...seals,
    ...legendLines(legend.name),
    { kind: 'text', text: legend.text, x: 320, y: 682, size: 18, align: 'center', italic: true, faded: true, steady: true },
    folio(page.page + 1),
  ];
};
