import './rabbitHunt.css';
import { el } from '../../dom';
import { messages } from '../../../i18n';
import { openSpreadRect } from '../../book3d/openSpread';
import { BIG_BOOK_REWRITE } from '../../book3d/book3dBook';
import { CATCHES, catchRabbit, rabbitHome, rabbitRuns } from '../../../systems/rabbit';
import { SPRITE_HEIGHT, SPRITE_WIDTH, rabbitSprite } from './rabbitEngraving';
import type { GameState } from '../../../core/state';

/**
 * La chasse au Lapin blanc (maquette .ai/maquette-lapin-pages.html, « La chasse, à jouer ») : lu dans la
 * bibliothèque, à chaque double page qui s'ouvre, une chance sur quatre qu'il la traverse en bondissant, par-dessus
 * le livre (un élément de la page web posé sur la double page, openSpread.ts). Cliqué, il s'échappe en criant la
 * phrase d'Alice et reviendra plus vite ; manqué, il reviendra à la même vitesse. La troisième fois, il rentre dans
 * ses planches. Un clic qui le manque ne tourne pas la page ; une page tournée (flèches, clavier), le livre refermé,
 * la bibliothèque quittée : il disparaît.
 */

interface Speed {
  /** Durée de la traversée (ms). */
  cross: number;
  /** Bonds, s'il n'a pas de demi-tour. */
  hops: number;
  /** Un arrêt, assis, après tel bond, et sa durée (ms). */
  stop: [number, number] | null;
  /** Hauteur des bonds (part de la hauteur de la double page). */
  hop: number;
  /** Un bond en arrière en chemin. */
  turn: boolean;
}

/** Une vitesse par prise déjà faite : plus vite à chaque fois. */
const SPEEDS: readonly Speed[] = [
  { cross: 5200, hops: 8, stop: [3, 1100], hop: 0.08, turn: false },
  { cross: 3000, hops: 7, stop: [4, 380], hop: 0.1, turn: false },
  { cross: 1800, hops: 8, stop: null, hop: 0.12, turn: true },
];
/** Largeur du lapin, en part de la double page. */
const RABBIT_WIDTH = 0.13;
/** Au sol, il se tasse : cette part de chaque bond, avant de sauter. */
const CROUCH = 0.35;
/** Il arrive un peu après que la double page s'est posée. */
const DELAY_MS = [700, 2200];

const texts = () => messages().rareBooks.rabbit.hunt;

/** Les bonds d'une traversée : +1 en avant, -1 en arrière (le demi-tour de la troisième fois). */
const steps = (speed: Speed): number[] => (speed.turn ? [1, 1, 1, -1, 1, 1, 1, 1, 1] : Array<number>(speed.hops).fill(1));

/** La traversée en cours (une à la fois), ou celle qui attend son moment. */
let current: { stop: () => void } | null = null;

/** Le mot qui flotte un instant au-dessus de la page, en (x, y) de l'écran. */
const say = (line: string, x: number, y: number): void => {
  const node = el('div', 'rabbit-say', line);
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  document.body.append(node);
  window.setTimeout(() => node.classList.add('gone'), 900);
  window.setTimeout(() => node.remove(), 3000);
};

const run = (state: GameState): void => {
  const speed = SPEEDS[Math.min(state.rabbitCaught, CATCHES - 1)];
  const facing = Math.random() < 0.5 ? 1 : -1;
  const base = 0.35 + Math.random() * 0.35;
  const node = el('div', 'rabbit-runner');
  const picture = el('canvas');
  picture.width = SPRITE_WIDTH;
  picture.height = SPRITE_HEIGHT;
  picture.getContext('2d')!.drawImage(rabbitSprite(), 0, 0);
  node.append(picture);
  document.body.append(node);
  const path = steps(speed);
  const net = path.reduce((sum, step) => sum + step, 0);
  const hopMs = speed.cross / path.length;
  const start = performance.now();
  let frame = 0;
  let at = { x: 0, y: 0, width: 0 };
  // Manqué, le clic ne tourne pas la page non plus : elle l'emporterait avec elle (avant le livre, en capture).
  const missed = (event: PointerEvent): void => {
    const rect = openSpreadRect();
    if (node.contains(event.target as Node) || !rect) return;
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
    event.preventDefault();
    event.stopPropagation();
  };
  window.addEventListener('pointerdown', missed, { capture: true });
  const stop = (): void => {
    cancelAnimationFrame(frame);
    window.removeEventListener('pointerdown', missed, { capture: true });
    node.remove();
    if (current?.stop === stop) current = null;
  };
  current = { stop };
  const tick = (now: number): void => {
    const rect = openSpreadRect();
    // La page tournée, le livre refermé ou quitté : il n'est plus là.
    if (!rect) return stop();
    let time = now - start;
    let done = 0;
    let hop = 0;
    let within = -1;
    let resting = false;
    for (; hop < path.length; hop++) {
      if (time < hopMs) {
        within = time / hopMs;
        break;
      }
      time -= hopMs;
      done += path[hop];
      if (speed.stop && speed.stop[0] === hop) {
        if (time < speed.stop[1]) {
          resting = true;
          break;
        }
        time -= speed.stop[1];
      }
    }
    if (!resting && within < 0) return stop();
    const air = resting || within < CROUCH ? 0 : (within - CROUCH) / (1 - CROUCH);
    const step = resting ? 0 : path[hop];
    const progress = (done + step * air) / net;
    const lift = Math.sin(air * Math.PI) * speed.hop;
    const width = rect.width * RABBIT_WIDTH;
    const travel = rect.width + width;
    const x = facing > 0 ? rect.left - width + progress * travel : rect.right - progress * travel;
    const y = rect.top + (base - lift) * rect.height;
    const crouch = !resting && within < CROUCH ? 1 - Math.sin((within / CROUCH) * Math.PI) * 0.1 : 1;
    const twitch = resting ? 1 + Math.sin(now / 70) * 0.015 : 1;
    const tilt = air > 0 ? (0.5 - air) * -0.35 : 0;
    node.style.width = `${width}px`;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    node.style.transform = `scaleX(${(resting ? 1 : step) * facing}) rotate(${tilt}rad) scale(${2 - crouch}, ${crouch * twitch})`;
    at = { x, y: rect.top + base * rect.height, width };
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  // Attrapé (le clic ne va pas au livre derrière : la page ne tourne pas).
  node.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    cancelAnimationFrame(frame);
    window.removeEventListener('pointerdown', missed, { capture: true });
    if (current?.stop === stop) current = null;
    catchRabbit(state);
    if (!rabbitHome(state)) {
      say(texts().say, at.x + at.width / 2, at.y - at.width * 0.4);
      // Il s'échappe d'un grand bond, hors de la page.
      node.classList.add('escaping');
      node.style.left = `${window.innerWidth + at.width}px`;
      node.style.top = `${at.y - at.width * 0.8}px`;
      node.style.transform = 'scaleX(1)';
      window.setTimeout(() => node.remove(), 400);
      return;
    }
    // La troisième fois : il s'arrête, et rentre dans ses planches (elles se redessinent avec lui).
    const rect = openSpreadRect();
    say(texts().home, rect ? rect.left + rect.width / 2 : window.innerWidth / 2, rect ? rect.top + rect.height * 0.1 : 40);
    node.classList.add('going-home');
    node.style.transform += ' scale(0.4)';
    window.setTimeout(() => {
      node.remove();
      window.dispatchEvent(new Event(BIG_BOOK_REWRITE));
    }, 2400);
  });
};

/**
 * Une double page s'est posée sous les yeux (`page` : sa page de droite) : la traversée d'avant s'arrête, et peut-être
 * qu'il passe sur celle-ci.
 */
export const rabbitMayCross = (state: GameState, page: number): void => {
  current?.stop();
  if (!rabbitRuns(state, page, Math.random())) return;
  const timer = window.setTimeout(
    () => {
      if (current?.stop === cancel) current = null;
      if (openSpreadRect()) run(state);
    },
    DELAY_MS[0] + Math.random() * (DELAY_MS[1] - DELAY_MS[0]),
  );
  const cancel = (): void => {
    window.clearTimeout(timer);
    if (current?.stop === cancel) current = null;
  };
  current = { stop: cancel };
};

/** Débogage : il traverse tout de suite la double page ouverte (s'il n'est pas rentré). */
export const rabbitCrossNow = (state: GameState): void => {
  current?.stop();
  if (!rabbitHome(state) && openSpreadRect()) run(state);
};
