import type { BookMesh } from './bookMesh';
import type { PageCache } from './pageCache';

/**
 * Élan d'une page qui tourne, en doubles pages par seconde² : une page seule accélère puis ralentit
 * en ~1,1 s (2 √(1 / ACCEL)).
 */
const ACCEL = 3.3;
/** Vitesse de pointe quand plusieurs pages sont demandées d'affilée (feuilletage). */
const MAX_SPEED = 6;
/** Au-delà de cet écart, on saute directement près de la page visée (sommaire) : seule la dernière tourne. */
const JUMP = 6;
/** Page tenue : vitesse à laquelle elle rattrape la souris (lisse les à-coups du pointeur). */
const FOLLOW = 18;

export interface Turner {
  /** Double page visée (celle où le livre s'arrêtera). */
  readonly target: number;
  /** Rien ne tourne : le livre est posé sur une double page. */
  readonly idle: boolean;
  /**
   * Page tenue à la souris : l'avancement suit `position` (en doubles pages, à virgule) ; null : lâchée,
   * elle part vers la cible (`go`) avec l'élan qu'on lui a donné.
   */
  hold: (position: number | null, corner?: number) => void;
  /**
   * Tourne jusqu'à la double page `spread` ; un nouvel appel en cours de route prolonge le mouvement.
   * `corner` : page tirée par un coin (1 : en haut, -1 : en bas), elle part de lui.
   */
  go: (spread: number, corner?: number) => void;
  /** Ouvre directement à la double page `spread`, sans rien tourner. */
  jump: (spread: number) => void;
  /** Avance l'animation de `dt` secondes ; true tant que des pages tournent. */
  update: (dt: number) => boolean;
  /** Le contenu a changé : redessine les pages visibles. */
  refresh: () => void;
}

/**
 * Fait tourner les pages d'un livre 3D. L'avancement affiché (en doubles pages, à virgule) rejoint en
 * douceur la double page visée : il accélère, file, puis freine pour s'y poser, sans à-coup même si la
 * cible change en route (clics rapides, retour en arrière). Entre deux doubles pages n et n + 1, la
 * feuille (recto : page 2n + 1, verso : page 2n + 2) est à mi-course.
 */
export const createTurner = (book: BookMesh, pages: PageCache, spreads: number): Turner => {
  const last = Math.max(0, spreads - 1);
  const clamp = (spread: number): number => Math.min(last, Math.max(0, Math.round(spread)));
  let target = 0;
  let shown = 0;
  let speed = 0;
  let held: number | null = null;
  /** Coin par lequel la page en route a été prise (0 : tout le bord). */
  let corner = 0;
  /** Sens de la page en route (vers la fin du livre, ou vers le début). */
  let forward = true;
  /** Pages posées actuellement sur le livre (gauche, droite, recto et verso de la feuille), pour ne rien refaire. */
  let laid = '';

  const apply = (force = false): void => {
    const spread = Math.min(Math.floor(shown), Math.max(0, last - 1));
    const turn = shown - spread;
    const moving = turn > 1e-4 && turn < 1 - 1e-4;
    const base = moving ? spread : Math.round(shown);
    // Posée : la double page elle-même. En route : dessous, la page de gauche qu'on quitte et celle de
    // droite qu'on découvre ; la feuille porte les deux autres.
    const [left, right] = moving ? [2 * base, 2 * base + 3] : [2 * base, 2 * base + 1];
    const key = moving ? `${left}/${right}/${2 * base + 1}/${2 * base + 2}` : `${left}/${right}`;
    if (force || key !== laid) {
      laid = key;
      pages.keep(2 * base + 1);
      book.setPages(pages.get(left), pages.get(right));
      if (!moving) book.setLeaf(null);
    }
    const read = last > 0 ? shown / last : 0;
    // À la première double page, à gauche, rien que l'intérieur de la couverture tant que la feuille n'y
    // est pas posée.
    // De même à la dernière, à droite, l'intérieur du plat arrière : la dernière feuille qui tourne
    // n'a plus rien sous elle.
    book.setProgress(read, moving && base === 0 ? 0 : read, moving && base === last - 1 ? 1 : read);
    if (moving) book.setLeaf(turn, pages.get(2 * base + 1), pages.get(2 * base + 2), corner, forward);
  };

  const turner: Turner = {
    get target() {
      return target;
    },
    get idle() {
      return held === null && shown === target;
    },
    hold: (position, from = corner) => {
      if (held === null && position !== null) forward = position > shown;
      held = position === null ? null : Math.min(last, Math.max(0, position));
      corner = from;
    },
    go: (spread, from = 0) => {
      target = clamp(spread);
      corner = from;
      // Page lâchée (qui finit de tourner ou retombe) : elle garde le sens de la prise, sans à-coup.
      if (held === null && target !== shown) forward = target > shown;
      if (Math.abs(target - shown) > JUMP) {
        shown = target - Math.sign(target - shown);
        speed = 0;
        apply();
      }
    },
    jump: (spread) => {
      target = shown = clamp(spread);
      speed = 0;
      apply();
    },
    update: (dt) => {
      if (held !== null) {
        const before = shown;
        shown += (held - shown) * (1 - Math.exp(-FOLLOW * dt));
        speed = dt > 0 ? (shown - before) / dt : 0;
        apply();
        return true;
      }
      const remaining = target - shown;
      if (remaining === 0 && speed === 0) {
        // Au repos : on prépare les pages voisines, une par image.
        pages.warm(2 * Math.round(shown) + 1);
        return false;
      }
      // Vitesse voulue : de quoi freiner à temps pour s'arrêter pile sur la cible.
      const wanted = Math.sign(remaining) * Math.min(MAX_SPEED, Math.sqrt(2 * ACCEL * Math.abs(remaining)));
      const change = ACCEL * dt;
      speed += Math.min(change, Math.max(-change, wanted - speed));
      const next = shown + speed * dt;
      // Arrivé (ou dépassé) : on se pose sur la cible.
      if (Math.sign(target - next) !== Math.sign(remaining) || Math.abs(target - next) < 1e-3) {
        shown = target;
        speed = 0;
      } else {
        shown = next;
      }
      apply();
      return shown !== target;
    },
    refresh: () => {
      pages.clear();
      apply(true);
    },
  };
  apply(true);
  return turner;
};
