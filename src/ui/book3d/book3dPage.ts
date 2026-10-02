import './book3d.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { el, type Component } from '../dom';
import { t } from '../../i18n';
import { createBookMesh } from './bookMesh';
import { PAGE_TEXTURE } from '../book/pageLayout';
import { createPageCache } from './pageCache';
import { spreadCount } from './pageSource';
import { createTurner, type Turner } from './turner';
import { attachBookGesture } from './bookGesture';
import { createLighting } from './lighting';
import { createReadingView } from './readingView';
import { createBookRenderer } from './renderer3d';
import { createAutoTurn3d } from './autoTurn3d';
import { isDebugEnabled } from '../../debug/enabled';
import { BIG_BOOK_REWRITE, type Book3d } from './book3dBook';
import { createFlight, takeFlight, type Flight } from './bookFlight';
import { modalOpen } from '../modal/modal';

/** Durée de l'ouverture de la couverture. */
const OPEN_MS = 1100;

/** Pages qui suivent la partie : redessinées à ce rythme, livre posé. */
const LIVE_MS = 1000;

/**
 * Un grand livre en vraie 3D (Three.js) : le livre étrange (#livre), le livre blanc (#blanc).
 * Fermé, on le fait tourner à la souris ; ouvert, on le lit, caméra bloquée, en tournant ses pages à la main.
 */
export const createBook3dPage = (spec: Book3d, onBack: () => void, backLabel = t('ui.back')): Component => {
  const root = el('main', 'book3d-page');
  const back = el('button', 'options-back', `← ${backLabel}`);
  back.addEventListener('click', () => leave());
  // Le canvas dans son cadre : pendant le vol depuis la pile, il en sort pour couvrir la fenêtre.
  const stage = el('div', 'book3d-stage');
  const canvas = el('canvas', 'book3d-canvas');
  stage.append(canvas);
  const open = el('input');
  open.type = 'range';
  open.min = '0';
  open.max = '1';
  open.step = '0.01';
  open.value = '0';
  // Avancement : quelle double page est ouverte (0 : la page de titre).
  const { shape, source } = spec;
  const spreads = spreadCount(source);
  const spread = el('input');
  spread.type = 'range';
  spread.min = '0';
  spread.max = String(spreads - 1);
  spread.step = '1';
  spread.value = '0';
  // Vues toutes faites : de biais (livre fermé), de dessus (lire), de face à hauteur de table (la reliure
  // sous le pli, comme un livre posé devant soi), par la tête (le profil, pour juger la courbure).
  const views: [string, THREE.Vector3Tuple, THREE.Vector3Tuple][] = [
    ['Biais', [1.7, -0.7, 1.9], [0, 1, 0]],
    ['Dessus', [0, -0.35, 2.4], [0, 1, 0]],
    ['Face', [0, -1.9, 0.55], [0, 0, 1]],
    ['Tête', [0, -2.6, 0.02], [0, 0, 1]],
  ];
  const viewButtons = views.map(([label, position, up]) => {
    const button = el('button', undefined, label);
    button.addEventListener('click', () => {
      camera.up.set(...up);
      camera.position.set(...position);
      controls.target.set(0, 0, 0);
      controls.update();
      invalidate();
    });
    return button;
  });
  const previous = el('button', undefined, '‹');
  const next = el('button', undefined, '›');
  previous.setAttribute('aria-label', t('ui.previousPage'));
  next.setAttribute('aria-label', t('ui.nextPage'));
  const arrows = el('div', 'book3d-arrows');
  arrows.append(previous, next);
  // Les flèches, en option ; les réglages du modèle (ouverture, double page, vues) seulement en débogage.
  const controls_ = el('div', 'book3d-controls');
  // Débogage : le livre remis comme à l'arrivée (fermé, première page, vu de biais).
  const reset = el('button', undefined, 'Remise à zéro');
  if (isDebugEnabled()) controls_.append(open, arrows, spread, ...viewButtons, reset);
  else controls_.append(arrows);
  root.append(back, stage, controls_);

  /**
   * Milieu du livre fermé, autour duquel on le fait tourner : fermé sur sa couverture, il est posé à droite
   * du dos ; refermé sur son dos (après la dernière page), à gauche.
   */
  const closedOn = (side: 'front' | 'back'): THREE.Vector3 => new THREE.Vector3(((side === 'front' ? 1 : -1) * shape.width) / 2, 0, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
  const { renderer, resize, destroy } = createBookRenderer(canvas, camera);
  /** Vie de la page : quand elle quitte l'écran, tous ses écouteurs sont retirés d'un coup. */
  const lifetime = new AbortController();
  const { signal } = lifetime;
  // Le compromis : un peu au-dessus et à droite du livre, qui montre sa tranche du bas et de côté.
  camera.position.set(1.7, -0.7, 1.9);
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(closedOn('front'));
  controls.enableDamping = true;
  const view = createReadingView(camera, controls);

  // Lumières réglées pour la vue de biais, autour du livre.
  const lighting = createLighting(scene, new THREE.Vector3(1.7, -0.7, 1.9), new THREE.Vector3(0.4, 0, 0));

  // Rendu à la demande : l'image n'est refaite que si quelque chose a changé (page qui tourne, plat qui
  // pivote, caméra, taille, pages redessinées). Livre posé, la carte graphique se repose.
  let dirty = true;
  const invalidate = (): void => {
    dirty = true;
  };
  let book: ReturnType<typeof createBookMesh> | null = null;
  /** Ouvert depuis la pile de l'en-tête : le livre en vient, il glisse vers le lecteur en grandissant. */
  const flightStart = takeFlight();
  let flight: Flight | null = null;
  /** Retour au jeu, livre venu de la pile : ouvert comme il l'était au départ, il se referme en y retournant. */
  let homing: { open: number; shut: number } | null = null;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  /**
   * « Retour » : le jeu revient tout de suite (en fondu, comme à l'aller), pendant que le livre venu de la
   * pile y retourne (le vol à l'envers) ; la page reste le temps du vol, puis s'en va (classe homing :
   * l'écran ne l'efface pas, voir app.ts).
   */
  const leave = (): void => {
    if (homing) return;
    if (!flightStart || !book || still.matches) return onBack();
    homing = { open: Number(open.value), shut };
    controls.enabled = false;
    root.classList.remove('arriving');
    root.classList.add('leaving', 'homing');
    canvas.classList.add('flying');
    // Retour en pleine arrivée : le vol d'aller est abandonné, celui du retour part de là où il en était.
    flight?.stop();
    flight = createFlight(flightStart, book.root, camera, stage.getBoundingClientRect(), true);
    onBack();
  };
  if (flightStart) root.classList.add('arriving');
  let turner: Turner | null = null;
  /** Les pages ont changé (partie, sceau survolé, note au crayon) : redessinées, puis montrées. */
  const refresh = (): void => {
    turner?.refresh();
    invalidate();
  };
  void spec.look().then((look) => {
    book = createBookMesh(shape, look);
    scene.add(book.root);
    if (flightStart && root.isConnected) {
      controls.update();
      const frame = stage.getBoundingClientRect();
      canvas.classList.add('flying');
      flight = createFlight(flightStart, book.root, camera, frame);
    }
    turner = createTurner(book, createPageCache(source), spreads, (landed) => {
      spec.passed?.(2 * landed);
      spec.passed?.(2 * landed + 1);
    });
    // Entrée du sommaire : les pages tournent jusqu'à la double page qui porte la page visée.
    spec.navigate = (index) => turner?.go(Math.floor(index / 2));
    if (spec.bookmark !== undefined)
      book.setRibbon(spreads > 1 ? Math.floor(spec.bookmark / 2) / (spreads - 1) : 0, spreads > 1 ? 1 / (spreads - 1) : 1);
    // Débogage : accès au livre depuis la console (?debug seulement).
    if (isDebugEnabled()) (window as unknown as { book3d?: unknown }).book3d = { book, turner, camera, controls, invalidate };
    invalidate();
  });
  let swinging = false;
  /** Le lecteur appuie sur le livre ouvert (page tenue) : les pages ne tournent pas seules. */
  let grabbing = false;
  const autoTurn = spec.autoTurn ? createAutoTurn3d(spec.autoTurn) : null;
  /** Plat arrière refermé sur les pages, en fin de livre (0 : ouvert, 1 : fermé). */
  let shut = 0;
  /**
   * Ouvre (ou referme) la couverture, ou le plat arrière en fin de livre, de là où il en est. `flip` :
   * refermé sur son dos, le livre se retourne sur sa couverture (les deux plats ensemble, livre fermé
   * d'un bloc), puis revient au début.
   */
  const swing = (board: 'front' | 'back' | 'flip', target: number): void => {
    const from = board === 'back' ? shut : Number(open.value);
    // Le livre s'ouvre (couverture, ou plat arrière qui se relève) : la caméra rejoint la vue de lecture
    // et s'y bloque ; il se referme : elle garde son angle et glisse jusqu'au milieu du livre fermé, autour
    // duquel il tourne ensuite, puis redevient libre.
    view.begin(board === 'front' ? target === 1 : board === 'back' && target === 0, closedOn(board === 'back' ? 'back' : 'front'));
    const start = performance.now();
    const duration = OPEN_MS * Math.abs(target - from);
    swinging = true;
    const step = (now: number): void => {
      const t = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
      const eased = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      const value = from + (target - from) * eased;
      if (board !== 'back') {
        open.value = String(value);
        book?.setOpen(value);
      }
      if (board !== 'front') {
        shut = value;
        book?.setShut(value);
      }
      view.step(eased);
      invalidate();
      if (t < 1) return void requestAnimationFrame(step);
      if (board === 'flip') turner?.jump(0);
      swinging = false;
      if (board === 'back' && target === 1) spec.finished?.();
    };
    requestAnimationFrame(step);
  };
  /** Retour au signet (le sommaire), livre ouvert : toutes les pages tournent jusqu'à lui. */
  const backToBookmark = (): void => {
    if (!turner || spec.bookmark === undefined || swinging || shut > 0 || Number(open.value) < 1) return;
    turner.go(Math.floor(spec.bookmark / 2));
  };
  /** Tourne une page de plus (ou de moins) ; des clics rapides s'enchaînent en feuilletage. */
  const turn = (forward: boolean): void => {
    if (!turner || swinging || flight) return;
    // Livre refermé sur son dos : en avant, il se retourne sur sa couverture (fermé) ; en arrière, il se
    // rouvre à la fin.
    if (shut > 0) return forward ? swing('flip', 0) : swing('back', 0);
    // Livre fermé (ou entrouvert) : la flèche ouvre d'abord la couverture ; revenue à la première double
    // page, revenir en arrière la referme. À la dernière, avancer referme le plat arrière.
    const opening = Number(open.value);
    if (forward && opening < 1) return spec.sealed ? spec.sealed() : swing('front', 1);
    if (!forward && turner.target === 0 && opening > 0) return swing('front', 0);
    if (forward && turner.target === spreads - 1) return turner.idle ? swing('back', 1) : undefined;
    turner.go(turner.target + (forward ? 1 : -1));
    spread.value = String(turner.target);
  };
  attachBookGesture({
    canvas,
    camera,
    book: () => book?.root ?? null,
    turner: () => turner,
    spreads,
    width: shape.width,
    height: shape.height,
    open: () => !swinging && shut === 0 && Number(open.value) === 1,
    // Livre fermé, d'un côté ou de l'autre : un clic n'importe où sur lui l'ouvre.
    step: (forward) => turn(shut > 0 ? false : Number(open.value) === 0 ? true : forward),
    busy: (on) => {
      grabbing = on;
      controls.enabled = !on && !view.locked;
    },
    hover: (hit) => {
      if (hit && book?.isRibbon(hit.object)) return void (canvas.style.cursor = 'pointer');
      const page = hit ? book?.pageUnder(hit) : null;
      if (!page || !turner?.idle || !view.locked) return void (canvas.style.cursor = '');
      const [index, x, y] = [
        2 * turner.target + (page.side === 'right' ? 1 : 0),
        page.u * PAGE_TEXTURE.width,
        page.v * PAGE_TEXTURE.height,
      ];
      canvas.style.cursor = spec.pointable?.(index, x, y) ? 'pointer' : '';
      if (spec.hover?.(index, x, y)) refresh();
    },
    press: (hit) => {
      // Le signet : les pages tournent jusqu'au sommaire.
      if (book?.isRibbon(hit.object) && spec.bookmark !== undefined) {
        backToBookmark();
        return true;
      }
      const page = book?.pageUnder(hit);
      if (!page || !turner?.idle || !spec.press) return false;
      const index = 2 * turner.target + (page.side === 'right' ? 1 : 0);
      if (!spec.press(index, page.u * PAGE_TEXTURE.width, page.v * PAGE_TEXTURE.height)) return false;
      // La page a pu changer (légende d'un sceau, note au crayon) : redessinée.
      refresh();
      return true;
    },
    signal,
  });
  previous.addEventListener('click', () => turn(false));
  next.addEventListener('click', () => turn(true));
  const onKey = (event: KeyboardEvent): void => {
    // Un récit s'affiche par-dessus : le livre derrière ne tourne pas ses pages.
    if (modalOpen()) return;
    if (event.key === 'ArrowRight') turn(true);
    if (event.key === 'ArrowLeft') turn(false);
    if (event.key === 'Home') backToBookmark();
  };
  window.addEventListener('keydown', onKey, { signal });
  open.addEventListener('input', () => {
    if (spec.sealed) {
      open.value = '0';
      return spec.sealed();
    }
    book?.setOpen(Number(open.value));
    invalidate();
  });
  spread.addEventListener('input', () => turner?.go(Number(spread.value)));
  reset.addEventListener('click', () => {
    if (!book || !turner || swinging || flight) return;
    turner.jump(0);
    spread.value = '0';
    open.value = '0';
    book.setOpen(0);
    shut = 0;
    book.setShut(0);
    // La caméra libérée, revenue à sa place de départ.
    view.begin(false, closedOn('front'));
    view.step(1);
    camera.up.set(0, 1, 0);
    camera.position.set(1.7, -0.7, 1.9);
    controls.target.copy(closedOn('front'));
    controls.update();
    shownSpread = null;
    invalidate();
  });

  // Pages qui suivent la partie : redessinées de temps en temps, jamais pendant qu'une page tourne.
  if (spec.live) {
    const timer = window.setInterval(() => {
      if (turner?.idle && Number(open.value) === 1 && shut === 0) refresh();
    }, LIVE_MS);
    signal.addEventListener('abort', () => window.clearInterval(timer));
  }
  /** Double page déjà signalée comme vue (null : aucune, ou livre fermé). */
  let shownSpread: number | null = null;
  // Contenu réécrit (débogage…) : les pages se refont, le livre reste ouvert à la même double page.
  const rewrite = (): void => {
    spec.rewrite?.();
    shownSpread = null;
    refresh();
  };
  window.addEventListener(BIG_BOOK_REWRITE, rewrite, { signal });
  /** Livre posé, ouvert sur une double page : ses deux pages arrivent sous les yeux (une fois). */
  const notifyShown = (): void => {
    const settled = turner?.idle && !swinging && shut === 0 && Number(open.value) === 1;
    if (!turner || !settled) {
      if (!swinging && Number(open.value) === 0) shownSpread = null;
      return;
    }
    if (shownSpread === turner.target || !spec.shown) return;
    shownSpread = turner.target;
    spec.shown(2 * shownSpread);
    spec.shown(2 * shownSpread + 1);
    // Une planche vue éteint ses étoiles de nouveauté : la double page est redessinée.
    refresh();
  };
  /** Le dos du livre fermé a déjà été vu (backSeen). */
  let backSeen = false;
  /** Point de vue par rapport au livre (de la cible vers la caméra), pour savoir quelle face on regarde. */
  const eye = new THREE.Vector3();
  /**
   * Livre fermé, posé : on regarde son dos de face (à 60° près) ? Fermé sur sa couverture, le dos
   * regarde -z ; refermé sur son dos (après la dernière page), le livre s'est retourné, il regarde +z.
   */
  const notifyBackSeen = (): void => {
    if (backSeen || !spec.backSeen || swinging) return;
    const onCover = Number(open.value) === 0 && shut === 0;
    if (!onCover && shut !== 1) return;
    eye.subVectors(camera.position, controls.target).normalize();
    if ((onCover ? -eye.z : eye.z) < 0.5) return;
    backSeen = true;
    spec.backSeen();
  };
  let before = performance.now();
  /** Des pages tournaient à l'image d'avant : la dernière, celle où elles se posent, est encore à montrer. */
  let turning = false;
  const frame = (now: number): void => {
    // Page quittée : écouteurs retirés, livre et contexte WebGL libérés tout de suite.
    if (!root.isConnected) {
      // Quittée en plein vol (bouton précédent du navigateur) : la pile n'attend plus ce livre.
      flight?.stop();
      lifetime.abort();
      controls.dispose();
      turner?.dispose();
      destroy(scene);
      return;
    }
    const dt = Math.min(0.05, (now - before) / 1000);
    if (autoTurn && turner)
      autoTurn(dt, turner, spreads - 1, !swinging && !grabbing && !modalOpen() && shut === 0 && Number(open.value) === 1);
    const moving = turner?.update(dt) ?? false;
    notifyShown();
    // Page prise à la main et lâchée : le curseur suit la double page où le livre s'arrête.
    if (turner && document.activeElement !== spread) spread.value = String(turner.target);
    before = now;
    let resized = resize();
    if (flight) {
      const flying = flight.step(now);
      // En retournant à la pile, le livre se referme.
      if (homing) {
        open.value = String(homing.open * flight.amount);
        book?.setOpen(homing.open * flight.amount);
        book?.setShut(homing.shut * flight.amount);
        if (!flying) {
          flight = null;
          root.remove();
        }
      } else if (!flying) {
        // Posé : le canvas reprend son cadre, la caméra sa vue ordinaire.
        flight = null;
        canvas.classList.remove('flying');
        resized = resize();
      }
    }
    // Caméra qu'on fait tourner, ou qui finit sur son élan.
    // Pendant le vol, la caméra ne bouge pas (sur son élan, elle décalerait le point d'arrivée).
    const orbiting = !flight && !homing && controls.update();
    notifyBackSeen();
    if (spec.tick?.(now)) dirty = true;
    if (moving || turning || resized || orbiting || dirty || flight) {
      // Livre fermé (d'un côté ou de l'autre), on le fait tourner : la lumière suit la face qu'on regarde.
      // Fermé : les deux plats l'un sur l'autre (couverture fermée, ou plat arrière refermé sur elle).
      lighting.follow(camera, controls.target, 1 - (Number(open.value) - shut));
      renderer.render(scene, camera);
      dirty = false;
    }
    turning = moving;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return { root, update: () => {} };
};
