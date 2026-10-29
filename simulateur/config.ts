import { ETHERIUM_PAGES, type PageId } from '../src/data/etheriumStars';

/**
 * Le joueur imité par le bot. Les chiffres du jeu (méthodes des deux Âges, intuitions, trouvailles, Etherium) viennent
 * du code du jeu (src/data).
 */

// L'Etherium (les constellations) est dans etoiles.ts.

/** Le joueur imité par le bot. */
export const PLAYER = {
  /** Clics par seconde, pendant les premières minutes de chaque partie. */
  clicksPerSecond: 3,
  clickMinutes: 10,
  /**
   * Rythme : heures de jeu, puis heures d'absence (jeu fermé), en boucle. [24, 0] : le jeu ne se ferme jamais.
   * [2, 22] : deux heures par jour.
   */
  rhythm: [24, 0] as readonly [number, number],
  /**
   * Sceaux (+1 % de trouvailles chacun) : 'jeu', ceux du jeu, obtenus au fil des parties (sceaux.ts) ; un nombre, fixe
   * pour toute la simulation (--sceaux=30).
   */
  seals: 'jeu' as 'jeu' | number,
  /** Avec 'jeu' : sceaux des livres rares et des secrets, que le simulateur ne suit pas (le hasard, l'heure, les gestes). */
  otherSeals: 10,
  /** L'Éther reçu fait lire plus vite (+1 % chacun, 07/10) ; --sans-ether-lecture pour s'en passer. */
  etherReading: true,
  /**
   * Le poids de la Bibliothèque (idée de l'auteur, 13/10 ; dans le jeu : data/etherium.ts, ETHER_WEIGHT) : au-delà de
   * 5 000 Éther reçus, chacun compte de moins en moins dans la lecture de l'Éther ; l'Atlas l'allège. --sans-poids.
   */
  weight: true,
  /**
   * Quand la phrase de la première méthode Automatique se trouve : 'échelle', comme toutes les méthodes (l'Échelle à
   * 25 exemplaires, METHOD_GATE) ; 'âge', dès l'Âge acheté (le prix seul fait le verrou).
   */
  automaticGate: 'âge' as 'échelle' | 'âge',
  /**
   * Quand le bot fait son prestige (toujours au bout de `maxRunHours` heures de jeu, absences non comprises, s'il rapporte) : 'double', quand il rapporte
   * au moins autant d'Éther qu'il en a déjà reçu ; 'taux', dès que l'Éther gagné par heure de partie baisse sous
   * `prestigeWhenRateBelow` fois le meilleur vu dans la partie.
   */
  prestige: 'double' as 'double' | 'taux',
  prestigeWhenRateBelow: 0.8,
  maxRunHours: 48,
  /** Les pages de l'Etherium où le bot allume des étoiles (--pages=reading,hands pour n'en essayer que quelques-unes). */
  pages: [...ETHERIUM_PAGES] as PageId[],
  /** La Page Cornée (1re étoile de la Ruche) ; --sans-cornee pour s'en passer (et donc de toute la Ruche). */
  cornee: true,
  /**
   * Part des lettres qui s'échappent que le bot attrape (simulateur/lettre.ts) : il ne regarde pas toujours l'écran.
   * --lettres=0 pour s'en passer.
   */
  letters: 0.5,
  /**
   * La Mimic : minutes que le bot la laisse manger avant de l'attraper (elle ne vient qu'à l'écran du jeu). Il l'attrape
   * toujours avant de fermer le jeu : elle ne mange pas l'absence.
   */
  mimicMinutes: 30,
  /** Le prix de l'étoile de l'Âge Numérique remplacé, pour essayer (--numerique=500) ; 0 : celui du jeu. */
  digitalAge: 0,
  /** Le prix de l'étoile de l'Âge Quantique remplacé, pour essayer (--quantique=150000) ; 0 : celui du jeu. */
  quantumAge: 0,
  /** Le Qubit, méthode secrète de l'Âge Quantique (son étoile : la puce du Lustre) : --sans-qubit pour s'en passer. */
  qubit: true,
  /** Le Bit, méthode secrète de l'Âge Numérique : --sans-bit pour s'en passer. */
  bit: true,
  /** Les tâches (17/10, simulateur/taches.ts, pas encore dans le jeu) : --sans-taches pour s'en passer. */
  tasks: true,
  /** Les tâches donnent des jetons de la Loterie (avant le 22/10) : --taches-sans-jetons pour s'en passer (tranché le 22/10). */
  taskTokens: true,
  /**
   * Le Jeton (18/10) : trouvé au 50e jeton joué (une chance sur 50 par tirage) ; --avec-jeton : le bot le pose à la place
   * de sa relique et joue ses jetons du jour. Par défaut il garde la Loupe ou l'Astrolabe (19/10 : poser le Jeton divise
   * l'Éther par 15 ; l'auteur laisse ce choix au joueur).
   */
  tokenRelic: false,
  /**
   * La Réminiscence (essai du 19/10) : 'payante', le bot rachète tout après chaque prestige, comme avant ; 'gratuite', une
   * fois comprise (10 000 de Connaissance, après le 1er prestige), les intuitions reviennent d'un coup à leur meilleur
   * niveau, sans rien coûter (celle d'une méthode : une fois la méthode retrouvée). --reminiscence=gratuite.
   */
  reminiscence: 'payante' as 'payante' | 'gratuite',
  /**
   * Le joueur regarde la ruche toutes les `handBuyEvery` secondes de jeu pour acheter ses méthodes (19/10, pour le Rouage) ;
   * 0 : il achète dès qu'il peut, comme avant. --achat-main=300.
   */
  handBuyEvery: 0,
  /** Le Rouage (simulateur/rouage.ts, page « gear » de l'Etherium) : --sans-rouage pour s'en passer. */
  rouage: true,
  /** Le lot que le Rouage achète (celui choisi sous la ruche) : --lot=1, 10, 100 ou max. */
  rouageLot: 'max' as number | 'max',
  /**
   * Le livre de jeux (20/10, simulateur/jeux.ts, pas encore dans le jeu) : le jour où le bot l'a (--livre-jeux=2 ; non :
   * sans lui), les grilles qu'il résout par jour (--grilles=3, de 0 à 9), la part juste dès la 1re vérification (--premier-coup=0.5).
   */
  puzzleBook: 1,
  puzzlesPerDay: 3,
  puzzleFirstTry: 0.5,
  /**
   * Lecture des méthodes de chaque Âge, multipliée (essais du 13/10 : adoucir le gain d'un Âge à l'autre) :
   * --lecture=auto:0.1,num:0.01 ; 1 partout, les chiffres du jeu.
   */
  /** Prix et lecture d'une méthode du jeu remplacés, pour essayer (--methode=voice:12000:18,lectern:800000:650). */
  methods: {} as Record<string, { baseCost: number; pagesPerSecond: number }>,
  /** Prix d'étoiles de l'Etherium remplacés, pour essayer (--etoile=weight.w5:4e6,weight.w6:1e7). */
  stars: {} as Record<string, number>,
  reading: { manual: 1, auto: 1, num: 1, quant: 1 } as Record<'manual' | 'auto' | 'num' | 'quant', number>,
};

const methodOption = process.argv.find((arg) => arg.startsWith('--methode='))?.split('=')[1];
for (const part of methodOption?.split(',') ?? []) {
  const [id, baseCost, pagesPerSecond] = part.split(':');
  PLAYER.methods[id] = { baseCost: Number(baseCost), pagesPerSecond: Number(pagesPerSecond) };
}
const starOption = process.argv.find((arg) => arg.startsWith('--etoile='))?.split('=')[1];
for (const part of starOption?.split(',') ?? []) {
  const [id, cost] = part.split(':');
  PLAYER.stars[id] = Number(cost);
}
const readingOption = process.argv.find((arg) => arg.startsWith('--lecture='))?.split('=')[1];
for (const part of readingOption?.split(',') ?? []) {
  const [age, factor] = part.split(':');
  PLAYER.reading[age as keyof typeof PLAYER.reading] = Number(factor);
}
