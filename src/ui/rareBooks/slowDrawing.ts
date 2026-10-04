/**
 * Un dessin long (une reliure au grain fin), coupé en morceaux : chaque `yield` est une pause possible, le
 * dessin fini rend son canvas.
 */
export type Drawing = Generator<void, HTMLCanvasElement, void>;

/** Au plus, d'un trait : un clic arrivé pendant ce temps attend (le navigateur au repos annonce jusqu'à 50 ms libres). */
const BUDGET = 8;

/** Attend un moment libre du navigateur (sans : un peu plus tard) ; `work` reçoit le temps qu'il laisse, en ms. */
const whenIdle = (work: (left: () => number) => void): void => {
  const run = (free: () => number): void => {
    const until = performance.now() + BUDGET;
    work(() => Math.min(free(), until - performance.now()));
  };
  // Jamais libre (une animation lourde) : au bout de 200 ms, on avance quand même d'un morceau.
  if ('requestIdleCallback' in window) requestIdleCallback((deadline) => run(() => deadline.timeRemaining()), { timeout: 200 });
  else setTimeout(() => run(() => BUDGET), 50);
};

/** Attend un moment libre du navigateur (après une image : on peut y dessiner sans la retarder). */
export const idle = (): Promise<void> => new Promise((resolve) => whenIdle(() => resolve()));

/**
 * Des pièces dessinées par morceaux (`make`), gardées une fois finies pour la clé `key()` (la langue : un
 * titre en dépend), seulement pour la clé du moment : en changer oublie les autres (~7 Mo par livre). `now`
 * rend une pièce tout de suite (finie d'un coup, là où l'avance l'a laissée) ;
 * `ahead` les dessine toutes à l'avance, morceau par morceau, dans les moments libres du navigateur : aucun
 * ne fige l'image, même pendant qu'une page tourne.
 */
export const slowPieces = <Name extends string>(make: Record<Name, () => Drawing>, key: () => string) => {
  const done = new Map<string, HTMLCanvasElement>();
  const started = new Map<string, Drawing>();
  /** La clé des pièces gardées. */
  let current = '';
  /** Avance la pièce `name` d'un morceau ; true : elle est finie. */
  const step = (name: Name): boolean => {
    if (key() !== current) {
      // Une autre langue : les pièces de l'ancienne ne reserviront qu'à son retour (elles seront redessinées).
      current = key();
      done.clear();
      started.clear();
    }
    const id = `${name}:${current}`;
    if (done.has(id)) return true;
    let drawing = started.get(id);
    if (!drawing) started.set(id, (drawing = make[name]()));
    const result = drawing.next();
    if (!result.done) return false;
    done.set(id, result.value);
    started.delete(id);
    return true;
  };
  const now = (name: Name): HTMLCanvasElement => {
    while (!step(name));
    return done.get(`${name}:${key()}`)!;
  };
  const ahead = (): Promise<void> =>
    new Promise((resolve) => {
      const names = (Object.keys(make) as Name[]).filter((name) => !done.has(`${name}:${key()}`));
      if (!names.length) return resolve();
      const work = (left: () => number): void => {
        // Un morceau prend quelques millisecondes au plus : on s'arrête un peu avant la fin du moment libre
        // (mais on en fait toujours un).
        do if (step(names[0])) names.shift();
        while (names.length && left() > 2);
        if (names.length) whenIdle(work);
        else resolve();
      };
      whenIdle(work);
    });
  return { now, ahead };
};
