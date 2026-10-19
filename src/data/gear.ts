import { AUTOMATIC_AGE, DIGITAL_AGE } from './tools';

/**
 * Le Rouage (19/10, .ai/idee-rouage.md, maquette .ai/maquette-rouage.html, piste A) : une page de l'Etherium, ouverte par
 * l'Âge Numérique, qui achète seule les méthodes. Ses étoiles sont dans data/etheriumStars.ts (page « gear »).
 */

/** L'axe : le Rouage se met en marche (pour l'Âge Manuel). */
export const GEAR_STAR = 'gear.c';

/** Les Âges dont le Rouage achète les méthodes, par étoile ('' : l'Âge Manuel, celui de l'axe). */
export const GEAR_AGES: Readonly<Record<string, string>> = {
  'gear.c': '',
  'gear.a2': AUTOMATIC_AGE,
  'gear.a3': DIGITAL_AGE,
};

/** Secondes entre deux achats, par étoile ; la plus courte allumée compte (0 : dès qu'il peut). */
export const GEAR_EVERY: Readonly<Record<string, number>> = {
  'gear.c': 10,
  'gear.t1': 5,
  'gear.t2': 2,
  'gear.t3': 1,
  'gear.t4': 0,
};

/** « Dès qu'il peut » : au plus tant d'achats d'un coup (un lot de 1, des pages sans fin au débogage). */
export const GEAR_MAX_BUYS = 1000;
