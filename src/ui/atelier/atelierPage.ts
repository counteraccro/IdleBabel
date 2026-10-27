import './atelier.css';
import '@fontsource/special-elite/400.css';
import '@fontsource/caveat/400.css';
import '@fontsource/caveat/600.css';
import '@fontsource/cinzel/600.css';
import * as THREE from 'three';
import { el, type Component } from '../dom';
import { t } from '../../i18n';
import { createBookRenderer } from '../book3d/renderer3d';
import { createLighting } from '../book3d/lighting';
import { relicEnvironment } from '../relics/relicModels';
import { animationNow } from '../animationClock';
import type { PieceId } from '../../data/curiosities';
import { atelierNotes, bookState, visitAtelier, type AtelierNote } from '../../systems/curiosities';
import { pulpPercent } from '../../systems/curiosityPulp';
import { createFurniture, CART_X, LECTERN_X, type Pick } from './atelierFurniture';
import { createAtelierBooks } from './atelierBooks';
import { createPieceTextures } from './atelierPaper';
import { cardAction, cardHtml, type CardChoice } from './atelierCard';
import { notebookAction, notebookHtml, pulpHtml, pulpKeep, pulpOne, scrapHtml } from './atelierSheets';
import { at, bookName, partLong, partName, rankName, setTitle, stateName } from './atelierText';
import type { CuriosityPiece, GameState, PressJob } from '../../core/state';

/**
 * L'atelier des curiosités (#atelier, ouvert par la clé de l'atelier du trousseau) : la maquette validée reproduite à
 * l'identique (.ai/maquette-atelier-interface.html, mêmes mesures, l'auteur, 26/10 : « je valide la maquette »), dans le
 * noir comme la bibliothèque. À gauche le chariot, au milieu l'établi, à droite le lutrin ; tout se fait au clic dans la scène.
 * Un livre cliqué s'ouvre à plat sur le pupitre, la vue glisse vers l'établi et sa fiche de catalogue sort à gauche.
 */

const VIEWS = {
  atelier: { center: new THREE.Vector3(0, 1.88, 0), tall: 1.98, wide: 3.85 },
};
const GLIDE = 900;

/** « +1 page de réemploi », « +4 pages de réemploi ». */
const pagesText = (n: number): string => (n === 1 ? at('log.pagesOne') : at('log.pages', { n }));

/** Ce que dit la ligne discrète sous la scène. */
const noteText = (note: AtelierNote): string => {
  switch (note.kind) {
    case 'arrived':
      return at(note.s ? 'log.arrivedS' : 'log.arrived', { r: rankName(note.rank) });
    case 'scrapped':
      return at('log.scrapped', { r: rankName(note.rank), pages: pagesText(note.pages) });
    case 'cartFull':
      return at('log.cartFull', { r: rankName(note.rank), pages: pagesText(note.pages) });
    case 'destroyed': {
      const rest = [
        note.lost ? at('log.lost', { n: note.lost }) : '',
        note.damaged ? at('log.damaged', { n: note.damaged }) : '',
        note.sKept ? at('log.sKept') : '',
        note.sLost ? at('log.sLost') : '',
      ].join('');
      return at('log.destroyed', { r: rankName(note.rank), pages: pagesText(note.pages), rest });
    }
    case 'mounted':
      return at('log.mounted', { part: partName(note.part), state: stateName(note.to) });
    case 'restored':
      return at('log.restored', { part: partName(note.part), state: stateName(note.to) });
    case 'setMounted':
      return at('log.setMounted', { title: setTitle(note.set) });
  }
};

export const createAtelierPage = (state: GameState, onBack: () => void): Component => {
  visitAtelier(state);
  const root = el('main', 'atelier-page');
  const back = el('button', 'options-back', `← ${t('ui.back')}`);
  back.addEventListener('click', onBack);
  const stage = el('div', 'atelier-stage');
  const canvas = el('canvas', 'atelier-canvas');
  const tip = el('div', 'atelier-tip');
  const card = el('div', 'atelier-card');
  const sheet = (inner: string) => {
    const outer = el('div', 'atelier-sheet');
    const paper = el('div', inner);
    outer.append(paper);
    outer.addEventListener('click', (event) => {
      if (event.target === outer) close(outer);
    });
    return { outer, paper };
  };
  const notebook = sheet('atelier-notebook');
  const scrap = sheet('atelier-paper');
  const pulp = sheet('atelier-paper');
  const log = el('div', 'atelier-log');
  stage.append(canvas, tip, card, notebook.outer, scrap.outer, pulp.outer);
  root.append(back, stage, log);

  let dirty = true;
  const redraw = (): void => {
    dirty = true;
  };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  const { renderer, resize, destroy } = createBookRenderer(canvas, camera);
  scene.environment = relicEnvironment(renderer);
  scene.environmentIntensity = 0.25;
  const textures = createPieceTextures();
  const furniture = createFurniture(scene, redraw);
  const books = createAtelierBooks(scene, furniture, textures);

  // Lumières (comme la vitrine), et la caméra : l'atelier entier, ou l'établi (la fiche à gauche).
  const lighting = createLighting(scene, new THREE.Vector3(1.7, -0.7, 1.9), new THREE.Vector3(0.4, 0, 0));
  const shadowLamp = scene.getObjectsByProperty('isDirectionalLight', true).find((light) => light.castShadow) as THREE.DirectionalLight;
  Object.assign(shadowLamp.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, far: 40 });
  shadowLamp.shadow.camera.updateProjectionMatrix();
  const spot = (intensity: number, distance: number, angle: number, penumbra: number, from: THREE.Vector3, to: THREE.Vector3): void => {
    const light = new THREE.SpotLight(0xffd9a0, intensity, distance, THREE.MathUtils.degToRad(angle), penumbra, from.y > 4 ? 1.5 : 1.6);
    light.position.copy(from);
    light.target.position.copy(to);
    scene.add(light, light.target);
  };
  const lamp = new THREE.SpotLight(0xffd9a0, 22, 14, THREE.MathUtils.degToRad(48), 0.6, 1.4);
  lamp.position.set(0, 5.2, 3.2);
  lamp.target.position.set(0, 1.6, 0);
  scene.add(lamp, lamp.target);
  spot(9, 6, 55, 0.7, new THREE.Vector3(0.9, 3.35, 0.2), new THREE.Vector3(-0.3, 1.2, 0.1));
  for (const x of [CART_X, LECTERN_X]) spot(10, 9, 30, 0.7, new THREE.Vector3(x, 4.6, 2.4), new THREE.Vector3(x, 1.3, 0));
  // Toute la pièce baissée (les lampes du lutrin, éteintes ici, s'allument plus tard à leur pleine force, comme la maquette).
  scene.traverse((object) => {
    if (object instanceof THREE.Light) object.intensity *= 0.6;
  });

  type View = { center: THREE.Vector3; tall: number; wide: number };
  const viewOf = (name: 'atelier' | 'bench'): View => {
    if (name === 'atelier') return VIEWS.atelier;
    // L'établi de -2,15 à 2,15, la fiche couvre la gauche du cadre (sa largeur à l'écran, en unités de la scène).
    const share = Math.min(0.42, 360 / Math.max(1, canvas.clientWidth));
    const wide = 4.3 / (1 - share) / 2;
    return { center: new THREE.Vector3(2.2 - wide, 1.9, 0), tall: 1.82, wide };
  };
  const target = (name: 'atelier' | 'bench') => {
    const v = viewOf(name);
    const half = THREE.MathUtils.degToRad(camera.fov / 2);
    const distance = Math.max(v.tall / Math.tan(half), v.wide / (Math.tan(half) * camera.aspect)) + 0.6;
    return { center: v.center, position: new THREE.Vector3(v.center.x, v.center.y + 0.15, v.center.z + distance) };
  };
  type Shot = ReturnType<typeof target>;
  let view: 'atelier' | 'bench' = 'atelier';
  let glide: { from: Shot; to: Shot; start: number } | null = null;
  const aim = (to: Shot, k: number, from = to): void => {
    const look = from.center.clone().lerp(to.center, k);
    camera.position.copy(from.position).lerp(to.position, k);
    camera.lookAt(look);
    camera.updateMatrixWorld();
    lighting.follow(camera, look, 1);
    const rig = shadowLamp.parent!;
    rig.updateMatrixWorld(true);
    shadowLamp.position.copy(rig.worldToLocal(look.clone().addScaledVector(new THREE.Vector3(-0.3, 1, 1).normalize(), 8)));
    shadowLamp.target.position.copy(rig.worldToLocal(look.clone()));
    dirty = true;
  };
  const go = (name: 'atelier' | 'bench'): void => {
    if (view === name) return;
    glide = { from: target(view), to: target(name), start: animationNow() };
    view = name;
  };

  // Ce que le joueur a choisi : le livre sur le pupitre, sa pièce, la question de le détruire ; la pièce du carnet.
  let choice: CardChoice = { book: null, part: null, confirm: false };
  let chosen: [number, PieceId] | null = null;
  const close = (outer: HTMLElement): void => {
    outer.classList.remove('open');
    if (outer === notebook.outer) chosen = null;
    refresh();
  };

  /** La pièce que tient une presse : celle du tiroir qu'on remonte, ou la pièce S qu'on restaure. */
  const jobPiece = (job: PressJob): CuriosityPiece | undefined => {
    if (job.kind === 'mount') return job.piece;
    if (job.carnet !== undefined) return state.atelier.notebook[job.carnet]?.[job.part];
    return state.atelier.books.find((book) => book.id === job.book)?.parts[job.part];
  };

  /** Ce que montre la scène : relu dix fois par seconde, tout est redessiné quand il change. */
  const signature = (now: number): string =>
    JSON.stringify([
      state.atelier.books,
      state.atelier.drawers,
      state.atelier.reserve,
      state.atelier.pulp,
      state.atelier.scrap,
      state.atelier.notebook,
      state.atelier.jobs.map((job) => [job.book, job.carnet, job.part, job.to, Math.ceil((job.end - now) / 60_000)]),
      state.etherium.length,
      choice.book?.id,
      choice.part,
      choice.confirm,
      chosen,
      t('atelier.name'),
    ]);
  let shown = '';
  const refresh = (): void => {
    const now = Date.now();
    if (choice.book && !state.atelier.books.includes(choice.book)) choice = { book: null, part: null, confirm: false };
    const sign = signature(now);
    if (sign === shown) return;
    shown = sign;
    books.build(state, choice.book, animationNow());
    books.unfold(state, choice.book, choice.part);
    card.classList.toggle('open', !!choice.book);
    if (choice.book) card.innerHTML = cardHtml(state, choice, now);
    if (notebook.outer.classList.contains('open')) notebook.paper.innerHTML = notebookHtml(state, choice.book, chosen, now);
    furniture.drawIdle();
    furniture.drawNotebook();
    furniture.drawDrawers(state);
    furniture.drawPresses(state, textures.piece, jobPiece, now);
    furniture.drawPile(state);
    furniture.drawPulp(state);
    furniture.drawScrap(state);
    furniture.drawTotal(state);
    log.textContent = atelierNotes().map(noteText).join(' · ');
    back.textContent = `← ${t('ui.back')}`;
    dirty = true;
  };

  card.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const item = target.closest<HTMLElement>('li[data-part]');
    if (item) {
      const part = item.dataset.part as PieceId;
      choice = { ...choice, part: choice.part === part ? null : part, confirm: false };
      return refresh();
    }
    const button = target.closest<HTMLElement>('[data-a]');
    if (!button || (button as HTMLButtonElement).disabled) return;
    choice = cardAction(state, choice, button.dataset.a!, Number(button.dataset.to ?? 0), Date.now());
    if (!choice.book) go('atelier');
    refresh();
  });
  notebook.paper.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-c]');
    if (!target || (target as HTMLButtonElement).disabled) return;
    const result = notebookAction(state, target, choice.book, chosen, Date.now());
    chosen = result.chosen;
    if (result.close) close(notebook.outer);
    shown = '';
    refresh();
  });
  scrap.paper.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).dataset.f !== 'ok') return;
    const value = (name: string): number => Number(scrap.paper.querySelector<HTMLSelectElement>(`[data-f="${name}"]`)!.value);
    state.atelier.scrap = { rank: value('rank'), state: value('state') };
    close(scrap.outer);
  });
  pulp.paper.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.dataset.s !== undefined && !(target as HTMLButtonElement).disabled) {
      pulpOne(state, Number(target.dataset.s));
      pulp.paper.innerHTML = pulpHtml(state);
      return refresh();
    }
    if (target.dataset.f !== 'ok') return;
    pulpKeep(state, Number(pulp.paper.querySelector<HTMLSelectElement>('[data-f="keep"]')!.value));
    close(pulp.outer);
  });

  // Les clics dans la scène.
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hitAt = (event: MouseEvent): Pick | null => {
    const box = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1);
    scene.updateMatrixWorld();
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster
      .intersectObjects([books.group, furniture.unfolded, ...furniture.pickables], true)
      .find((candidate) => candidate.object.userData.pick);
    return (hit?.object.userData.pick as Pick | undefined) ?? null;
  };
  const tipText = (pick: Pick | null): string => {
    if (!pick) return '';
    if (pick.kind === 'book') {
      const book = state.atelier.books.find((candidate) => candidate.id === pick.id);
      if (!book) return '';
      const text = at('tips.book', { name: bookName(book), rank: rankName(book.rank), state: stateName(bookState(book)) });
      return book.locked ? `${text} · ${at('tips.locked')}` : text;
    }
    if (pick.kind === 'drawer')
      return at('tips.drawer', {
        part: partName(pick.part),
        state: stateName(pick.state),
        n: state.atelier.drawers[pick.part][pick.state],
      });
    if (pick.kind === 'piece' && choice.book)
      return at('tips.piece', { part: partLong(pick.part), state: stateName(choice.book.parts[pick.part].state) });
    if (pick.kind === 'notebook') return at('tips.notebook');
    if (pick.kind === 'scrap') return at('tips.scrap');
    if (pick.kind === 'pulp') return at('tips.pulp', { n: pulpPercent(state) });
    return '';
  };
  canvas.addEventListener('pointermove', (event) => {
    const pick = hitAt(event);
    canvas.style.cursor = pick ? 'pointer' : '';
    const text = tipText(pick);
    tip.style.display = text ? 'block' : 'none';
    if (!text) return;
    tip.textContent = text;
    const box = stage.getBoundingClientRect();
    tip.style.left = `${event.clientX - box.left + 14}px`;
    tip.style.top = `${event.clientY - box.top + 12}px`;
  });
  canvas.addEventListener('pointerleave', () => (tip.style.display = 'none'));
  /** Un tiroir cliqué s'ouvre un instant. */
  const opening: { drawer: (typeof furniture.drawers)[number]; start: number }[] = [];
  canvas.addEventListener('click', (event) => {
    const pick = hitAt(event);
    if (!pick) return;
    if (pick.kind === 'book') {
      choice = { book: state.atelier.books.find((book) => book.id === pick.id) ?? null, part: null, confirm: false };
      go('bench');
    }
    if (pick.kind === 'piece') choice = { ...choice, part: choice.part === pick.part ? null : pick.part, confirm: false };
    if (pick.kind === 'drawer') {
      const drawer = furniture.drawers.find((candidate) => candidate.part === pick.part && candidate.state === pick.state);
      if (drawer) opening.push({ drawer, start: animationNow() });
    }
    if (pick.kind === 'notebook') {
      chosen = null;
      notebook.paper.innerHTML = notebookHtml(state, choice.book, chosen, Date.now());
      notebook.outer.classList.add('open');
    }
    if (pick.kind === 'scrap') {
      scrap.paper.innerHTML = scrapHtml(state);
      scrap.outer.classList.add('open');
    }
    if (pick.kind === 'pulp') {
      pulp.paper.innerHTML = pulpHtml(state);
      pulp.outer.classList.add('open');
    }
    refresh();
  });

  // Les écritures d'abord : les étiquettes et le carnet sont dessinés une fois les polices là.
  void Promise.all(
    ["600 40px 'Cinzel'", "40px 'Caveat'", "600 40px 'Caveat'", "16px 'Special Elite'"].map((font) => document.fonts?.load(font)),
  ).then(() => {
    shown = '';
    refresh();
  });

  let mounted = false;
  const frame = (frameTime: number): void => {
    const now = animationNow(frameTime);
    if (!root.isConnected) {
      if (mounted) {
        textures.dispose();
        books.dispose();
        return destroy(scene);
      }
    } else mounted = true;
    let moving = books.tick(now);
    for (const open of [...opening]) {
      const k = Math.min(1, (now - open.start) / 1600);
      open.drawer.group.position.z = open.drawer.z + 0.26 * Math.sin(Math.PI * k) ** 0.5;
      if (k >= 1) {
        opening.splice(opening.indexOf(open), 1);
        open.drawer.group.position.z = open.drawer.z;
      }
      moving = true;
    }
    if (glide) {
      const k = Math.min(1, (now - glide.start) / GLIDE);
      aim(glide.to, k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, glide.from);
      if (k >= 1) glide = null;
      moving = true;
    }
    if (resize()) {
      aim(target(view), 1);
      dirty = true;
    }
    if (moving || dirty) {
      renderer.render(scene, camera);
      dirty = false;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  refresh();

  return {
    root,
    update: () => {
      // Une curiosité arrive, une presse finit pendant qu'on regarde : l'atelier est vu.
      visitAtelier(state);
      refresh();
    },
  };
};
