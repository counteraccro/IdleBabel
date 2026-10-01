import { hashText, seeded } from '../../core/random';
import { LETTERS } from '../../systems/babelText';

/**
 * Les abonnés de l'Annuaire, dans l'ordre alphabétique d'un bout à l'autre du livre : chaque page tient
 * une tranche de l'alphabet de Babel, et le nom du joueur tombe sur la page de son initiale, à sa place.
 */

/** Trois colonnes de 38 lignes par page. */
export const PER_PAGE = 3 * 38;
/** Page 1 : le titre ; page 3 : le sommaire ; les abonnés de la page 4 à la dernière (410 feuilles). */
export const FIRST_PAGE = 4;
const LAST_PAGE = 820;
const PAGE_COUNT = LAST_PAGE - FIRST_PAGE + 1;
const TOTAL = PAGE_COUNT * PER_PAGE;
/** Lettres tirées de la place dans l'alphabet : assez pour que deux abonnés voisins ne se suivent jamais à l'envers. */
const PREFIX = 4;

export interface Subscriber {
  name: string;
  number: string;
  /** Le joueur lui-même. */
  player?: boolean;
}

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);

/** Le nom à la place `place` (de 0 à 1) dans l'alphabet de Babel, complété au hasard. */
const nameAt = (place: number, random: () => number): string => {
  let rest = place;
  let name = '';
  for (let i = 0; i < PREFIX; i++) {
    rest *= LETTERS.length;
    const index = Math.min(LETTERS.length - 1, Math.floor(rest));
    name += LETTERS[index];
    rest -= index;
  }
  for (let i = Math.floor(random() * 6); i > 0; i--) name += LETTERS[Math.floor(random() * LETTERS.length)];
  return `${capitalize(name)} ${LETTERS[Math.floor(random() * LETTERS.length)].toUpperCase()}.`;
};

const phoneNumber = (random: () => number): string =>
  Array.from({ length: 4 }, () => String(Math.floor(random() * 100)).padStart(2, '0')).join(' ');

/**
 * La place d'un nom dans l'alphabet de Babel (de 0 à 1). Les lettres qu'elle n'a pas (k, w, y, les
 * accents…) se rangent entre leurs voisines.
 */
const placeOf = (name: string): number => {
  const letters = name
    .normalize('NFD')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  let place = 0;
  let scale = 1;
  for (const letter of letters.slice(0, 8)) {
    scale /= LETTERS.length;
    // Une lettre absente se range au début de la suivante.
    place += [...LETTERS].filter((known) => known < letter).length * scale;
  }
  return Math.min(Math.max(place, 0), 1 - 1e-9);
};

/** Où tombe le joueur : sa page et sa place dans la page. */
export const playerSlot = (playerName: string): { page: number; slot: number } => {
  const index = Math.floor(placeOf(playerName) * TOTAL);
  return { page: FIRST_PAGE + Math.floor(index / PER_PAGE), slot: index % PER_PAGE };
};

/** Les abonnés de la page `page` (de FIRST_PAGE à la dernière), triés ; le joueur parmi eux, s'il y tombe. */
export const subscribersOn = (page: number, playerName: string): Subscriber[] => {
  const random = seeded(hashText(`annuaire:${page}`));
  const first = (page - FIRST_PAGE) * PER_PAGE;
  const entries: Subscriber[] = Array.from({ length: PER_PAGE }, (_, slot) => ({
    name: nameAt((first + slot + random() * 0.999) / TOTAL, random),
    number: phoneNumber(random),
  }));
  entries.sort((a, b) => a.name.localeCompare(b.name));
  // Le joueur, à la place que lui donne l'alphabet de Babel (pas le tri : ses lettres peuvent lui manquer).
  // Son poste, comme au dos de l'annuaire : 410.
  const spot = playerSlot(playerName || '…');
  if (spot.page === page) entries[spot.slot] = { name: playerName || '…', number: '00 00 04 10', player: true };
  return entries;
};

/** Première page de chaque lettre, pour le sommaire. */
export const letterPages = (): { letter: string; page: number }[] =>
  [...LETTERS].map((letter, index) => ({
    letter: letter.toUpperCase(),
    page: FIRST_PAGE + Math.floor(((index / LETTERS.length) * TOTAL) / PER_PAGE),
  }));
