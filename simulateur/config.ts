import type { PageId } from '../src/data/etheriumStars';

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
  pages: [
    'reading',
    'hands',
    'knowledge',
    'finds',
    'away',
    'start',
    'memory',
    'quill',
    'ages',
    'weight',
    'explore',
    'mimic',
    'relics',
    'screen',
  ] as PageId[],
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
  /** Le Bit, méthode secrète de l'Âge Numérique : --sans-bit pour s'en passer. */
  bit: true,
  /**
   * Lecture des méthodes de chaque Âge, multipliée (essais du 13/10 : adoucir le gain d'un Âge à l'autre) :
   * --lecture=auto:0.1,num:0.01 ; 1 partout, les chiffres du jeu.
   */
  /** Prix et lecture d'une méthode du jeu remplacés, pour essayer (--methode=voice:12000:18,lectern:800000:650). */
  methods: {} as Record<string, { baseCost: number; pagesPerSecond: number }>,
  reading: { manual: 1, auto: 1, num: 1 } as Record<'manual' | 'auto' | 'num', number>,
};

const methodOption = process.argv.find((arg) => arg.startsWith('--methode='))?.split('=')[1];
for (const part of methodOption?.split(',') ?? []) {
  const [id, baseCost, pagesPerSecond] = part.split(':');
  PLAYER.methods[id] = { baseCost: Number(baseCost), pagesPerSecond: Number(pagesPerSecond) };
}
// Lu ici et pas dans main.ts : les méthodes (methodes.ts) sont calculées dès leur import.
const readingOption = process.argv.find((arg) => arg.startsWith('--lecture='))?.split('=')[1];
for (const part of readingOption?.split(',') ?? []) {
  const [age, factor] = part.split(':');
  PLAYER.reading[age as keyof typeof PLAYER.reading] = Number(factor);
}
