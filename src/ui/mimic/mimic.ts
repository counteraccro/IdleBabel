import './mimic.css';
import { el, type Component } from '../dom';
import { getLocale, t } from '../../i18n';
import { currentNotation, formatNumber, writeDigits } from '../../core/format';
import { modalOpen } from '../modal/modal';
import { shownScene } from '../../scene';
import { SCENES } from '../../scene/scenes';
import { MIMIC_LIGHT, MIMIC_SPOTS, ROOM_IMAGE } from '../../data/mimic';
import { cover, hiveTop, screenBox, shaderLight } from '../roomView';
import { leaveWith, sweepLeftovers } from '../leftovers';
import { advanceMimic, catchMimic, mimicBonusShare, mimicHere } from '../../systems/mimic';
import { mimicEyeLit } from '../../systems/etherium';
import { levelOf } from '../../systems/technologies';
import { createMimicBook, mimicSize, spill, spotBox, type MimicBook } from './mimicBook';
import { createMimicSide, type MimicSide } from './mimicSide';
import { mimicTextures, type MimicTextures } from './mimicTextures';
import type { GameState } from '../../core/state';

/**
 * La Mimic à l'écran du jeu (maquettes .ai/maquette-mimic.html et .ai/maquette-mimic-cote.html) : elle vient une fois
 * par heure de jeu, onglet caché compris, mais ne paraît que l'onglet visible et aucune fenêtre ouverte ; elle se pose à
 * une place de la salle qu'on voit à l'écran, ou, s'il n'y en a pas, au bord droit en sceau. Premier clic : elle mord ; second : elle disparaît et rend tout.
 */

/** L'attente n'avance pas de plus d'une seconde d'un coup (onglet repris, machine en veille). */
const MAX_STEP = 1;

/** Débogage : la poser à cette place (« salle:numéro »), même cachée par l'interface, ou au bord (« side ») ; null : au jeu. */
let debugPlace: string | null = null;
export const placeMimic = (place: string | null): void => {
  debugPlace = place;
};

export const createMimic = (state: GameState): Component => {
  const root = el('div', 'mimic-stage');
  const room = el('div', 'mimic-room');
  root.append(room);
  let last = Date.now();
  // Onglet caché, son attente avance aussi (demande de l'auteur, 14/10) : le temps caché est mis de côté, elle ne
  // paraît qu'au retour, à l'écran du jeu et sans fenêtre ouverte (l'écran n'est pas redessiné onglet caché, core/loop.ts).
  let hiddenAt: number | null = document.hidden ? Date.now() : null;
  let hiddenSeconds = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt ??= Date.now();
    else if (hiddenAt !== null) {
      hiddenSeconds += (Date.now() - hiddenAt) / 1000;
      hiddenAt = null;
      last = Date.now();
    }
  });
  let textures: MimicTextures | null = null;
  let loading: number | null = null;
  /** Ses textures n'ont pas pu être faites : elle reste au bord de l'écran, en sceau (il n'en a pas besoin). */
  let failed = false;
  let book: MimicBook | null = null;
  let bookSpot: string | null = null;
  let side: MimicSide | null = null;
  /** Clics reçus par la Mimic à l'écran : le premier mord, le second l'attrape. */
  let struck = 0;
  /** Elle est en train de disparaître : l'animation va jusqu'au bout. */
  let leaving = false;
  let size = '';

  const number = (value: number): string => writeDigits(formatNumber(Math.floor(value), getLocale()));

  const clear = (): void => {
    room.classList.remove('hover');
    document.documentElement.classList.remove('mimic-hover');
    book?.destroy();
    side?.destroy();
    book = null;
    side = null;
    bookSpot = null;
    struck = 0;
  };

  /** Le second clic : elle rend tout, avec le bonus ; les lettres s'échappent. */
  const strike = (at?: (text: string) => void): void => {
    if (leaving) return;
    struck += 1;
    if (struck === 1) {
      book?.bite();
      side?.bite();
      return;
    }
    leaving = true;
    const share = mimicBonusShare(state);
    const given = catchMimic(state);
    const text = t('ui.mimic.gain')
      .replace('{n}', number((given?.eaten ?? 0) + (given?.bonus ?? 0)))
      .replace('{p}', formatNumber(Math.round(share * 100), getLocale()));
    at?.(text);
  };

  const onRoomClick = (event: PointerEvent): void => {
    // L'écran du jeu a été quitté (fondu fini) : ce composant ne sert plus (leftovers.ts). Pendant le fondu, il est encore
    // là, mais ne se clique plus.
    if (!root.isConnected) return retire();
    if (!book || leaving || modalOpen() || root.classList.contains('screen-out')) return;
    // Un bouton par-dessus garde son clic.
    if ((event.target as Element | null)?.closest('button, a, input, select, .modal-backdrop')) return;
    const box = room.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    if (!book.hit(x, y)) return;
    event.stopPropagation();
    event.preventDefault();
    // Attrapée (2e clic) : plus de main ni de liseré pendant qu'elle disparaît.
    if (struck >= 1) {
      room.classList.remove('hover');
      document.documentElement.classList.remove('mimic-hover');
    }
    const current = book;
    strike((text) =>
      current.vanish((cx, cy) => {
        // Par-dessus toute l'interface (le grand livre, les compteurs) : sur la page même.
        const box = room.getBoundingClientRect();
        spill(document.body, box.left + cx, box.top + cy, text);
        window.setTimeout(() => {
          current.destroy();
          if (book === current) book = null;
          leaving = false;
          struck = 0;
        }, 2500);
      }),
    );
  };
  window.addEventListener('pointerdown', onRoomClick, true);

  /** Survolée : la main (comme la lettre) et un liseré doré autour du livre, pour dire qu'elle s'attrape. */
  const hover = (on: boolean): void => {
    room.classList.toggle('hover', on);
    document.documentElement.classList.toggle('mimic-hover', on);
  };
  const onRoomMove = (event: PointerEvent): void => {
    // Comme le clic : l'écran du jeu quitté, l'écouteur part avec lui.
    if (!root.isConnected) return retire();
    const target = event.target as Element | null;
    const box = room.getBoundingClientRect();
    hover(
      book !== null &&
        !leaving &&
        !modalOpen() &&
        !root.classList.contains('screen-out') &&
        !target?.closest('button, a, input, select, .modal-backdrop') &&
        book.hit(event.clientX - box.left, event.clientY - box.top),
    );
  };
  window.addEventListener('pointermove', onRoomMove, { passive: true });
  // L'écran du jeu quitté : ses écouteurs, son livre et ses textures partent (au premier clic, ou à la mise à jour
  // suivante de l'écran d'après).
  const retire = leaveWith(root, () => {
    window.removeEventListener('pointerdown', onRoomClick, true);
    window.removeEventListener('pointermove', onRoomMove);
    clear();
    textures = null;
  });

  /** Les places de la salle affichée où le livre tient à l'écran, hors de l'interface. */
  const visibleSpots = (scene: string, view: ReturnType<typeof cover>): number[] => {
    const definition = SCENES.find((candidate) => candidate.id === scene);
    if (!definition) return [];
    return (MIMIC_SPOTS[scene] ?? []).flatMap((spot, index) => (screenBox(spotBox(spot, definition.vanishing), view) ? [index] : []));
  };

  const showRoom = (scene: string, index: number, view: ReturnType<typeof cover>): void => {
    const key = `${scene}:${index}`;
    const definition = SCENES.find((candidate) => candidate.id === scene)!;
    const spot = MIMIC_SPOTS[scene][index];
    if (!book || bookSpot !== key) {
      side?.destroy();
      side = null;
      book?.destroy();
      const box = spotBox(spot, definition.vanishing);
      const light =
        (MIMIC_LIGHT[scene] ?? 0.7) *
        shaderLight(((box.x0 + box.x1) / 2) * view.scale + view.left, ((box.y0 + box.y1) / 2) * view.scale + view.top);
      book = createMimicBook(textures!, spot, { vanishing: definition.vanishing, light });
      bookSpot = key;
      room.append(book.root);
      size = '';
    }
    const now = `${window.innerWidth}×${window.innerHeight}×${mimicSize()}`;
    if (size !== now) {
      size = now;
      Object.assign(room.style, {
        width: `${ROOM_IMAGE.w * view.scale}px`,
        height: `${ROOM_IMAGE.h * view.scale}px`,
        left: `${view.left}px`,
        top: `${view.top}px`,
      });
      book.place(view.scale);
    }
  };

  const showSide = (): void => {
    if (side) return;
    book?.destroy();
    book = null;
    bookSpot = null;
    side = createMimicSide(() =>
      strike((text) => {
        const current = side;
        current?.vanish(text);
        window.setTimeout(() => {
          current?.destroy();
          if (side === current) side = null;
          leaving = false;
          struck = 0;
        }, 2600);
      }),
    );
    root.append(side.root);
  };

  /** À la hauteur de la ruche des méthodes, au bord droit. */
  const placeSide = (): void => {
    side!.root.style.top = `${hiveTop()}px`;
  };

  const update = (): void => {
    sweepLeftovers();
    const now = Date.now();
    const seconds = Math.min(MAX_STEP, (now - last) / 1000);
    last = now;
    // Elle ne vient qu'à l'écran du jeu, visible, sans fenêtre ouverte, et pas en train de s'en aller.
    if (!document.hidden && !modalOpen() && root.isConnected && !root.classList.contains('screen-out')) {
      advanceMimic(state, seconds + hiddenSeconds);
      hiddenSeconds = 0;
    }
    if (leaving) return;
    if (!mimicHere(state)) {
      if (book || side) clear();
      return;
    }
    if (!textures || loading !== state.mimic.book) {
      if (loading !== state.mimic.book) {
        loading = state.mimic.book;
        textures = null;
        failed = false;
        const wanted = state.mimic.book;
        mimicTextures(wanted).then(
          (ready) => {
            if (loading === wanted) textures = ready;
          },
          (error: unknown) => {
            console.error('Textures de la Mimic indisponibles : elle reste au bord de l’écran.', error);
            if (loading === wanted) failed = true;
          },
        );
      }
      if (!textures && !failed) return;
    }
    const view = cover();
    const scene = shownScene();
    const visible = visibleSpots(scene, view);
    // Sa place, si on la voit dans la salle affichée ; sinon une autre, au hasard ; sinon le bord de l'écran.
    const [savedScene, savedIndex] = (state.mimic.spot ?? '').split(':');
    let index = savedScene === scene ? Number(savedIndex) : NaN;
    const [debugScene, debugIndex] = (debugPlace ?? '').split(':');
    if (debugPlace === 'side') index = NaN;
    else if (debugScene === scene && MIMIC_SPOTS[scene]?.[Number(debugIndex)]) index = Number(debugIndex);
    else if (!visible.includes(index)) {
      index = visible.length ? visible[Math.floor(Math.random() * visible.length)] : NaN;
      if (!Number.isNaN(index)) state.mimic.spot = `${scene}:${index}`;
    }
    if (Number.isNaN(index) || !textures) showSide();
    else showRoom(scene, index, view);
    const eye = mimicEyeLit(state);
    const snore = levelOf(state, 'lightSleep') > 0;
    const eaten = formatNumber(Math.floor(state.mimic.eaten), getLocale());
    if (book) book.show({ count: eye ? eaten : null, snore });
    if (side) {
      placeSide();
      // Sous l'icône, en court (« 1,2 M »), comme dans la maquette.
      const short = formatNumber(Math.floor(state.mimic.eaten), getLocale(), currentNotation() === 'babel' ? 'babel' : 'short');
      side.show({ count: eye ? short : null, eaten: eye ? writeDigits(eaten) : null, snore });
    }
  };
  return { root, update };
};
