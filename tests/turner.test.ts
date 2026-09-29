import { describe, expect, it } from 'vitest';
import { createTurner } from '../src/ui/book3d/turner';
import type { BookMesh } from '../src/ui/book3d/bookMesh';
import type { PageCache } from '../src/ui/book3d/pageCache';

/** Un livre sans rien à dessiner : seul compte l'avancement des pages. */
const book = { setPages: () => {}, setLeaf: () => {}, setProgress: () => {} } as unknown as BookMesh;
const pages: PageCache = { get: () => null, keep: () => {}, warm: () => false, clear: () => {} };

/** Fait tourner les images (60 par seconde) jusqu'au repos, au plus `seconds` secondes. */
const settle = (turner: ReturnType<typeof createTurner>, seconds = 10): void => {
  for (let i = 0; i < seconds * 60 && !turner.idle; i++) turner.update(1 / 60);
};

describe('pages qui tournent (livre 3D)', () => {
  it('se pose sur la double page visée et signale la feuille une seule fois', () => {
    const landed: number[] = [];
    const turner = createTurner(book, pages, 10, (spread) => landed.push(spread));
    turner.go(1);
    expect(turner.idle).toBe(false);
    settle(turner);
    expect(turner.idle).toBe(true);
    expect(turner.target).toBe(1);
    expect(landed).toEqual([1]);
  });

  it('signale chaque feuille, dans l’ordre, quand plusieurs pages tournent d’affilée', () => {
    const landed: number[] = [];
    const turner = createTurner(book, pages, 10, (spread) => landed.push(spread));
    turner.go(1);
    turner.update(1 / 60);
    turner.go(2);
    turner.go(4);
    settle(turner);
    expect(landed).toEqual([1, 2, 3, 4]);
  });

  it("ne signale rien en revenant en arrière, et reste dans le livre", () => {
    const landed: number[] = [];
    const turner = createTurner(book, pages, 3, (spread) => landed.push(spread));
    turner.jump(2);
    turner.go(0);
    settle(turner);
    expect(landed).toEqual([]);
    turner.go(99);
    settle(turner);
    expect(turner.target).toBe(2);
  });

  it('tourne aussi sans personne pour compter les feuilles (grands livres)', () => {
    // Régression : sans onLand, le compte des feuilles posées ne doit pas tourner en boucle.
    const turner = createTurner(book, pages, 10);
    turner.go(3);
    settle(turner);
    expect(turner.idle).toBe(true);
  });
});
