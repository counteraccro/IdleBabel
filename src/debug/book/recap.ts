import { t } from '../../i18n';
import { BASE_FIND_CHANCE, EXTRA_FIND_SHARES, FIND_WEIGHTS, GUESS_PRICE, LUCK_PAGES, METHOD_GATE } from '../../data/knowledge';
import { ANOMALY_FAMILIES, HINT_BOOKS } from '../../data/anomalies';
import { SENTENCES } from '../../data/sentences';
import { RARE_BOOKS } from '../../data/rareBooks';
import { PLATES, SEALS } from '../../data/seals';
import { TECHNOLOGIES } from '../../data/technologies';
import { COST_GROWTH, TOOLS } from '../../data/tools';
import { findChance, maxTurnsPerSecond } from '../../systems/knowledge';
import {
  awaySecondsBonus,
  awayShareBonus,
  etherReading,
  findsMultiplier,
  handsMultiplier,
  knowledgePerFind,
  rareMultiplier,
  readingMultiplier,
  starLit,
  turnsBonus,
} from '../../systems/etherium';
import { etherDeserved, nextEtherPages, nextEtherProgress, prestigeGain } from '../../systems/prestige';
import { ETHERIUM_PAGES, OPEN_STARS as STARS } from '../../data/etheriumStars';
import { findableTarget, hintFindable, waitingFor } from '../../systems/findable';
import { completion, isComplete, toolUnlocked } from '../../systems/sentences';
import { pagesPerSecond, toolRate } from '../../systems/production';
import { nextToolCost } from '../../systems/tools';
import { RARITY_GROWTH, nextRareChance } from '../../systems/rareBooks';
import { countObtained, plateSeals, sealFindMultiplier } from '../../systems/seals';
import { LEAVES_PER_BOOK, PAGES_PER_LEAF } from '../../systems/books';
import { PAGES_PER_CLICK } from '../../systems/click';
import {
  awayShare,
  clickShare,
  duplicateShare,
  filterMultiplier,
  levelOf,
  maxLevel,
  maxAwaySeconds,
  nextPrice,
  rareChance,
  targetShare,
  toolPriceFactor,
} from '../../systems/technologies';
import { duration, format } from '../subjects/subject';
import type { GameState } from '../../core/state';

/** Une ligne du récapitulatif : un libellé, sa valeur (relue à chaque dessin). */
export type RecapRow = [label: string, value: string];

/** Une partie du récapitulatif : son titre et ses lignes. */
export interface RecapSection {
  title: string;
  rows: RecapRow[];
}

const pct = (value: number): string => `${value.toLocaleString('fr-FR', { maximumSignificantDigits: 3 })} %`;
const percent = (share: number): string => pct(share * 100);
const times = (value: number): string => `×${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}`;
const ratio = (done: number, total: number): string => `${done} / ${total}`;

/** Pages lues par seconde dans le livre en main : la production, plafonnée par la Lecture rapide. */
const pagesRead = (state: GameState): number =>
  state.settings.autoTurn ? Math.min(pagesPerSecond(state), maxTurnsPerSecond(state) * PAGES_PER_LEAF) : 0;

const done = (ids: readonly string[], state: GameState): number => ids.filter((id) => isComplete(state, id)).length;

const finds = (state: GameState): RecapRow[] => {
  const chance = findChance(state);
  const target = findableTarget(state);
  const waiting = SENTENCES.map((sentence) => waitingFor(state, sentence.id)).find(Boolean);
  const hints = SENTENCES.filter((sentence) => sentence.family === 'hints');
  const extra = 1 - EXTRA_FIND_SHARES.method - EXTRA_FIND_SHARES.hint - EXTRA_FIND_SHARES.memory;
  return [
    ['Chance par page', pct(chance * 100)],
    ['· le hasard', percent(BASE_FIND_CHANCE)],
    ['· filtre sémantique', times(filterMultiplier(state))],
    ['· sceaux', times(sealFindMultiplier(state))],
    ['· Etherium (la Loupe)', times(findsMultiplier(state))],
    ['Par page', chance >= 1 ? `${Math.floor(chance)} sûres + ${percent(chance % 1)}` : `au plus 1`],
    ['Sortes : mot · morceau · phrase', `${FIND_WEIGHTS.word} · ${FIND_WEIGHTS.piece} · ${FIND_WEIGHTS.sentence} %`],
    ['Doublons (Mémoire des phrases)', percent(duplicateShare(state))],
    ['Vers la méthode (Fil d’Ariane)', percent(targetShare(state))],
    [
      'Méthode qui se trouve',
      target ?? (waiting ? `attend ${t(`tools.${waiting}.name`)} ${ratio(state.tools[waiting], METHOD_GATE)}` : 'aucune'),
    ],
    ['Au-delà de 100 %, en plus : méthode', percent(EXTRA_FIND_SHARES.method)],
    ['· indice', percent(EXTRA_FIND_SHARES.hint)],
    ['· souvenir', percent(EXTRA_FIND_SHARES.memory)],
    ['· rien de neuf (Connaissance seule)', percent(extra)],
    ['Indices qui peuvent tomber', ratio(hints.filter((s) => hintFindable(state, s.id) && !isComplete(state, s.id)).length, hints.length)],
    ['Trouvailles par heure (rythme actuel)', format(pagesRead(state) * chance * 3600)],
    ['Deviner le dernier morceau', `${GUESS_PRICE} de Connaissance`],
    ['Première trouvaille garantie', `pages ${LUCK_PAGES.from} à ${LUCK_PAGES.to}`],
  ];
};

const reading = (state: GameState): RecapRow[] => {
  const read = pagesRead(state);
  return [
    ['Production', `${format(pagesPerSecond(state))} pages/s`],
    ['Feuilles tournées au plus (Lecture rapide)', `${maxTurnsPerSecond(state)} /s`],
    ['Pages lues dans le livre en main', `${format(read)} /s`],
    ['Un livre (205 feuilles)', duration(read > 0 ? (LEAVES_PER_BOOK * PAGES_PER_LEAF) / read : Infinity)],
    ['Un clic', `${PAGES_PER_CLICK} pages + ${percent(clickShare(state))} de la production`],
    ['Absence : part comptée', percent(awayShare(state))],
    ['Absence : au plus', `${maxAwaySeconds(state) / 3600} h`],
    ['Prix des méthodes (Économie du geste)', times(toolPriceFactor(state))],
    ['Prix : hausse à chaque achat', times(COST_GROWTH)],
    ['Découverte : méthode d’avant possédée', `${METHOD_GATE} fois`],
  ];
};

const methods = (state: GameState): RecapRow[] =>
  TOOLS.map((tool): RecapRow => {
    const status = toolUnlocked(state, tool.id) ? '' : waitingFor(state, tool.id) ? ' · attend' : ' · à découvrir';
    return [
      t(`tools.${tool.id}.name`),
      `${state.tools[tool.id]} · ${format(toolRate(state, tool.id))}/s · ${format(Math.ceil(nextToolCost(state, tool.id)))} p${status}`,
    ];
  });

const rareBooks = (state: GameState): RecapRow[] => {
  const found = Object.keys(state.rareBooks).length;
  const next = nextRareChance(found, rareChance(state));
  const read = pagesRead(state);
  const left = found < RARE_BOOKS.length;
  return [
    ['Trouvés', ratio(found, RARE_BOOKS.length)],
    ['Flair : un livre sur', format(1 / rareChance(state))],
    ['Plus rare à chaque livre trouvé', times(RARITY_GROWTH)],
    ['Le prochain', left ? `${pct(next * 100)} · 1 sur ${format(Math.round(1 / next))}` : 'plus aucun'],
    ['Temps moyen avant le prochain', left ? duration(read > 0 ? (LEAVES_PER_BOOK * PAGES_PER_LEAF) / read / next : Infinity) : '—'],
    [
      'Indices de livres rares qui peuvent tomber',
      ratio(Object.keys(HINT_BOOKS).filter((id) => hintFindable(state, id)).length, Object.keys(HINT_BOOKS).length),
    ],
    ['Livre de débogage', `poids ${RARE_BOOKS.find((book) => book.id === 'debug')?.weight ?? 1}`],
  ];
};

const seals = (state: GameState): RecapRow[] => [
  ['Obtenus', ratio(countObtained(state, SEALS), SEALS.length)],
  ['Bonus de trouvailles', `+${Math.round((sealFindMultiplier(state) - 1) * 100)} %`],
  ...PLATES.map((plate): RecapRow => [
    `· ${t(`strangeBook.plates.${plate}`)}`,
    ratio(countObtained(state, plateSeals(plate)), plateSeals(plate).length),
  ]),
];

const intuitions = (state: GameState): RecapRow[] =>
  TECHNOLOGIES.map((tech): RecapRow => {
    const name = 'tool' in tech ? `Geste : ${t(`tools.${tech.tool}.name`)}` : t(`whiteBook.intuitions.${tech.id}.name`);
    const max = maxLevel(tech.id);
    const price = nextPrice(state, tech.id);
    return [name, `${levelOf(state, tech.id)} / ${max === Infinity ? '∞' : max}${price === undefined ? '' : ` · ${format(price)}`}`];
  });

const sentences = (state: GameState): RecapRow[] => {
  const of = (kind: string): string[] => SENTENCES.filter((sentence) => sentence.kind === kind).map((sentence) => sentence.id);
  return [
    ['Livre blanc écrit', percent(completion(state))],
    ['Méthodes', ratio(done(of('method'), state), of('method').length)],
    ['Souvenirs', ratio(done(of('memory'), state), of('memory').length)],
    ...ANOMALY_FAMILIES.map((family): RecapRow => {
      const ids = SENTENCES.filter((sentence) => sentence.family === family).map((sentence) => sentence.id);
      return [`· ${t(`whiteBook.anomalyFamilies.${family}`)}`, ratio(done(ids, state), ids.length)];
    }),
    ['Connaissance', format(state.knowledge)],
    ['Connaissance à vie', format(state.lifetimeKnowledge)],
  ];
};

/** Le prestige et ce que donnent les étoiles allumées de l'Etherium. */
const prestige = (state: GameState): RecapRow[] => {
  const lit = (page?: string): number => STARS.filter((star) => (!page || star.page === page) && starLit(state, star.id)).length;
  return [
    ['Pages à vie', format(state.totalPagesRead)],
    ['Éther mérité · reçu · à dépenser', `${format(etherDeserved(state))} · ${format(state.etherReceived)} · ${format(state.ether)}`],
    ['Prestige maintenant', `+${format(prestigeGain(state))} Éther`],
    ['Éther suivant', `à ${format(nextEtherPages(state))} pages (${percent(nextEtherProgress(state))})`],
    ['Prestiges faits', String(state.exiles)],
    ['Etherium en main', state.etheriumInHand ? 'oui' : 'non'],
    ['Étoiles allumées', ratio(lit(), STARS.length)],
    ...ETHERIUM_PAGES.map((page): RecapRow => [
      `· ${t(`etherium.pages.${page}.name`)}`,
      ratio(lit(page), STARS.filter((star) => star.page === page).length),
    ]),
    ['Lecture des méthodes', times(readingMultiplier(state))],
    ['Lecture de l’Éther reçu', times(etherReading(state))],
    ['Feuilles tournées en plus', `+${format(turnsBonus(state))} /s`],
    ['Pages d’un clic', times(handsMultiplier(state))],
    ['Connaissance par trouvaille', times(knowledgePerFind(state))],
    ['Chance de trouvaille', times(findsMultiplier(state))],
    ['Chance d’un livre rare', times(rareMultiplier(state))],
    ['Absence : part en plus', `+${percent(awayShareBonus(state))}`],
    ['Absence : heures en plus', `+${format(awaySecondsBonus(state) / 3600)} h`],
  ];
};

/** Tout le récapitulatif, dans l'ordre des pages. */
export const recapSections = (state: GameState): RecapSection[] => [
  { title: 'Trouvailles', rows: finds(state) },
  { title: 'Lecture', rows: reading(state) },
  { title: 'Méthodes : possédées · pages/s · prochaine', rows: methods(state) },
  { title: 'Livres rares', rows: rareBooks(state) },
  { title: 'Sceaux', rows: seals(state) },
  { title: 'Intuitions : niveau · prochain prix', rows: intuitions(state) },
  { title: 'Phrases et Connaissance', rows: sentences(state) },
  { title: 'Prestige et Etherium', rows: prestige(state) },
];
