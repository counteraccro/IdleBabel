import { el } from '../dom';
import { PAGE_TEXTURE } from '../book/pageLayout';
import { cssBaseline, preparePageTexture, type Paper } from '../book/pageRender';
import { drawSeal, sealSvg, sigil, type Look } from './sigil';

/**
 * Éléments d'une page du livre étrange, dans le repère de la texture (640 × 800). Une seule
 * description sert à la page HTML et à la feuille qui tourne en WebGL : elles sont identiques.
 */
export type Item =
  /** `steady` : le texte change sans l'effet de réécriture (légende qui suit la souris). */
  | { kind: 'text'; text: string; x: number; y: number; size: number; align: CanvasTextAlign; italic?: boolean; faded?: boolean; spacing?: number; steady?: boolean; gold?: boolean }
  | { kind: 'dots'; x1: number; x2: number; y: number }
  /** Zone cliquable (entrée du sommaire) : rien n'est dessiné. */
  | { kind: 'link'; y: number; height: number; target: number }
  /** Sceau : carré de côté `size` centré en `x`, `y` ; survolé, il écrit sa légende (`hover`). */
  | { kind: 'seal'; id: string; series: string; tier: number; look: Look; x: number; y: number; size: number; fresh?: boolean };

/** Ce que les éléments d'une page peuvent déclencher. */
export interface ItemActions {
  goTo: (page: number) => void;
  /** Un sceau est survolé (ou touché). */
  hover?: (id: string) => void;
}

export const STRANGE_PAPER: Paper = ['#e4e0d4', '#d8d3c4', '#cbc5b3'];
const INK = '#1a1c22';
const FADED = '#5d5f66';
/** Or des sceaux, pour l'étoile qui signale du nouveau. */
const GOLD = '#b8913a';
const SERIF = "Georgia, 'Times New Roman', serif";

/** Titre d'une page et numéro de page, au même endroit sur toutes les pages. */
export const heading = (text: string): Item => ({ kind: 'text', text, x: 320, y: 100, size: 32, align: 'center', spacing: 6 });
export const folio = (number: number): Item => ({ kind: 'text', text: String(number), x: 320, y: 730, size: 18, align: 'center', faded: true });

type TextItem = Extract<Item, { kind: 'text' }>;
const font = (item: TextItem, size: string): string => `${item.italic ? 'italic ' : ''}${size} ${SERIF}`;
/** Unité HTML : la page est un conteneur, 1 unité du repère = 100 / 640 cqw. */
const unit = (value: number): string => `${((value * 100) / PAGE_TEXTURE.width).toFixed(3)}cqw`;

const placeText = (node: HTMLElement, item: TextItem): void => {
  node.style.top = unit(item.y);
  node.style.font = font(item, unit(item.size));
  node.style.letterSpacing = unit(item.spacing ?? 0);
  node.style.color = item.gold ? GOLD : item.faded ? FADED : INK;
  node.style.textAlign = item.align;
  node.style.left = item.align === 'left' ? unit(item.x) : '0';
  node.style.right = item.align === 'right' ? unit(PAGE_TEXTURE.width - item.x) : '0';
};

const createNode = (item: Item, { goTo, hover }: ItemActions): HTMLElement => {
  if (item.kind === 'text') {
    const node = el('span', item.gold ? 'sb-text sb-gold' : 'sb-text', item.text);
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
  const node = el('button', 'sb-link');
  node.style.top = unit(item.y);
  node.style.height = unit(item.height);
  node.addEventListener('click', () => goTo(item.target));
  // Le livre prend les appuis pour tourner les pages : une entrée du sommaire garde le sien.
  node.addEventListener('pointerdown', (event) => event.stopPropagation());
  return node;
};

/** Un chiffre qui change tremble à peine, comme s'il se réécrivait. */
const rewrite = (node: HTMLElement, text: string): void => {
  node.textContent = text;
  node.classList.remove('sb-shift');
  void node.offsetWidth;
  node.classList.add('sb-shift');
};

/** Page HTML : reconstruite si sa structure change, sinon seuls les textes changés sont réécrits. */
export const createItemsView = (target: HTMLElement, actions: ItemActions): ((items: Item[]) => void) => {
  let shape = '';
  let nodes: HTMLElement[] = [];
  return (items) => {
    // Un sceau qui change d'aspect (obtenu, vu) fait reconstruire la page.
    const nextShape = items.map((item) => (item.kind === 'seal' ? `seal:${item.look}:${item.fresh ?? false}` : item.kind)).join();
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
      context.fillStyle = item.gold ? GOLD : item.faded ? FADED : INK;
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
