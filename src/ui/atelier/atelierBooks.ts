import * as THREE from 'three';
import { createBookMesh } from '../book3d/bookMesh';
import { edgeTexture } from '../book3d/textures';
import { visibleBox } from '../book3d/visibleBox';
import { PARTS, RANK_S, SETS, TOP_PILE, type PieceId } from '../../data/curiosities';
import { bookJob } from '../../systems/curiosityPresses';
import { canvasOf, note, slipCanvas, textureOf, type createPieceTextures } from './atelierPaper';
import { at, rankName } from './atelierText';
import { BH, BT, BW, CART_TOP, CART_X, LECTERN_X, LECTERN_Y, SHELVES, type Furniture } from './atelierFurniture';
import type { Curiosity, GameState } from '../../core/state';

/**
 * Les curiosités dans la scène (maquette validée, mêmes mesures) : le vrai modèle de livre du jeu (book3d/bookMesh.ts, celui
 * de la vitrine), ses plats et son dos faits de ses pièces, ses contre-plats de sa page de garde ; debout le dos vers soi sur
 * le chariot, couché en pile dessus (une pièce S), de face au lutrin ; et le livre choisi, déplié à plat sur le pupitre.
 */

const SHAPE = { width: BW, height: BH, thickness: BT, board: 0.014, overhang: 0.022, corner: 0.03 };
/** Le livre déplié : derrière, dos, devant, puis la page de garde. */
const LAYOUT: Record<PieceId, [number, number]> = {
  back: [-0.7225, BW],
  spine: [-0.3375, BT],
  front: [0.0475, BW],
  endpaper: [0.7375, BW],
};

export const createAtelierBooks = (scene: THREE.Scene, furniture: Furniture, textures: ReturnType<typeof createPieceTextures>) => {
  const edge = edgeTexture('#e6d8b8', 'rgba(120, 95, 60, 0.35)');
  const models = new Map<string, THREE.Group>();
  const slips = new Map<string, THREE.CanvasTexture>();
  const slipTexture = (rank: number): THREE.CanvasTexture => {
    const key = String(rank);
    if (!slips.has(key)) slips.set(key, textureOf(slipCanvas(rankName(rank), rank === RANK_S)));
    return slips.get(key)!;
  };
  const realBook = (book: Curiosity, pose: 'spine' | 'face'): THREE.Group => {
    const key = `${book.id}|${pose}|${PARTS.map((part) => `${book.parts[part].seed}.${book.parts[part].state}.${book.parts[part].hue}`).join('|')}`;
    const known = models.get(key);
    if (known) return known;
    const spine = book.parts.spine;
    const spineHue = spine.set !== undefined ? SETS[spine.set].hue : spine.hue;
    const mesh = createBookMesh(SHAPE, {
      cover: textures.piece('front', book.parts.front),
      back: textures.piece('back', book.parts.back),
      spine: textures.piece('spine', spine),
      inside: textures.piece('endpaper', book.parts.endpaper),
      leather: new THREE.Color(`hsl(${spineHue}, 28%, 22%)`),
      edge,
      paper: '#e8dcc0',
    });
    mesh.setOpen(0);
    // Debout, le dos vers soi (comme la vitrine) ; au lutrin, la couverture vers soi.
    if (pose === 'spine') mesh.root.rotation.y = Math.PI / 2;
    const inner = new THREE.Group();
    inner.add(mesh.root);
    const box = visibleBox(inner);
    mesh.root.position.set(-(box.min.x + box.max.x) / 2, -box.min.y, -(box.min.z + box.max.z) / 2);
    mesh.root.traverse((object) => {
      if (object instanceof THREE.Mesh) object.castShadow = object.receiveShadow = true;
    });
    models.set(key, inner);
    return inner;
  };
  const bookMesh = (book: Curiosity, pose: 'spine' | 'face'): THREE.Group => {
    const g = new THREE.Group();
    g.add(realBook(book, pose));
    // La fiche glissée dans les pages : le rang, au crayon.
    const slip = new THREE.Mesh(
      new THREE.PlaneGeometry(0.075, 0.31),
      new THREE.MeshStandardMaterial({ map: slipTexture(book.rank), roughness: 0.9, side: THREE.DoubleSide }),
    );
    if (pose === 'spine') slip.position.set(0, BH + 0.03, BW / 2 - 0.12);
    else slip.position.set(BW / 2 - 0.12, BH + 0.03, 0);
    g.add(slip);
    g.traverse((object) => (object.userData.pick = { kind: 'book', id: book.id }));
    return g;
  };

  const group = new THREE.Group();
  scene.add(group);
  const locks = new THREE.Group();
  scene.add(locks);
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.35, metalness: 0.85 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.6, metalness: 0.6 });
  const padlock = (): THREE.Group => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.045, 0.02), brass));
    const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.004, 6, 16, Math.PI), iron);
    shackle.position.y = 0.022;
    g.add(shackle);
    return g;
  };
  const [moreCanvas] = canvasOf(160, 90);
  const moreTexture = textureOf(moreCanvas);
  const more = furniture.plane(0.2, 0.11, moreTexture, scene, CART_X + 0.32, 0, 0.3);

  /** Les livres à pièce S : une pile couchée sur le dessus du chariot, dos vers soi, dans leur ordre d'arrivée. */
  const topBooks = (state: GameState, selected: Curiosity | null): Curiosity[] =>
    state.atelier.books.filter((book) => book.where === 'top' && book !== selected);
  const slotPosition = (book: Curiosity, top: Curiosity[]): THREE.Vector3 => {
    if (book.where === 'cart') {
      const tier = book.slot < 5 ? 0 : 1;
      return new THREE.Vector3(CART_X - 0.4 + (book.slot % 5) * 0.2, SHELVES[tier], 0.3 - BW / 2 - 0.005);
    }
    return new THREE.Vector3(CART_X - 0.12 - BH / 2, CART_TOP + BT / 2 + top.indexOf(book) * (BT + 0.004), 0.0);
  };

  /** Les livres arrivés depuis le dernier dessin : ils glissent jusqu'à leur place. */
  const known = new Set<number>();
  const arrivals: { object: THREE.Object3D; from: THREE.Vector3; to: THREE.Vector3; start: number }[] = [];
  let first = true;

  const build = (state: GameState, selected: Curiosity | null, now: number): void => {
    group.clear();
    locks.clear();
    const top = topBooks(state, selected);
    for (const book of state.atelier.books) {
      const fresh = !first && !known.has(book.id);
      known.add(book.id);
      if (book === selected) continue;
      if (book.where === 'lectern') {
        const m = bookMesh(book, 'face');
        const desk = new THREE.Group();
        desk.position.set(LECTERN_X, LECTERN_Y[book.slot], 0);
        desk.rotation.x = -0.3;
        m.position.set(0, 0.02, 0.06);
        desk.add(m);
        group.add(desk);
        continue;
      }
      const m = bookMesh(book, 'spine');
      if (book.where === 'top') {
        // Couché : le livre debout tourné d'un quart, sa fiche de rang dépasse à droite. Au-delà de six, la pile s'arrête.
        if (top.indexOf(book) >= TOP_PILE) continue;
        m.rotation.z = -Math.PI / 2;
        m.rotation.y = (((book.id * 37) % 9) - 4) * 0.008;
      }
      const spot = slotPosition(book, top);
      m.position.copy(spot);
      group.add(m);
      if (fresh) {
        const from = spot.clone().add(new THREE.Vector3(-1.6, 0.25, 0.5));
        arrivals.push({ object: m, from, to: spot, start: now });
        m.position.copy(from);
      }
      if (book.locked && book.where === 'cart') {
        const lock = padlock();
        lock.position.set(spot.x, spot.y - 0.055, 0.335);
        locks.add(lock);
      }
    }
    first = false;
    more.visible = top.length > TOP_PILE;
    if (more.visible) {
      more.position.y = CART_TOP + TOP_PILE * (BT + 0.004) + 0.07;
      const x = moreCanvas.getContext('2d')!;
      x.clearRect(0, 0, 160, 90);
      x.drawImage(note(160, 90, [[at('scene.more', { n: top.length - TOP_PILE }), { size: 30 }]]), 0, 0);
      moreTexture.needsUpdate = true;
    }
    furniture.lecternLamps.forEach((lamp, i) => {
      const on = state.atelier.books.some((book) => book.where === 'lectern' && book.slot === i && book !== selected);
      lamp.light.intensity = on ? 2.4 : 0;
      lamp.glow.material.color.set(on ? 0xfff0c8 : 0x3a3020);
    });
  };

  /** Les livres qui glissent jusqu'à leur place (true tant qu'il en reste). */
  const tick = (now: number): boolean => {
    for (const arrival of [...arrivals]) {
      const k = Math.min(1, (now - arrival.start) / 650);
      arrival.object.position.copy(arrival.from).lerp(arrival.to, 1 - Math.pow(1 - k, 3));
      if (k >= 1) arrivals.splice(arrivals.indexOf(arrival), 1);
    }
    return arrivals.length > 0;
  };

  /** Le livre choisi, ouvert à plat sur le pupitre : derrière, dos, devant, puis la page de garde ; la pièce choisie avance. */
  const unfold = (state: GameState, selected: Curiosity | null, part: PieceId | null): void => {
    const { unfolded, idle } = furniture;
    for (const child of [...unfolded.children]) {
      unfolded.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
    idle.visible = !selected;
    if (!selected) return;
    for (const piecePart of PARTS) {
      const [x, w] = LAYOUT[piecePart];
      const piece = selected.parts[piecePart];
      const busy = !!bookJob(state, selected, piecePart);
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(w, BH, 0.012),
        new THREE.MeshStandardMaterial({
          map: textures.piece(piecePart, piece),
          roughness: 0.75,
          emissive: new THREE.Color(part === piecePart ? 0x6a4a18 : 0x000000),
          transparent: busy,
          opacity: busy ? 0.45 : 1,
        }),
      );
      m.position.set(x, 0, 0.01 + (part === piecePart ? 0.03 : 0));
      m.castShadow = true;
      m.userData.pick = { kind: 'piece', part: piecePart };
      unfolded.add(m);
      if (piece.set !== undefined) {
        const ring = new THREE.Mesh(new THREE.BoxGeometry(w + 0.03, BH + 0.03, 0.006), new THREE.MeshBasicMaterial({ color: 0xc9a040 }));
        ring.position.set(x, 0, 0.002);
        unfolded.add(ring);
      }
    }
    const slip = new THREE.Mesh(
      new THREE.PlaneGeometry(0.075, 0.31),
      new THREE.MeshStandardMaterial({ map: slipTexture(selected.rank), roughness: 0.9 }),
    );
    slip.position.set(0.32, 0.52, 0.02);
    slip.rotation.z = -0.25;
    unfolded.add(slip);
  };

  const dispose = (): void => {
    edge.dispose();
    moreTexture.dispose();
    slips.forEach((texture) => texture.dispose());
    for (const model of models.values())
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        for (const material of [object.material].flat()) material.dispose();
      });
  };

  return { group, build, tick, unfold, dispose };
};
