import * as THREE from 'three';
import { oldWood } from '../library/oldWood';
import { PARTS, PULP_MAX_PERCENT, PULP_PER_PERCENT, type PieceId } from '../../data/curiosities';
import { pulpFull, pulpPercent } from '../../systems/curiosityPulp';
import { pressCount } from '../../systems/curiosityPresses';
import { curiosityEffects } from '../../systems/curiosityEffects';
import { canvasOf, note, repaint, textureOf, type NoteLine } from './atelierPaper';
import { at, bonusText, malusText, minutesText, partName, rankName, stateName } from './atelierText';
import type { FamilyId } from '../../data/curiosities';
import type { CuriosityPiece, GameState, PressJob } from '../../core/state';

/**
 * Le mobilier de l'atelier, tel que la maquette validée le pose (.ai/maquette-atelier-interface.html, mêmes mesures) : le mur
 * de lambris, l'établi, le pupitre incliné où un livre s'ouvre à plat, le casier de seize tiroirs, le carnet pendu à son clou,
 * la lampe, les presses, la pile des pages de réemploi, le pilon, le chariot et l'étiquette du rebut, le lutrin et sa carte.
 */

/** Ce qu'on peut viser dans la scène (userData.pick). */
export type Pick =
  | { kind: 'book'; id: number }
  | { kind: 'piece'; part: PieceId }
  | { kind: 'drawer'; part: PieceId; state: number }
  | { kind: 'notebook' }
  | { kind: 'scrap' }
  | { kind: 'pulp' };

const PIECE = 0xc8a080;
const DARK = 0x6a5446;
/** Les mesures : un livre debout = 0,9 de haut (la vitrine : 1). */
export const BW = 0.62;
export const BH = 0.9;
export const BT = 0.15;
export const TOP = 1.0;
export const CART_X = -3.2;
export const LECTERN_X = 3.15;
export const SHELVES = [0.26, 1.4];
export const CART_TOP = 2.56;
export const LECTERN_Y = [0.34, 1.34, 2.34];
const PUPITRE_X = -0.75;
const CAB = { x: PUPITRE_X, y: 2.24, colW: 0.58, rowH: 0.3 };
const ROWS = [3, 2, 1, 0];
const PRESS_X = [0.92, 1.36, 1.8];
const PULP = { x: 1.3, y: 0.24 };

export const createFurniture = (scene: THREE.Scene, redraw: () => void) => {
  const pickables: THREE.Object3D[] = [];
  const wood = (parent: THREE.Object3D, seed: string, w: number, h: number, d: number, x: number, y: number, z: number, color = PIECE) => {
    const geometry = new THREE.BoxGeometry(w, h, d);
    if (w > h) {
      const uv = geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
    }
    const mesh = new THREE.Mesh(geometry, oldWood(seed, { length: Math.max(w, h, d), color }, redraw));
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08a4a, roughness: 0.35, metalness: 0.85 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.6, metalness: 0.6 });
  const pagesMaterial = new THREE.MeshStandardMaterial({ color: 0xe2d1ab, roughness: 0.9 });
  const plane = (w: number, h: number, map: THREE.Texture, parent: THREE.Object3D, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map, roughness: 0.85 }));
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  const pickable = (object: THREE.Object3D, pick: Pick): void => {
    object.traverse((child) => (child.userData.pick = pick));
    pickables.push(object);
  };
  /** Une étiquette de papier : sa toile, sa texture, redessinées à la demande. */
  const label = (w: number, h: number) => {
    const [canvas] = canvasOf(w, h);
    return { canvas, texture: textureOf(canvas) };
  };

  // Le mur de l'atelier : un lambris derrière l'établi.
  const wall = new THREE.Mesh(new THREE.BoxGeometry(4.6, 3.8, 0.05), oldWood('atelier-wall', { whole: true, color: 0x4a3a2c }, redraw));
  wall.position.set(0, 1.9, -0.58);
  wall.receiveShadow = true;
  scene.add(wall);
  for (let i = -2; i <= 2; i++) wood(scene, `atelier-batten-${i}`, 0.04, 3.8, 0.03, i * 1.15, 1.9, -0.54, DARK);

  // L'établi : un plateau épais, quatre pieds, une tablette basse (les pages de réemploi).
  wood(scene, 'bench-top', 4.2, 0.09, 1.0, 0, TOP - 0.045, 0);
  for (const x of [-2.0, 2.0])
    for (const z of [-0.42, 0.42]) wood(scene, `bench-leg-${x}-${z}`, 0.1, TOP - 0.09, 0.1, x, (TOP - 0.09) / 2, z, DARK);
  wood(scene, 'bench-shelf', 4.0, 0.04, 0.9, 0, 0.22, 0, DARK);
  wood(scene, 'bench-apron', 4.0, 0.1, 0.03, 0, TOP - 0.14, 0.47, DARK);

  // Le pupitre : une planche inclinée où l'on déplie un livre.
  const pupitre = new THREE.Group();
  pupitre.position.set(PUPITRE_X, TOP + 0.005, 0.12);
  pupitre.rotation.x = -0.34;
  scene.add(pupitre);
  wood(pupitre, 'pupitre-board', 2.42, 1.12, 0.04, 0, 0.58, -0.03);
  wood(pupitre, 'pupitre-lip', 2.42, 0.04, 0.08, 0, 0.03, 0.02);
  const unfolded = new THREE.Group();
  unfolded.position.set(0, 0.55, 0.0);
  pupitre.add(unfolded);
  // Sans livre : un mot au crayon sur la planche.
  const idleLabel = label(400, 100);
  const idle = plane(1.4, 0.35, idleLabel.texture, pupitre, 0, 0.6, 0.0);
  (idle.material as THREE.MeshStandardMaterial).transparent = true;
  wood(pupitre, 'pupitre-foot', 0.06, 0.6, 0.06, -0.9, 0.3, -0.25, DARK);
  wood(pupitre, 'pupitre-foot2', 0.06, 0.6, 0.06, 0.9, 0.3, -0.25, DARK);

  // Le casier des pièces : seize tiroirs (quatre pièces × quatre états), au mur, au-dessus du pupitre.
  const drawers: { part: PieceId; state: number; group: THREE.Group; canvas: HTMLCanvasElement; texture: THREE.Texture; z: number }[] = [];
  {
    const w = 4 * CAB.colW + 0.12;
    const h = 4 * CAB.rowH + 0.12;
    const d = 0.38;
    const cab = new THREE.Group();
    cab.position.set(CAB.x, CAB.y, -0.36);
    scene.add(cab);
    wood(cab, 'cab-top', w + 0.06, 0.05, d + 0.04, 0, h + 0.025, 0);
    wood(cab, 'cab-bottom', w, 0.05, d, 0, 0.025, 0);
    wood(cab, 'cab-left', 0.06, h, d, -w / 2 + 0.03, h / 2, 0);
    wood(cab, 'cab-right', 0.06, h, d, w / 2 - 0.03, h / 2, 0);
    PARTS.forEach((part, c) =>
      ROWS.forEach((state, r) => {
        const g = new THREE.Group();
        g.position.set(-w / 2 + 0.06 + c * CAB.colW + CAB.colW / 2, 0.06 + (3 - r) * CAB.rowH + CAB.rowH / 2, d / 2 - 0.015);
        wood(g, `drawer-${part}-${state}`, CAB.colW - 0.02, CAB.rowH - 0.02, 0.03, 0, 0, 0, 0xb08860);
        const tag = label(300, 140);
        plane(0.4, 0.187, tag.texture, g, 0, 0.03, 0.017);
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 12), brass);
        handle.rotation.z = Math.PI / 2;
        handle.position.set(0, -0.1, 0.035);
        g.add(handle);
        for (const s of [-0.075, 0.075]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), brass);
          post.rotation.x = Math.PI / 2;
          post.position.set(s, -0.1, 0.022);
          g.add(post);
        }
        // Ce qu'on voit tiroir ouvert : des pièces empilées.
        const inside = new THREE.Mesh(new THREE.BoxGeometry(CAB.colW - 0.1, 0.05, 0.25), pagesMaterial);
        inside.position.set(0, -0.08, -0.15);
        g.add(inside);
        cab.add(g);
        pickable(g, { kind: 'drawer', part, state });
        drawers.push({ part, state, group: g, canvas: tag.canvas, texture: tag.texture, z: g.position.z });
      }),
    );
  }

  // Le carnet des pièces S, pendu à un clou au mur.
  const notebookCover = label(210, 280);
  {
    const g = new THREE.Group();
    g.position.set(1.05, 2.85, -0.5);
    g.rotation.z = -0.05;
    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.56, 0.04),
      new THREE.MeshStandardMaterial({ map: notebookCover.texture, roughness: 0.8 }),
    );
    cover.castShadow = true;
    g.add(cover);
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.57, 0.045), new THREE.MeshStandardMaterial({ color: 0x151210 }));
    band.position.x = 0.15;
    g.add(band);
    const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.05, 8), iron);
    nail.rotation.x = Math.PI / 2;
    nail.position.set(0, 0.42, 0.0);
    g.add(nail);
    for (const s of [-1, 1]) {
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 4), new THREE.MeshStandardMaterial({ color: 0x8a7a5a }));
      string.position.set(s * 0.08, 0.34, 0.0);
      string.rotation.z = s * 0.75;
      g.add(string);
    }
    scene.add(g);
    pickable(g, { kind: 'notebook' });
  }

  // La lampe de l'atelier, au-dessus de l'établi.
  {
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.2, 24, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x2c3a2a, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }),
    );
    shade.position.set(0.9, 3.45, 0.2);
    scene.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff0c8 }));
    bulb.position.set(0.9, 3.37, 0.2);
    scene.add(bulb);
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.5, 6), iron);
    cord.position.set(0.9, 3.8, 0.2);
    scene.add(cord);
  }

  // Les presses : les places de l'établi.
  const presses = PRESS_X.map((x, i) => {
    const g = new THREE.Group();
    g.position.set(x, TOP, -0.12);
    scene.add(g);
    wood(g, `press-base-${i}`, 0.38, 0.06, 0.32, 0, 0.03, 0, DARK);
    for (const s of [-0.16, 0.16]) wood(g, `press-up-${i}-${s}`, 0.035, 0.5, 0.06, s, 0.31, 0, DARK);
    wood(g, `press-beam-${i}`, 0.38, 0.05, 0.08, 0, 0.56, 0, DARK);
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.3, 10), iron);
    screw.position.set(0, 0.42, 0.0);
    g.add(screw);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 8), iron);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 0.62, 0);
    g.add(bar);
    for (const z of [-0.035, 0.035]) wood(g, `press-jaw-${i}-${z}`, 0.3, 0.14, 0.025, 0, 0.13, z);
    const held = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.3), new THREE.MeshStandardMaterial({ roughness: 0.85 }));
    held.position.set(0, 0.28, 0.0);
    g.add(held);
    const tag = label(220, 120);
    const tagMesh = plane(0.3, 0.165, tag.texture, g, 0, 0.13, 0.065);
    tagMesh.rotation.x = -0.05;
    return { group: g, held, ...tag };
  });

  // Les pages de réemploi : une pile de feuilles sous l'établi.
  const pile = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.36), [
    pagesMaterial,
    pagesMaterial,
    new THREE.MeshStandardMaterial({ color: 0xece0c2, roughness: 0.9 }),
    pagesMaterial,
    pagesMaterial,
    pagesMaterial,
  ]);
  pile.castShadow = true;
  scene.add(pile);
  const pileLabel = label(260, 120);
  const pileTag = plane(0.42, 0.195, pileLabel.texture, scene, -1.35, 0.4, 0.4);
  pileTag.rotation.x = -0.18;

  // Le pilon : une cuve de bois cerclée de fer sous l'établi, à droite, son pilon debout dedans ; la pâte de papier monte
  // avec les points ; sur le devant, une étiquette dit l'Éther gagné pour le prochain prestige (cinq crans, +1 % chacun).
  const pulp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.285, 0.285, 1, 28),
    new THREE.MeshStandardMaterial({ color: 0xd9cdb0, roughness: 1 }),
  );
  const pulpLabel = label(300, 170);
  {
    const g = new THREE.Group();
    g.position.set(PULP.x, PULP.y, 0.0);
    scene.add(g);
    const tubWood = oldWood('pilon-tub', { length: 0.44, color: 0xa07850 }, redraw);
    tubWood.side = THREE.DoubleSide;
    const tub = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.28, 0.44, 28, 1, true), tubWood);
    tub.position.y = 0.22;
    tub.castShadow = true;
    g.add(tub);
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 28), tubWood);
    floor.position.y = 0.01;
    g.add(floor);
    for (const y of [0.05, 0.39]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(y < 0.1 ? 0.284 : 0.306, 0.011, 8, 40), iron);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.y = y;
      g.add(hoop);
    }
    pulp.position.y = 0.03;
    g.add(pulp);
    // Le pilon : un manche, une tête ronde dans la pâte, un peu penché.
    const pestle = new THREE.Group();
    pestle.position.set(0.06, 0.08, -0.06);
    pestle.rotation.z = -0.28;
    g.add(pestle);
    const head = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.11, 0.15, 20),
      oldWood('pilon-head', { length: 0.12, color: 0x8a6a48 }, redraw),
    );
    head.position.y = 0.06;
    pestle.add(head);
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.032, 0.62, 12),
      oldWood('pilon-handle', { length: 0.62, color: 0x9a7a52 }, redraw),
    );
    handle.position.y = 0.45;
    handle.castShadow = true;
    pestle.add(handle);
    const tag = plane(0.3, 0.17, pulpLabel.texture, g, -0.02, 0.2, 0.32);
    tag.rotation.x = -0.1;
    tag.castShadow = true;
    pickable(g, { kind: 'pulp' });
  }

  // Le chariot : deux étages de cinq, un dessus pour les livres à pièce S, quatre roulettes, une poignée.
  {
    const g = new THREE.Group();
    g.position.set(CART_X, 0, 0);
    scene.add(g);
    for (const s of [-0.56, 0.56]) wood(g, `cart-end-${s}`, 0.05, CART_TOP - 0.1, 0.62, s, (CART_TOP - 0.1) / 2 + 0.1, 0, DARK);
    SHELVES.forEach((y, i) => wood(g, `cart-shelf-${i}`, 1.07, 0.04, 0.62, 0, y - 0.02, 0));
    wood(g, 'cart-top', 1.2, 0.05, 0.66, 0, CART_TOP - 0.025, 0);
    for (const y of SHELVES) wood(g, `cart-lip-${y}`, 1.07, 0.05, 0.02, 0, y + 0.01, 0.31, DARK);
    for (const x of [-0.5, 0.5])
      for (const z of [-0.24, 0.24]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 18), iron);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.06, z);
        g.add(wheel);
      }
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.62, 10), brass);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0.66, CART_TOP - 0.25, 0);
    g.add(handle);
    for (const z of [-0.29, 0.29]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8), brass);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(0.61, CART_TOP - 0.25, z);
      g.add(arm);
    }
  }
  // La règle du rebut : une étiquette de papier pendue à la poignée du chariot.
  const scrapLabel = label(300, 200);
  {
    const card = new THREE.Group();
    card.position.set(CART_X + 0.7, CART_TOP - 0.25, 0.2);
    card.rotation.z = 0.04;
    const face = plane(0.36, 0.24, scrapLabel.texture, card, 0, -0.16, 0.012);
    face.castShadow = true;
    for (const s of [-1, 1]) {
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.07, 4), new THREE.MeshStandardMaterial({ color: 0x8a7a5a }));
      string.position.set(s * 0.025, -0.02, 0.012);
      string.rotation.z = s * 0.6;
      card.add(string);
    }
    scene.add(card);
    pickable(card, { kind: 'scrap' });
  }

  // Le lutrin : trois pupitres l'un au-dessus de l'autre, chacun sa lampe ; la carte du total en haut.
  const lecternLamps: { light: THREE.SpotLight; glow: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial> }[] = [];
  const totalLabel = label(380, 260);
  {
    const g = new THREE.Group();
    g.position.set(LECTERN_X, 0, 0);
    scene.add(g);
    wood(g, 'lectern-base', 0.9, 0.08, 0.6, 0, 0.04, 0, DARK);
    for (const s of [-0.4, 0.4]) wood(g, `lectern-post-${s}`, 0.05, 3.25, 0.06, s, 1.66, -0.2, DARK);
    LECTERN_Y.forEach((y, i) => {
      const desk = new THREE.Group();
      desk.position.set(0, y, 0.0);
      desk.rotation.x = -0.3;
      g.add(desk);
      wood(desk, `lectern-desk-${i}`, 0.82, 0.92, 0.03, 0, 0.46, -0.04);
      wood(desk, `lectern-lip-${i}`, 0.82, 0.03, 0.07, 0, 0.0, 0.03);
      const lampBar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.36, 12), brass);
      lampBar.rotation.z = Math.PI / 2;
      lampBar.position.set(0, 1.0, 0.16);
      desk.add(lampBar);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.2, 6), brass);
      arm.rotation.x = 1.1;
      arm.position.set(0, 0.97, 0.07);
      desk.add(arm);
      const glow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.01, 0.02), new THREE.MeshBasicMaterial({ color: 0x3a3020 }));
      glow.position.set(0, 0.982, 0.16);
      desk.add(glow);
      const light = new THREE.SpotLight(0xffd9a0, 0, 1.6, THREE.MathUtils.degToRad(50), 0.7, 1.5);
      light.position.set(LECTERN_X, y + 1.05, 0.5);
      light.target.position.set(LECTERN_X, y + 0.45, 0);
      scene.add(light, light.target);
      lecternLamps.push({ light, glow });
    });
    const card = plane(0.78, 0.53, totalLabel.texture, g, 0, 3.32, -0.14);
    card.castShadow = true;
    wood(g, 'lectern-crest', 0.9, 0.05, 0.1, 0, 3.03, -0.18, DARK);
  }

  // Les dessins des étiquettes, d'après la partie.
  const drawIdle = (): void =>
    repaint(
      idleLabel.canvas,
      idleLabel.texture,
      note(400, 100, [[at('scene.idle'), { size: 34, color: 'rgba(30,22,14,0.7)' }]], { bg: 'rgba(0,0,0,0)' }),
    );
  const drawNotebook = (): void =>
    repaint(
      notebookCover.canvas,
      notebookCover.texture,
      note(
        210,
        280,
        [
          [at('scene.notebookTitle'), { size: 44, bold: true, color: '#e8dcc0' }],
          [at('scene.notebookSub'), { size: 30, color: '#d8ccb0' }],
        ],
        { bg: '#2f3d2c' },
      ),
    );
  const drawDrawers = (state: GameState): void => {
    for (const d of drawers) {
      const n = state.atelier.drawers[d.part][d.state];
      repaint(
        d.canvas,
        d.texture,
        note(
          300,
          140,
          [
            [at('scene.drawer', { part: partName(d.part), state: stateName(d.state) }), { size: 34, bold: true, step: 54 }],
            [n ? `${n}` : '—', { size: 60, bold: true, color: n ? '#1a1a28' : 'rgba(42,42,58,0.35)' }],
          ],
          { frame: true, top: 40, size: 34 },
        ),
      );
    }
  };
  const drawPresses = (
    state: GameState,
    pieceTexture: (part: PieceId, piece: CuriosityPiece) => THREE.Texture,
    jobPiece: (job: PressJob) => CuriosityPiece | undefined,
    now: number,
  ): void => {
    presses.forEach((press, i) => {
      press.group.visible = i < pressCount(state);
      const job = state.atelier.jobs[i];
      const piece = job && jobPiece(job);
      press.held.visible = !!piece;
      let lines: NoteLine[] = [[at('scene.free'), { size: 40, color: 'rgba(42,42,58,0.6)' }]];
      if (job) {
        if (piece) {
          const material = press.held.material as THREE.MeshStandardMaterial;
          material.map = pieceTexture(job.part, piece);
          material.needsUpdate = true;
          press.held.scale.x = job.part === 'spine' ? 0.35 : 1;
        }
        const fields = { part: partName(job.part), state: stateName(job.to) };
        lines = [
          [at(job.kind === 'mount' ? 'scene.press' : 'scene.pressS', fields), { size: 26 }],
          [at('scene.left', { d: minutesText((job.end - now) / 60_000) }), { size: 30, bold: true }],
        ];
      }
      repaint(press.canvas, press.texture, note(220, 120, lines));
    });
  };
  const drawPile = (state: GameState): void => {
    const h = 0.02 + Math.min(0.4, state.atelier.reserve * 0.004);
    pile.scale.y = h;
    pile.position.set(-1.35, 0.24 + h / 2, 0.05);
    pileTag.position.y = 0.24 + 0.12;
    repaint(
      pileLabel.canvas,
      pileLabel.texture,
      note(260, 120, [
        [at('scene.reserve'), { size: 28 }],
        [`${state.atelier.reserve}`, { size: 42, bold: true }],
      ]),
    );
  };
  const drawPulp = (state: GameState): void => {
    const pct = pulpPercent(state);
    const into = state.atelier.pulp % PULP_PER_PERCENT;
    const h = 0.02 + 0.36 * Math.min(1, state.atelier.pulp / (PULP_MAX_PERCENT * PULP_PER_PERCENT));
    pulp.scale.y = h;
    pulp.position.y = 0.02 + h / 2;
    const paper = note(300, 170, [
      [at('scene.pulp'), { size: 30 }],
      [at('scene.pulpEther', { n: pct }), { size: 38, bold: true }],
      [pulpFull(state) ? at('scene.pulpFull') : at('scene.pulpNext', { a: into, b: PULP_PER_PERCENT, n: pct + 1 }), { size: 24 }],
    ]);
    // Les cinq crans, au crayon sous le texte.
    const x = paper.getContext('2d')!;
    for (let i = 0; i < PULP_MAX_PERCENT; i++) {
      x.strokeStyle = '#3a2e22';
      x.lineWidth = 2;
      x.strokeRect(70 + i * 34, 148, 26, 12);
      if (i < pct) {
        x.fillStyle = '#3a2e22';
        x.fillRect(70 + i * 34, 148, 26, 12);
      }
    }
    repaint(pulpLabel.canvas, pulpLabel.texture, paper);
  };
  const drawScrap = (state: GameState): void => {
    const { rank, state: worst } = state.atelier.scrap;
    repaint(
      scrapLabel.canvas,
      scrapLabel.texture,
      note(300, 200, [
        [at('scene.scrapTitle'), { size: 34, bold: true }],
        [at('scene.scrapWhen'), { size: 28 }],
        [
          rank < 0 ? at('scene.scrapNone') : at('scene.scrapRule', { r: rankName(rank), s: stateName(worst) }),
          { size: rank < 0 ? 32 : 26 },
        ],
      ]),
    );
  };
  const drawTotal = (state: GameState): void => {
    const on = state.atelier.books.filter((book) => book.where === 'lectern');
    const sum = new Map<FamilyId, number>();
    const minus = new Map<FamilyId, number>();
    for (const book of on) {
      const { bonus, malus } = curiosityEffects(book);
      for (const effect of bonus) sum.set(effect.family, (sum.get(effect.family) ?? 0) + effect.value * effect.factor);
      for (const effect of malus) minus.set(effect.family, (minus.get(effect.family) ?? 0) + effect.value);
    }
    const lines: NoteLine[] = [[at('scene.lectern'), { size: 34, bold: true, step: 36 }]];
    for (const [family, value] of sum) lines.push([bonusText(family, value), { size: 25, step: 30 }]);
    for (const [family, value] of minus) lines.push([malusText(family, value), { size: 25, color: '#8e2f22', step: 30 }]);
    if (!on.length) lines.push([at('scene.lecternEmpty'), { size: 26, color: 'rgba(42,42,58,0.5)' }]);
    repaint(totalLabel.canvas, totalLabel.texture, note(380, 260, lines, { top: 34, size: 25, align: 'left' }));
  };

  return {
    pickables,
    unfolded,
    idle,
    drawers,
    lecternLamps,
    drawIdle,
    drawNotebook,
    drawDrawers,
    drawPresses,
    drawPile,
    drawPulp,
    drawScrap,
    drawTotal,
    plane,
  };
};

export type Furniture = ReturnType<typeof createFurniture>;
