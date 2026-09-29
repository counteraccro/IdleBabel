import '@fontsource/nothing-you-could-do/400.css';
import { el } from '../dom';
import { PAGE_TEXTURE } from '../book/pageLayout';
import { cssBaseline, preparePageTexture, type Paper } from '../book/pageRender';
import { drawSeal, sealSvg, sigil, type Look } from './sigil';

/**
 * Éléments d'une page du livre étrange, dans le repère de la texture (640 × 800). Une seule
 * description sert à la page HTML et à la feuille qui tourne en WebGL : elles sont identiques.
 */
export type Item =
  /**
   * `steady` : le texte change sans l'effet de réécriture (légende qui suit la souris). `face` : écriture
   * du chercheur au crayon. `caps` : petites capitales. `ink` : symboles de Babel presque effacés
   * (`noise`), ou lettres d'une phrase pas encore ordonnée (`ghost`). `gather` : les lettres viennent de
   * s'ordonner, elles glissent à leur place depuis ailleurs sur la page (graine de leurs trajets).
   */
  | {
      kind: 'text';
      text: string;
      x: number;
      y: number;
      size: number;
      align: CanvasTextAlign;
      italic?: boolean;
      faded?: boolean;
      spacing?: number;
      steady?: boolean;
      gold?: boolean;
      face?: 'hand';
      caps?: boolean;
      ink?: 'noise' | 'ghost';
      gather?: number;
      /** Apparition en fondu après ce délai (ms) : la page vient de changer d'aspect. */
      reveal?: number;
    }
  | { kind: 'dots'; x1: number; x2: number; y: number }
  /** Zone cliquable (entrée du sommaire) : rien n'est dessiné. */
  | { kind: 'link'; y: number; height: number; target: number }
  /** Zone cliquable qui déclenche une action de la page (déchiffrer…) : rien n'est dessiné. */
  | { kind: 'action'; id: string; y: number; height: number }
  /** Sceau : carré de côté `size` centré en `x`, `y` ; survolé, il écrit sa légende (`hover`). */
  | { kind: 'seal'; id: string; series: string; tier: number; look: Look; x: number; y: number; size: number; fresh?: boolean };

/** Ce que les éléments d'une page peuvent déclencher. */
export interface ItemActions {
  goTo: (page: number) => void;
  /** Un sceau est survolé (ou touché). */
  hover?: (id: string) => void;
  act?: (id: string) => void;
}

export const STRANGE_PAPER: Paper = ['#e4e0d4', '#d8d3c4', '#cbc5b3'];
const INK = '#1a1c22';
const FADED = '#5d5f66';
/** Or des sceaux, pour l'étoile qui signale du nouveau. */
const GOLD = '#b8913a';
const SERIF = "Georgia, 'Times New Roman', serif";
/** Écriture et crayon du chercheur, les mêmes que dans son carnet. */
export const HAND = "'Nothing You Could Do', cursive";
const PENCIL = '#4a463f';
const PENCIL_FADED = '#aaa391';
/** Livre blanc : symboles de Babel presque effacés, et lettres d'une phrase pas encore ordonnée. */
export const NOISE_INK = '#d8d0bd';
const GHOST_INK = '#bdb39c';
export const SERIF_FONT = SERIF;

/** Titre d'une page et numéro de page, au même endroit sur toutes les pages. */
export const heading = (text: string): Item => ({ kind: 'text', text, x: 320, y: 100, size: 32, align: 'center', spacing: 6 });
export const folio = (number: number): Item => ({ kind: 'text', text: String(number), x: 320, y: 730, size: 18, align: 'center', faded: true });

type TextItem = Extract<Item, { kind: 'text' }>;
const font = (item: TextItem, size: string): string =>
  `${item.italic ? 'italic ' : ''}${item.caps ? 'small-caps ' : ''}${size} ${item.face === 'hand' ? HAND : SERIF}`;
const color = (item: TextItem): string => {
  if (item.ink === 'noise') return NOISE_INK;
  if (item.ink === 'ghost') return GHOST_INK;
  if (item.face === 'hand') return item.faded ? PENCIL_FADED : PENCIL;
  return item.gold ? GOLD : item.faded ? FADED : INK;
};
/** Unité HTML : la page est un conteneur, 1 unité du repère = 100 / 640 cqw. */
const unit = (value: number): string => `${((value * 100) / PAGE_TEXTURE.width).toFixed(3)}cqw`;

const placeText = (node: HTMLElement, item: TextItem): void => {
  node.style.top = unit(item.y);
  node.style.font = font(item, unit(item.size));
  node.style.letterSpacing = unit(item.spacing ?? 0);
  node.style.color = color(item);
  node.style.textAlign = item.align;
  node.style.left = item.align === 'left' ? unit(item.x) : '0';
  node.style.right = item.align === 'right' ? unit(PAGE_TEXTURE.width - item.x) : '0';
};

const createNode = (item: Item, { goTo, hover, act }: ItemActions): HTMLElement => {
  if (item.kind === 'text') {
    const node = el('span', item.gold ? 'sb-text sb-gold' : 'sb-text');
    if (item.gather === undefined) node.textContent = item.text;
    else gatherLetters(node, item.text, item.gather);
    if (item.reveal !== undefined) {
      node.classList.add('sb-reveal');
      node.style.animationDelay = `${item.reveal}ms`;
    }
    placeText(node, item);
    return node;
  }
  if (item.kind === 'dots') {
    const node = el('span', 'sb-dots');
    node.style.top = unit(item.y);
    node.style.left = unit(item.x1);
    node.style.width = unit(item.x2 - item.x1);
    return node;
  }
  if (item.kind === 'seal') {
    const node = el('button', `sb-seal ${item.look}${item.fresh ? ' fresh' : ''}`);
    node.style.left = unit(item.x - item.size / 2);
    node.style.top = unit(item.y - item.size / 2);
    node.style.width = unit(item.size);
    node.style.height = unit(item.size);
    node.innerHTML = sealSvg(sigil(item.series, item.tier), item.look, `gold-${item.id}`);
    if (item.look === 'hidden') node.disabled = true;
    const describe = (): void => hover?.(item.id);
    node.addEventListener('mouseenter', describe);
    node.addEventListener('focus', describe);
    node.addEventListener('click', describe);
    // Le livre prend les appuis pour tourner les pages : un sceau garde le sien.
    node.addEventListener('pointerdown', (event) => event.stopPropagation());
    return node;
  }
  const node = el('button', item.kind === 'link' ? 'sb-link' : `sb-link sb-action ${item.id}`);
  node.style.top = unit(item.y);
  node.style.height = unit(item.height);
  node.addEventListener('click', () => (item.kind === 'link' ? goTo(item.target) : act?.(item.id)));
  // Le livre prend les appuis pour tourner les pages : une entrée du sommaire ou une action garde le sien.
  node.addEventListener('pointerdown', (event) => event.stopPropagation());
  return node;
};

/**
 * Élément cliquable sous le point (x, y) de la page (repère de la texture), comme les boutons de la
 * page HTML : entrées du sommaire et actions sur 80 % de la largeur (la note au crayon, sur la moitié),
 * sceaux sur leur carré. Le dernier posé l'emporte, comme dans la page.
 */
export const itemAt = (items: Item[], x: number, y: number): Item | undefined =>
  [...items].reverse().find((item) => {
    if (item.kind === 'seal') return item.look !== 'hidden' && Math.abs(x - item.x) <= item.size / 2 && Math.abs(y - item.y) <= item.size / 2;
    if (item.kind !== 'link' && item.kind !== 'action') return false;
    const margin = PAGE_TEXTURE.width * (item.kind === 'action' && item.id === 'pay' ? 0.25 : 0.1);
    return x >= margin && x <= PAGE_TEXTURE.width - margin && y >= item.y && y <= item.y + item.height;
  });

/** Déclenche l'élément touché (lien, action, sceau) comme un clic sur la page HTML ; false : rien ici. */
export const pressItem = (item: Item | undefined, { goTo, hover, act }: ItemActions): boolean => {
  if (item?.kind === 'link') goTo(item.target);
  else if (item?.kind === 'action') act?.(item.id);
  else if (item?.kind === 'seal') hover?.(item.id);
  else return false;
  return true;
};

/** Hachage d'entiers : toujours le même résultat pour les mêmes nombres. */
export const hash = (...values: number[]): number =>
  values.reduce((h, value) => Math.imul(h ^ (value + 0x9e3779b9), 0x85ebca6b) >>> 0, 0x2545f491);

/**
 * Lettres qui viennent de s'ordonner (livre blanc) : chacune part d'un autre endroit de la page, pâle
 * comme les symboles autour, et glisse jusqu'à sa place en fonçant, l'une après l'autre.
 */
const gatherLetters = (node: HTMLElement, text: string, seed: number): void => {
  [...text].forEach((letter, index) => {
    const span = el('span', 'sb-gather', letter);
    const h = hash(seed, index);
    span.style.setProperty('--dx', `${((h % 400) - 200) / 10}cqw`);
    span.style.setProperty('--dy', `${(((h >>> 9) % 500) - 250) / 10}cqw`);
    span.style.animationDelay = `${index * 60}ms`;
    node.append(span);
  });
};

/** Un chiffre qui change tremble à peine, comme s'il se réécrivait. */
const rewrite = (node: HTMLElement, text: string): void => {
  node.textContent = text;
  node.classList.remove('sb-shift');
  void node.offsetWidth;
  node.classList.add('sb-shift');
};

const itemShape = (item: Item): string => {
  if (item.kind === 'seal') return `seal:${item.look}:${item.fresh ?? false}`;
  if (item.kind === 'action') return `action:${item.id}`;
  if (item.kind === 'text') return `text:${item.x}:${item.y}:${item.faded ?? false}:${item.ink ?? ''}`;
  return item.kind;
};

/** Page HTML : reconstruite si sa structure change, sinon seuls les textes changés sont réécrits. */
export const createItemsView = (target: HTMLElement, actions: ItemActions): ((items: Item[]) => void) => {
  let shape = '';
  let nodes: HTMLElement[] = [];
  return (items) => {
    // Un sceau qui change d'aspect (obtenu, vu), un texte qui bouge ou change d'encre (mot trouvé du
    // livre blanc) font reconstruire la page ; sinon seuls les textes sont réécrits.
    const nextShape = items.map(itemShape).join();
    if (nextShape !== shape) {
      shape = nextShape;
      nodes = items.map((item) => createNode(item, actions));
      target.replaceChildren(...nodes);
      return;
    }
    items.forEach((item, index) => {
      if (item.kind !== 'text' || nodes[index].textContent === item.text) return;
      if (item.steady) nodes[index].textContent = item.text;
      else rewrite(nodes[index], item.text);
    });
  };
};

/** Même page, dessinée sur la texture de la feuille. */
export const drawItems = (canvas: HTMLCanvasElement, items: Item[], spineOnLeft: boolean, paper: Paper = STRANGE_PAPER): void => {
  const context = preparePageTexture(canvas, spineOnLeft, paper);
  context.textBaseline = 'alphabetic';
  for (const item of items) {
    if (item.kind === 'text') {
      context.font = font(item, `${item.size}px`);
      context.letterSpacing = `${item.spacing ?? 0}px`;
      context.fillStyle = color(item);
      context.textAlign = item.align;
      // placeText règle la police par le raccourci `font`, qui remet line-height à normal.
      const baseline = cssBaseline(context, item.y);
      context.fillText(item.text, item.align === 'center' ? PAGE_TEXTURE.width / 2 : item.x, baseline);
    } else if (item.kind === 'dots') {
      context.fillStyle = FADED;
      for (let x = item.x1; x < item.x2; x += 6) context.fillRect(x, item.y, 1.5, 1.5);
    } else if (item.kind === 'seal') {
      drawSeal(context, sigil(item.series, item.tier), item.look, item.x - item.size / 2, item.y - item.size / 2, item.size);
    }
  }
  context.letterSpacing = '0px';
};
