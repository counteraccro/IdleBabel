import { EYE_HEIGHT, FOCAL, MIMIC_BOOK, ROOM_IMAGE, type MimicSpot } from '../../data/mimic';
import { LETTERS } from '../../systems/babelText';
import { setNumberText } from '../babelDigits';
import { homography, inQuad, type Point } from './homography';
import { EYE_R, TEX_H, TEX_W, eyeLayer, eyePlaces, paintEyes, type EyePlace, type Mouth } from './mimicEyes';
import type { MimicTextures } from './mimicTextures';

/**
 * La Mimic posée dans la salle (maquette validée .ai/maquette-mimic.html) : une vraie boîte en perspective, l'appareil
 * photo du fond (point de fuite, œil à 1,6 m, focale 1500 px), trois pièces (le plat du dessous, le bloc des pages en
 * retrait, le plat du dessus qui pivote sur le dos comme une mâchoire). Chaque face est un élément posé par homographie.
 */

type Vec = [number, number, number];
type Corners = Record<string, Vec>;

/** Débogage : la taille du livre (1 : un vrai livre, 0,22 × 0,275 m). */
let sizeFactor = 1;
export const setMimicSize = (factor: number): void => {
  sizeFactor = factor;
};
export const mimicSize = (): number => sizeFactor;

/** Les six faces d'une pièce : coins (haut-gauche, haut-droit, bas-droit, bas-gauche de la texture) et normale. */
const SIDES: Record<string, { c: string[]; n: Vec }> = {
  top: { c: ['011', '111', '101', '001'], n: [0, 1, 0] },
  bottom: { c: ['110', '010', '000', '100'], n: [0, -1, 0] },
  fore: { c: ['111', '110', '100', '101'], n: [1, 0, 0] },
  spine: { c: ['010', '011', '001', '000'], n: [-1, 0, 0] },
  tail: { c: ['001', '101', '100', '000'], n: [0, 0, -1] },
  head: { c: ['111', '011', '010', '110'], n: [0, 0, 1] },
};
type Part = 'base' | 'block' | 'cover';
/** Les faces dessinées : la pièce, son côté, sa texture. Le plat du dessous, les pages, puis le plat du dessus. */
const FACES = (
  [
    ['base', 'bottom', 'back'],
    ['base', 'top', 'baseIn'],
    ['base', 'fore', 'edgeV'],
    ['base', 'tail', 'edgeH'],
    ['base', 'head', 'edgeH'],
    ['base', 'spine', 'spine'],
    ['block', 'top', 'pagesTop'],
    ['block', 'fore', 'fore'],
    ['block', 'tail', 'tail'],
    ['block', 'head', 'head'],
    ['cover', 'top', 'cover'],
    ['cover', 'bottom', 'coverIn'],
    ['cover', 'fore', 'edgeV'],
    ['cover', 'tail', 'edgeH'],
    ['cover', 'head', 'edgeH'],
    ['cover', 'spine', 'spine'],
  ] as const
).map(([part, side, tex]) => ({ name: `${part}.${side}`, part: part as Part, tex, ...SIDES[side] }));
const PART_ORDER: Record<Part, number> = { base: 0, block: 1, cover: 2 };

// ——— L'animation : s'ouvrir, regarder à gauche, à droite, cligner, se refermer ———
const ease = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t));
/** [temps, ouverture, regard, largeur de la pupille] */
type Key = readonly number[];
const KEYS: Key[] = [
  [0, 0, 0, 0.3],
  [380, 1, 0, 0.3],
  [1000, 1, 0, 0.07],
  [1300, 1, -0.85, 0.07],
  [1900, 1, -0.85, 0.07],
  [2300, 1, 0.85, 0.07],
  [2800, 1, 0.85, 0.07],
  [2900, 0.08, 0.85, 0.07],
  [3050, 1, 0.85, 0.14],
  [3400, 1, 0, 0.07],
  [3700, 1, 0, 0.07],
  [4100, 0, 0, 0.07],
];
/** Les yeux pendant la morsure : grands ouverts tout de suite, pupille large, puis ils se referment. */
const BITE_EYES: Key[] = [
  [0, 0.6, 0, 0.32],
  [90, 1, 0, 0.32],
  [1500, 1, 0, 0.12],
  [1800, 1, 0.5, 0.1],
  [2100, 1, -0.5, 0.1],
  [2400, 1, 0, 0.1],
  [2800, 0, 0, 0.1],
];
/** [temps, ouverture de la mâchoire (degrés), saut (m)] : deux claquements. */
const BITE: Key[] = [
  [0, 0, 0],
  [120, 42, 0.015],
  [240, 0, 0],
  [350, 26, 0.008],
  [460, 0, 0],
  [640, 0, 0],
];
/** [temps, mâchoire, tremblement, taille, opacité] : elle claque, tremble, se ratatine et s'efface. */
const VANISH: Key[] = [
  [0, 0, 0, 1, 1],
  [90, 14, 0, 1, 1],
  [160, 0, 0, 1, 1],
  [520, 0, 1, 1, 1],
  [900, 0, 0, 0.05, 0],
];
/** Elle ouvre les yeux toutes les 6 à 14 s. */
const WAKE_MIN = 6000;
const WAKE_SPAN = 8000;

/** Un point d'une piste à l'instant t (ms) : interpolé entre les deux clés qui l'encadrent. */
const sample = (track: readonly Key[], t: number): number[] => {
  if (t >= track.at(-1)![0]) return [...track.at(-1)!];
  const i = track.findIndex((k) => k[0] > t);
  const a = track[i - 1];
  const b = track[i];
  const e = ease((t - a[0]) / (b[0] - a[0]));
  return a.map((v, j) => v + (b[j] - v) * e);
};

/** Où le livre est tourné : sa place, l'écart de sa bouche au regard du joueur, redressé ou non. */
interface Pose {
  X: number;
  Z: number;
  yaw: number;
  pitch: number;
  mouth: Mouth;
}

/** Le coin (u, v, n) du livre : u la largeur (le dos en 0), v la hauteur (queue 0), n l'épaisseur (le dessous 0). */
const turn = (pose: Pose, [x, y, z]: Vec): Vec => {
  // La bouche regarde le joueur ; « tourné » est un écart à ce regard.
  const facing = pose.mouth === 'fore' ? Math.atan2(pose.Z, -pose.X) : Math.atan2(pose.X, pose.Z);
  const p = (pose.pitch * Math.PI) / 180;
  const a = facing + (pose.yaw * Math.PI) / 180;
  const y1 = y * Math.cos(p) + z * Math.sin(p);
  const z1 = -y * Math.sin(p) + z * Math.cos(p);
  return [x * Math.cos(a) + z1 * Math.sin(a), y1, -x * Math.sin(a) + z1 * Math.cos(a)];
};

/** La boîte du livre fermé posé à `spot`, en pixels de l'image du fond (pour savoir si on la voit à l'écran). */
export const spotBox = (spot: MimicSpot, vanishing: { x: number; y: number }): { x0: number; y0: number; x1: number; y1: number } => {
  const pose: Pose = { X: spot.X, Z: spot.Z, yaw: spot.yaw, pitch: spot.pitch ?? 0, mouth: spot.mouth ?? 'fore' };
  const { w, h, t } = MIMIC_BOOK;
  const corners: Vec[] = [];
  for (const u of [0, w])
    for (const d of [0, h]) for (const n of [0, t]) corners.push(turn(pose, [u - w / 2, n, d - h / 2].map((x) => x * sizeFactor) as Vec));
  const minY = Math.min(...corners.map((c) => c[1]));
  const pts = corners.map(([x, y, z]) => [
    vanishing.x * ROOM_IMAGE.w + (FOCAL * (spot.X + x)) / (spot.Z + z),
    vanishing.y * ROOM_IMAGE.h + (FOCAL * (EYE_HEIGHT - (spot.surface + y - minY))) / (spot.Z + z),
  ]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
};

export interface MimicRoom {
  /** Point de fuite (fractions de l'image). */
  vanishing: { x: number; y: number };
  /** Lumière de la salle à la place du livre (filtre, en part) : celle de la salle, et l'assombrissement du fond. */
  light: number;
}

export interface MimicBook {
  root: HTMLElement;
  /** À recalculer : la salle a changé de taille (`scale` : pixels d'écran par pixel d'image). */
  place: (scale: number) => void;
  /** Le clic tombe sur elle (repère de la salle). */
  hit: (x: number, y: number) => boolean;
  /** Ce qui s'affiche au-dessus d'elle : le nombre avalé (l'œil de l'Etherium), « z z z » (le Sommeil léger). */
  show: (options: { count: string | null; snore: boolean }) => void;
  bite: () => void;
  /** Elle disparaît ; `done` reçoit le centre du livre (repère de la salle), quand c'est fini. */
  vanish: (done: (x: number, y: number) => void) => void;
  destroy: () => void;
}

/** La Mimic à sa place dans la salle `room`, avec ses textures. */
export const createMimicBook = (textures: MimicTextures, spot: MimicSpot, room: MimicRoom): MimicBook => {
  const root = document.createElement('div');
  root.className = 'mimic-layer';
  const v = {
    X: spot.X,
    Z: spot.Z,
    surface: spot.surface,
    yaw: spot.yaw,
    pitch: spot.pitch ?? 0,
    mouth: (spot.mouth ?? 'fore') as Mouth,
    open: 0,
    look: 0,
    pupil: 0.07,
    bite: 0,
    hop: 0,
    jitter: 0,
    shrink: 1,
    fade: 1,
    gone: false,
  };
  let scale = 1;
  let hits: Point[][] = [];
  let shownCount: string | null = null;
  let snore = false;

  const project = ([X, Y, Z]: Vec): Point => [
    room.vanishing.x * ROOM_IMAGE.w + (FOCAL * X) / Z,
    room.vanishing.y * ROOM_IMAGE.h + (FOCAL * (EYE_HEIGHT - Y)) / Z,
  ];
  const screen = (p: Vec): Point => {
    const [x, y] = project(p);
    return [x * scale, y * scale];
  };
  const rotate = (p: Vec): Vec => turn(v, p);
  /** Le livre en deux pièces : le bloc des pages (avec le plat du dessous) et le plat du dessus, qui pivote sur le dos. */
  const geometry = () => {
    const k = sizeFactor * v.shrink;
    const w = MIMIC_BOOK.w * k;
    const h = MIMIC_BOOK.h * k;
    const t = MIMIC_BOOK.t * k;
    // Plats épais, et les chasses : ce que les plats dépassent des pages, à la tranche, en tête et en queue.
    const tb = t * 0.16;
    const sq = 0.006 * k;
    const hinge = t - tb;
    const th = (v.bite * Math.PI) / 180;
    const lid = ([x, y, z]: Vec): Vec => {
      const dx = x + w / 2;
      const dy = y - hinge;
      return [-w / 2 + dx * Math.cos(th) - dy * Math.sin(th), hinge + dx * Math.sin(th) + dy * Math.cos(th), z];
    };
    const lidN = ([x, y, z]: Vec): Vec => [x * Math.cos(th) - y * Math.sin(th), x * Math.sin(th) + y * Math.cos(th), z];
    const box = (u0: number, u1: number, v0: number, v1: number, n0: number, n1: number, f = (q: Vec) => q): Corners => {
      const c: Corners = {};
      for (const iu of [0, 1])
        for (const iv of [0, 1])
          for (const inn of [0, 1]) c[`${iu}${iv}${inn}`] = rotate(f([-w / 2 + (iu ? u1 : u0), inn ? n1 : n0, -h / 2 + (iv ? v1 : v0)]));
      return c;
    };
    const base = box(0, w, 0, h, 0, tb);
    const block = box(0, w - sq, sq, h - sq, tb, hinge);
    const cover = box(0, w, 0, h, hinge, t, lid);
    // Posé sur sa surface : le livre fermé touche le sol, la mâchoire ne le soulève pas.
    const closed = box(0, w, 0, h, 0, t);
    const minY = Math.min(...Object.values(closed).map((q) => q[1]));
    const toWorld = (c: Corners): Corners =>
      Object.fromEntries(Object.entries(c).map(([key, [x, y, z]]) => [key, [v.X + x + v.jitter, v.surface + y - minY + v.hop, v.Z + z]]));
    return { base: toWorld(base), block: toWorld(block), cover: toWorld(cover), raw: closed, lidN, coverNormal: rotate(lidN([0, 1, 0])) };
  };

  // Les faces, l'ombre portée, les yeux (dans la lumière de la salle) ; ce qui flotte au-dessus.
  const body = document.createElement('div');
  body.className = 'mimic-body';
  root.append(body);
  const shadow = document.createElement('div');
  shadow.className = 'mimic-face mimic-shadow';
  body.append(shadow);
  const faces = new Map<string, HTMLElement>();
  for (const face of FACES) {
    const source = textures.canvases[face.tex];
    const el = document.createElement('div');
    el.className = 'mimic-face';
    el.style.width = `${source.width}px`;
    el.style.height = `${source.height}px`;
    const copy = document.createElement('canvas');
    copy.width = source.width;
    copy.height = source.height;
    copy.getContext('2d')!.drawImage(source, 0, 0);
    const shade = document.createElement('div');
    shade.className = 'mimic-shade';
    el.append(copy, shade);
    body.append(el);
    faces.set(face.name, el);
  }
  const eyes = eyeLayer();
  eyes.svg.classList.add('mimic-eyes');
  body.append(eyes.svg);
  const zzz = document.createElement('div');
  zzz.className = 'mimic-zzz';
  zzz.innerHTML = '<span>z</span><span>z</span><span>z</span>';
  const count = document.createElement('div');
  count.className = 'mimic-count';
  root.append(zzz, count);

  /** Un point du plat (repère de la texture) dans la salle, en mètres. */
  const onCover = (world: Corners, tx: number, ty: number): Vec => {
    const s = tx / TEX_W;
    const t = ty / TEX_H;
    const [tl, tr, br, bl] = ['011', '111', '101', '001'].map((k) => world[k]);
    return tl.map((_, i) => tl[i] * (1 - s) * (1 - t) + tr[i] * s * (1 - t) + br[i] * s * t + bl[i] * (1 - s) * t) as Vec;
  };
  /** Les globes dans la salle : à leur place sur le plat, ronds (une sphère reste ronde), leur base écrasée par l'angle. */
  const roomPlaces = (geo: ReturnType<typeof geometry>): EyePlace[] =>
    eyePlaces(v.mouth).map(([x, y, a]) => {
      const r = (a * Math.PI) / 180;
      const [dx, dy] = [Math.cos(r) * EYE_R, Math.sin(r) * EYE_R];
      const P = onCover(geo.cover, x, y);
      const c = screen(P);
      const p0 = screen(onCover(geo.cover, x - dx, y - dy));
      const p1 = screen(onCover(geo.cover, x + dx, y + dy));
      const angle = (Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) * 180) / Math.PI;
      const view = [P[0], P[1] - EYE_HEIGHT, P[2]];
      const len = Math.hypot(...view);
      const n = geo.coverNormal;
      const dot = (n[0] * view[0] + n[1] * view[1] + n[2] * view[2]) / len;
      const sinE = Math.abs(dot);
      // Plat trop ouvert : son dessus ne fait plus face au joueur, les yeux passent derrière.
      const behind = dot >= -0.02;
      const radius = behind ? 0.001 : (FOCAL / P[2]) * ((EYE_R / TEX_W) * MIMIC_BOOK.w * sizeFactor * v.shrink) * scale;
      return [c[0], c[1], angle, radius, Math.max(0.12, sinE), sinE] as const;
    });

  const draw = (): void => {
    const geo = geometry();
    const cam: Vec = [0, EYE_HEIGHT, 0];
    root.style.opacity = String(v.fade);
    body.style.filter = `brightness(${room.light.toFixed(3)}) sepia(0.12)`;
    hits = [];
    const shown: [HTMLElement, number][] = [];
    for (const face of FACES) {
      const el = faces.get(face.name)!;
      const corners = face.c.map((k) => geo[face.part][k]);
      const n = rotate(face.part === 'cover' ? geo.lidN(face.n) : face.n);
      const center = corners.reduce<number[]>((a, q) => a.map((x, i) => x + q[i] / 4), [0, 0, 0]);
      const toFace = center.map((x, i) => x - cam[i]);
      // Le plat fermé cache le dessus des pages.
      const hidden = (face.tex === 'pagesTop' && v.bite < 0.5) || n[0] * toFace[0] + n[1] * toFace[1] + n[2] * toFace[2] >= 0;
      if (hidden) {
        el.style.display = 'none';
        continue;
      }
      el.style.display = '';
      const quad = corners.map(screen);
      const source = textures.canvases[face.tex];
      el.style.transform = homography(source.width, source.height, quad);
      const lit = Math.max(0, 0.55 * n[1] - 0.25 * n[2] + 0.2 * -n[0]);
      // Sous le plat, l'ombre de la bouche.
      const dark = face.tex === 'pagesTop' || face.tex === 'coverIn' ? 0.25 : 0;
      (el.lastChild as HTMLElement).style.background = `rgba(0,0,0,${(0.42 - lit * 0.5 + dark).toFixed(2)})`;
      shown.push([el, Math.hypot(...toFace) - PART_ORDER[face.part] * 1000]);
      hits.push(quad);
    }
    // Le bloc des pages d'abord, le plat par-dessus ; dans chaque pièce, du plus loin au plus près.
    shown.sort((a, b) => b[1] - a[1]).forEach(([el], i) => (el.style.zIndex = String(1 + i)));
    // L'ombre portée : l'empreinte du livre sur sa surface, un peu élargie.
    const xs = Object.values(geo.raw).map((p) => p[0]);
    const zs = Object.values(geo.raw).map((p) => p[2]);
    const pad = 0.05 * sizeFactor;
    const [x0, x1, z0, z1] = [Math.min(...xs) - pad, Math.max(...xs) + pad, Math.min(...zs) - pad, Math.max(...zs) + pad];
    const foot = (
      [
        [x0, z1],
        [x1, z1],
        [x1, z0],
        [x0, z0],
      ] as const
    ).map(([x, z]) => screen([v.X + x, v.surface + 0.002, v.Z + z]));
    shadow.style.transform = homography(100, 100, foot);
    // Les « z z z » et le nombre avalé : au-dessus du livre, à sa taille.
    const pts = [...Object.values(geo.base), ...Object.values(geo.cover)].map(screen);
    const bx = pts.map((p) => p[0]);
    const by = pts.map((p) => p[1]);
    const left = Math.min(...bx);
    const top = Math.min(...by);
    const bw = Math.max(...bx) - left;
    Object.assign(zzz.style, { left: `${left + bw * 0.55}px`, top: `${top + bw * 0.04}px`, fontSize: `${Math.max(9, bw * 0.2)}px` });
    zzz.style.opacity = snore && !v.gone && v.open < 0.05 && v.bite < 0.5 ? '1' : '0';
    Object.assign(count.style, { left: `${left + bw / 2}px`, top: `${top}px`, fontSize: `${Math.max(11, bw * 0.16)}px` });
    setNumberText(count, shownCount ?? '', Math.max(11, bw * 0.16));
    count.style.opacity = shownCount && !v.gone ? '1' : '0';
    eyes.svg.setAttribute('viewBox', `0 0 ${ROOM_IMAGE.w * scale} ${ROOM_IMAGE.h * scale}`);
    paintEyes(eyes, textures.binding.leather, roomPlaces(geo), v);
  };

  // Les pistes en cours : les yeux, la mâchoire.
  let eyesTrack: { keys: readonly Key[]; start: number } | null = null;
  let jawTrack: { keys: readonly Key[]; start: number; apply: (k: number[], p: number) => void; done?: () => void } | null = null;
  let frame = 0;
  const step = (now: number): void => {
    frame = 0;
    if (eyesTrack) {
      // La première image peut dater d'un peu avant le départ.
      const t = Math.max(1, now - eyesTrack.start);
      const [, open, look, pupil] = sample(eyesTrack.keys, t);
      Object.assign(v, { open, look, pupil });
      if (t >= eyesTrack.keys.at(-1)![0]) {
        v.look = 0;
        eyesTrack = null;
      }
    }
    if (jawTrack) {
      const t = Math.max(1, now - jawTrack.start);
      const end = jawTrack.keys.at(-1)![0];
      jawTrack.apply(sample(jawTrack.keys, t), Math.min(1, t / end));
      if (t >= end) {
        const done = jawTrack.done;
        jawTrack = null;
        done?.();
      }
    }
    draw();
    if (eyesTrack || jawTrack) frame = requestAnimationFrame(step);
  };
  const animate = (): void => {
    if (!frame) frame = requestAnimationFrame(step);
  };
  const wake = (keys: readonly Key[] = KEYS, force = false): void => {
    if (v.gone || (eyesTrack && !force)) return;
    eyesTrack = { keys, start: performance.now() };
    animate();
  };
  let timer = 0;
  const schedule = (): void => {
    window.clearTimeout(timer);
    timer = window.setTimeout(
      () => {
        // Sortie de l'écran (un autre écran, ou elle a disparu) : elle ne se réveille plus.
        if (!root.isConnected) return;
        if (!document.hidden) wake();
        schedule();
      },
      WAKE_MIN + Math.random() * WAKE_SPAN,
    );
  };
  schedule();

  const center = (): Point => {
    const quads = hits.flat();
    return [quads.reduce((a, q) => a + q[0], 0) / quads.length, quads.reduce((a, q) => a + q[1], 0) / quads.length];
  };

  return {
    root,
    place: (next) => {
      scale = next;
      draw();
    },
    hit: (x, y) => !v.gone && hits.some((q) => inQuad(x, y, q)),
    show: (options) => {
      if (options.count === shownCount && options.snore === snore) return;
      shownCount = options.count;
      snore = options.snore;
      draw();
    },
    bite: () => {
      wake(BITE_EYES, true);
      jawTrack = {
        keys: BITE,
        start: performance.now(),
        apply: ([, angle, hop]) => {
          v.bite = angle;
          v.hop = hop * sizeFactor;
        },
      };
      animate();
    },
    vanish: (done) => {
      v.gone = true;
      eyesTrack = null;
      v.open = 0.15;
      v.pupil = 0.07;
      const [cx, cy] = center();
      jawTrack = {
        keys: VANISH,
        start: performance.now(),
        apply: ([, angle, shake, size, fade], p) => {
          v.bite = angle;
          v.jitter = shake ? Math.sin(p * 90) * 0.012 * sizeFactor : 0;
          v.shrink = size;
          v.fade = fade;
          if (p > 0.55) v.open = 0;
        },
        done: () => {
          v.jitter = 0;
          done(cx, cy);
        },
      };
      animate();
    },
    destroy: () => {
      window.clearTimeout(timer);
      cancelAnimationFrame(frame);
      root.remove();
    },
  };
};

/** Les connaissances qu'elle avait avalées s'échappent : des lettres de Babel qui montent, et le compte. */
export const spill = (host: HTMLElement, x: number, y: number, text: string): void => {
  for (let i = 0; i < 26; i++) {
    const el = document.createElement('span');
    el.className = 'mimic-spill';
    el.textContent = LETTERS[Math.floor(Math.random() * LETTERS.length)];
    const dx = (Math.random() - 0.5) * 160;
    const dy = -60 - Math.random() * 140;
    Object.assign(el.style, { left: `${x}px`, top: `${y}px`, fontSize: `${12 + Math.random() * 12}px` });
    host.append(el);
    el.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0 },
        { opacity: 1, offset: 0.15 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.1)`, opacity: 0 },
      ],
      { duration: 1500 + Math.random() * 600, delay: Math.random() * 250, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' },
    ).onfinish = () => el.remove();
  }
  const gain = document.createElement('div');
  gain.className = 'mimic-gain';
  gain.textContent = text;
  Object.assign(gain.style, { left: `${x}px`, top: `${y}px` });
  host.append(gain);
  gain.animate(
    [
      { transform: 'translate(-50%, 0)', opacity: 0 },
      { opacity: 1, offset: 0.2 },
      { opacity: 1, offset: 0.7 },
      { transform: 'translate(-50%, -90px)', opacity: 0 },
    ],
    { duration: 2400, easing: 'ease-out', fill: 'both' },
  ).onfinish = () => gain.remove();
};
