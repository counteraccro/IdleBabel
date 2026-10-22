import { pick, rng } from './wiskyDraw';
import type { BottleName, GlassName } from './wiskyBottles';
import type { messages } from '../../../i18n';

/**
 * Le plan de WiskyPedia (textes validés le 22/10, .ai/wiskypedia-textes.md) : un guide des whiskies écrit en une
 * seule soirée par un auteur qui goûte chaque whisky qu'il décrit. Deux fiches par page de 13 à 408, de plus en
 * plus ivres ; page 409 le trou noir, page 410 « Lendemain ». Une trentaine de fiches écrites à la main à des
 * pages fixes ; toutes les autres assemblées de morceaux, tirées du numéro de la page (la même fiche à chaque
 * lecture).
 */

export type WiskyTexts = ReturnType<typeof messages>['rareBooks']['wiskyPedia'];

export const CONTENTS_PAGE = 3;
export const FIRST_FICHE_PAGE = 13;
export const LAST_FICHE_PAGE = 408;
export const BLACKOUT_PAGE = 409;
export const MORNING_PAGE = 410;

/** La première page de chaque chapitre : Speyside, Highlands, Islay, Irlande, États-Unis, Canada, Japon, France, Ailleurs. */
export const CHAPTER_PAGES = [13, 71, 121, 181, 231, 291, 321, 361, 386] as const;
const ELSEWHERE = CHAPTER_PAGES.length - 1;

export const chapterOf = (page: number): number => {
  let chapter = 0;
  CHAPTER_PAGES.forEach((start, i) => {
    if (page >= start) chapter = i;
  });
  return chapter;
};

/** L'ivresse au fil des pages : sobre jusqu'à la page 60, éméché vers 180, ivre vers 290, perdu à la fin. */
const CURVE: readonly (readonly [number, number])[] = [
  [13, 0],
  [60, 0.08],
  [180, 0.45],
  [290, 0.7],
  [380, 0.92],
  [408, 1],
];

export const drunkenness = (page: number): number => {
  if (page <= CURVE[0][0]) return 0;
  for (let i = 1; i < CURVE.length; i++) {
    const [to, value] = CURVE[i];
    const [from, before] = CURVE[i - 1];
    if (page <= to) return before + ((value - before) * (page - from)) / (to - from);
  }
  return 1;
};

/** Le degré des morceaux : 0 sobre, 1 éméché, 2 ivre, 3 très ivre. */
export const stageOf = (drunk: number): number => (drunk < 0.15 ? 0 : drunk < 0.5 ? 1 : drunk < 0.85 ? 2 : 3);

/** La gorgée de la fiche `slot` (0 à gauche, 1 à droite) de la page `page` : 1 à 792. */
export const sipOf = (page: number, slot: number): number => (page - FIRST_FICHE_PAGE) * 2 + slot + 1;

/** Le début de la soirée (20 h), en minutes, et la durée d'une gorgée : la dernière vers 3 h 10. */
const START = 20 * 60;
const MINUTES_PER_SIP = 0.545;

/** L'heure de la gorgée `sip` ; ivre, l'auteur se trompe parfois d'heure. */
export const sipTime = (texts: WiskyTexts, sip: number, drunk: number, random: () => number): string => {
  if (drunk >= 0.6 && random() < drunk - 0.5) return pick(texts.lostTimes, random);
  const minutes = Math.round(START + sip * MINUTES_PER_SIP) % (24 * 60);
  return texts.time.replace('{h}', String(Math.floor(minutes / 60))).replace('{m}', String(minutes % 60).padStart(2, '0'));
};

export type FicheLook = { bottle: BottleName } | { glass: GlassName };

/** Les fiches écrites à la main, dans l'ordre des textes (rareBooks.wiskyPedia.fixed) : leur page, leur place, leur bouteille. */
export const FIXED: readonly (FicheLook & { page: number; slot: number })[] = [
  { page: 13, slot: 0, bottle: 'tall' },
  { page: 13, slot: 1, bottle: 'green' },
  { page: 14, slot: 0, bottle: 'squat' },
  { page: 15, slot: 1, bottle: 'brown' },
  { page: 40, slot: 0, bottle: 'tall' },
  { page: 70, slot: 1, bottle: 'tall' },
  { page: 95, slot: 0, bottle: 'green' },
  { page: 121, slot: 0, bottle: 'green' },
  { page: 122, slot: 1, bottle: 'tall' },
  { page: 150, slot: 0, bottle: 'squat' },
  { page: 165, slot: 1, glass: 'half' },
  { page: 181, slot: 0, bottle: 'green' },
  { page: 200, slot: 1, bottle: 'brown' },
  { page: 231, slot: 0, bottle: 'square' },
  { page: 232, slot: 0, bottle: 'square' },
  { page: 260, slot: 1, bottle: 'tall' },
  { page: 290, slot: 0, bottle: 'tall' },
  { page: 321, slot: 0, bottle: 'decanter' },
  { page: 340, slot: 1, glass: 'empty' },
  { page: 345, slot: 0, glass: 'water' },
  { page: 361, slot: 0, bottle: 'brown' },
  { page: 380, slot: 1, glass: 'full' },
  { page: 395, slot: 0, glass: 'fallen' },
  { page: LAST_FICHE_PAGE, slot: 0, bottle: 'tall' },
];

/** Les bouteilles de chaque chapitre, pour les fiches assemblées. */
const SHAPES: readonly (readonly BottleName[])[] = [
  ['tall', 'green', 'brown', 'squat'],
  ['green', 'tall', 'brown'],
  ['green', 'squat'],
  ['green', 'tall', 'brown'],
  ['square'],
  ['tall', 'square'],
  ['decanter'],
  ['brown', 'tall'],
  ['tall', 'green', 'square', 'decanter', 'brown', 'squat'],
];

export type Fiche = FicheLook & {
  title: string;
  maker: string;
  kind: string;
  text: string;
  notes: readonly [string, string, string];
  /** L'étiquette de la bouteille, en deux lignes. */
  label: readonly string[];
  sip: number;
  time: string;
};

/** La fiche écrite à la main en (page, slot), s'il y en a une. */
const fixedAt = (page: number, slot: number): number => FIXED.findIndex((fixed) => fixed.page === page && fixed.slot === slot);

/** Quelques mots tirés de `list`, sans doublon, séparés par des virgules. */
const some = (list: readonly string[], count: number, random: () => number): string => {
  const left = [...list];
  const words: string[] = [];
  for (let i = 0; i < count && left.length; i++) words.push(left.splice(Math.floor(random() * left.length), 1)[0]);
  return words.join(', ');
};

/** Un nom écorché par l'ivresse : une lettre doublée, ou le premier mot répété. */
const slur = (name: string, stage: number, random: () => number): string => {
  if (stage >= 3 && random() < 0.4) {
    const first = name.split(' ')[0];
    return `${first} ${first}`;
  }
  if (stage >= 2 && random() < 0.35) {
    const at = 1 + Math.floor(random() * (name.length - 1));
    return /\p{L}/u.test(name[at]) ? name.slice(0, at + 1) + name.slice(at) : name;
  }
  return name;
};

/** L'étiquette d'après le titre en capitales : le nom, puis l'âge (« GLEN TARDIF 12 ANS » : « Glen Tardif », « 12 ans »). */
const labelOf = (title: string): string[] => {
  const words = title.replace(/ \(.*\)$/, '').split(' ');
  const age = words.findIndex((word) => /^\d/.test(word));
  const soft = (part: string[]): string => part.map((word) => word.charAt(0) + word.slice(1).toLocaleLowerCase()).join(' ');
  return age > 0 ? [soft(words.slice(0, age)), words.slice(age).join(' ').toLocaleLowerCase()] : [soft(words), ''];
};

/** La fiche `slot` de la page `page` : écrite à la main, ou assemblée selon l'ivresse de la page. */
export const ficheAt = (texts: WiskyTexts, page: number, slot: number): Fiche => {
  const random = rng(page * 977 + slot * 131 + 7);
  const drunk = drunkenness(page);
  const sip = sipOf(page, slot);
  const time = sipTime(texts, sip, drunk, random);
  const fixed = fixedAt(page, slot);
  if (fixed >= 0) {
    const [title, maker, kind, body, nose, palate, finish] = texts.fixed[fixed];
    return { ...FIXED[fixed], title, maker, kind, text: body, notes: [nose, palate, finish], label: labelOf(title), sip, time };
  }
  const chapter = chapterOf(page);
  const stage = stageOf(drunk);
  const name = pick(texts.names[chapter], random);
  const [ageTitle, age] = pick(texts.ages, random);
  const kind = pick(texts.kinds[chapter], random);
  const abv = stage >= 2 && random() < 0.4 ? pick(texts.lostAbv, random) : texts.abv.replace('{n}', String(40 + Math.floor(random() * 19)));
  const title = slur(`${name}${ageTitle ? ` ${ageTitle}` : ''}`.toLocaleUpperCase(), stage, random);
  const maker = texts.maker.replace('{name}', name).replace('{place}', texts.places[chapter]);
  const tasting = texts.tastingNotes[stage];
  const history = pick(texts.history, random).replace('{year}', String(1790 + Math.floor(random() * 200)));
  const parts =
    stage === 0
      ? [history, pick(tasting, random)]
      : stage === 1
        ? [history, pick(tasting, random), ...(random() < 0.6 ? [pick(texts.asides, random)] : [])]
        : stage === 2
          ? [pick(tasting, random), pick(texts.asides, random), pick(tasting, random)]
          : [pick(tasting, random), ...(random() < 0.5 ? [pick(tasting, random)] : [])];
  const [noses, palates, finishes] = texts.notes[stage];
  const count = stage < 2 ? 2 : 1;
  const end = stage < 2 ? '.' : '';
  return {
    bottle: pick(SHAPES[chapter], random),
    title,
    maker,
    kind: [kind, age, abv].join(' · '),
    text: parts.join(' '),
    notes: [some(noses, count, random) + end, some(palates, count, random) + end, pick(finishes, random)],
    label: [name, age],
    sip,
    time,
  };
};

/** Le titre courant : à gauche le pays, à droite la région ; ivre, la région se perd. */
export const runningHeads = (texts: WiskyTexts, page: number): { left: string; right: string } => {
  const chapter = chapterOf(page);
  const [country, region] = texts.chapters[chapter];
  const random = rng(page * 53 + 11);
  const lost = chapter === ELSEWHERE || (stageOf(drunkenness(page)) >= 2 && random() < 0.5);
  return {
    left: `${texts.running}  ·  ${country}`,
    right: lost ? `${region}  ·  ${pick(texts.lostHeaders, random)}` : region,
  };
};
