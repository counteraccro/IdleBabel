import type { SentenceDef } from './sentences';

/**
 * Anomalies : des phrases qui ne débloquent rien, à collectionner sur toute la partie (le fil rouge,
 * voulu très long par l'auteur). Rangées en familles : chacune a ses pages et sa complétion dans le
 * livre blanc, et un sceau quand elle est complète (livre étrange). Pour en ajouter : un identifiant dans sa
 * famille, et son texte dans i18n (whiteBook.sentences.<id>).
 */
export const ANOMALY_FAMILIES = ['structure', 'speaks', 'said', 'others', 'unwritten', 'numbers', 'ordinary', 'hints'] as const;
export type AnomalyFamily = (typeof ANOMALY_FAMILIES)[number];

const IDS: Record<AnomalyFamily, readonly string[]> = {
  // La structure de la Bibliothèque (chiffres de Borges), qui ne tombe jamais juste.
  structure: [
    'shelves',
    'thirtyOne',
    'stairs',
    'hallMirror',
    'extraLine',
    'lamps',
    'passages',
    'airShaft',
    'symbols',
    'inkStain',
    'warmCloset',
  ],
  // Le livre qui te parle (phrases de l'auteur, 30/09).
  speaks: ['iSeeYou', 'iKnowYou', 'iKnowMe', 'never', 'almost', 'alreadyFound', 'notAlone', 'behindYou', 'knowsName', 'trueName'],
  // Citations célèbres : la Bibliothèque contient aussi tout ce qui a déjà été dit (idée de l'auteur, 30/09).
  said: [
    'yourFather',
    'illBeBack',
    'toBe',
    'borgesParadise',
    'sisyphus',
    'theWord',
    'deadPeople',
    'shallNotPass',
    'silence',
    'ishmael',
    'cogito',
    'socrates',
    'hell',
    'proust',
    'vanity',
    'force',
    'houston',
    'precious',
    'onceUpon',
    'galileo',
    'dice',
    'veni',
    'lavoisier',
    'smallStep',
    'fortyTwo',
  ],
  // Des traces d'autres chercheurs… ou de lui-même, avant.
  others: [
    'dogEar',
    'carvedName',
    'smallPrint',
    'underlined',
    'footprints',
    'upsideDown',
    'notThisOne',
    'belowPages',
    'oneShoe',
    'worn',
    'wallMarks',
    'myHand',
  ],
  // Des livres impossibles.
  unwritten: [
    'blankButLast',
    'aheadDay',
    'closeIt',
    'rightToLeft',
    'noError',
    'catalogue',
    'heavyShut',
    'doorBook',
    'loopBook',
    'myName',
    'tornPage',
    'unknownSymbols',
  ],
  // Le vertige des nombres.
  numbers: [
    'power',
    'universe',
    'billions',
    'oneLetter',
    'fourTen',
    'cupAgain',
    'finite',
    'otherMe',
    'zeros',
    'steps',
    'mistakes',
    'counting',
  ],
  // Des phrases trop ordinaires pour être là.
  ordinary: ['bread', 'rain', 'fountain', 'cat', 'thanks', 'window', 'birthday', 'late', 'sugar', 'keys', 'oven', 'goodNight'],
  // Des indices : chacun met sur la piste d'un sceau secret (idée de l'auteur, 01/10).
  hints: ['hintDeathBook', 'hintDirectory', 'hintNotebookBack', 'hintInsomnia', 'hintStill', 'hintBabelDigits'],
};

export const ANOMALIES: readonly SentenceDef[] = ANOMALY_FAMILIES.flatMap((family) =>
  IDS[family].map((id): SentenceDef => ({ id, kind: 'anomaly', family })),
);
