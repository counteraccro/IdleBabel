import { el } from '../dom';
import { PAGE_TEXTURE } from '../book/pageLayout';
import { preparePageTexture, type Paper } from '../book/pageRender';

/**
 * Éléments d'une page du livre étrange, dans le repère de la texture (640 × 800). Une seule
 * description sert à la page HTML et à la feuille qui tourne en WebGL : elles sont identiques.
 */
export type Item =
  | { kind: 'text'; text: string; x: number; y: number; size: number; align: CanvasTextAlign; italic?: boolean; faded?: boolean; spacing?: number }
  | { kind: 'dots'; x1: number; x2: number; y: number }
  /** Zone cliquable (entrée du sommaire) : rien n'est dessiné. */
  | { kind: 'link'; y: number; height: number; target: number };

export const STRANGE_PAPER: Paper = ['#e4e0d4', '#d8d3c4', '#cbc5b3'];
const INK = '#1a1c22';
const FADED = '#5d5f66';
const SERIF = "Georgia, 'Times New Roman', serif";

type TextItem = Extract<Item, { kind: 'text' }>;
const font = (item: TextItem, size: string): string => `${item.italic ? 'italic ' : ''}${size} ${SERIF}`;
/** Unité HTML : la page est un conteneur, 1 unité du repère = 100 / 640 cqw. */
const unit = (value: number): string => `${((value * 100) / PAGE_TEXTURE.width).toFixed(3)}cqw`;

const placeText = (node: HTMLElement, item: TextItem): void => {
  node.style.top = unit(item.y);
  node.style.font = font(item, unit(item.size));
  node.style.letterSpacing = unit(item.spacing ?? 0);
  node.style.color = item.faded ? FADED : INK;
  node.style.textAlign = item.align;
  node.style.left = item.align === 'left' ? unit(item.x) : '0';
  node.style.right = item.align === 'right' ? unit(PAGE_TEXTURE.width - item.x) : '0';
};

const createNode = (item: Item, goTo: (page: number) => void): HTMLElement => {
  if (item.kind === 'text') {
    const node = el('span', 'sb-text', item.text);
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
export const createItemsView = (target: HTMLElement, goTo: (page: number) => void): ((items: Item[]) => void) => {
  let shape = '';
  let nodes: HTMLElement[] = [];
  return (items) => {
    const nextShape = items.map((item) => item.kind).join();
    if (nextShape !== shape) {
      shape = nextShape;
      nodes = items.map((item) => createNode(item, goTo));
      target.replaceChildren(...nodes);
      return;
    }
    items.forEach((item, index) => {
      if (item.kind === 'text' && nodes[index].textContent !== item.text) rewrite(nodes[index], item.text);
    });
  };
};

/** Même page, dessinée sur la texture de la feuille. */
export const drawItems = (canvas: HTMLCanvasElement, items: Item[], spineOnLeft: boolean): void => {
  const context = preparePageTexture(canvas, spineOnLeft, STRANGE_PAPER);
  context.textBaseline = 'top';
  for (const item of items) {
    if (item.kind === 'text') {
      context.font = font(item, `${item.size}px`);
      context.letterSpacing = `${item.spacing ?? 0}px`;
      context.fillStyle = item.faded ? FADED : INK;
      context.textAlign = item.align;
      context.fillText(item.text, item.align === 'center' ? PAGE_TEXTURE.width / 2 : item.x, item.y);
    } else if (item.kind === 'dots') {
      context.fillStyle = FADED;
      for (let x = item.x1; x < item.x2; x += 6) context.fillRect(x, item.y, 1.5, 1.5);
    }
  }
  context.letterSpacing = '0px';
};
