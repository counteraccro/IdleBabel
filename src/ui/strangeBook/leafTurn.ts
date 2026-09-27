import { el } from '../dom';
import { LEAF_GEOMETRY, createLeafRenderer, type LeafGeometry } from '../book/leafRenderer';
import { easeInOut } from '../book/book';

/** Place de la page de droite dans le canevas (voir LeafGeometry), en pourcentage de la double page. */
const box = (geometry: LeafGeometry, pageWidth: number, spine: number): Record<'left' | 'top' | 'width' | 'height', string> => {
  const { pageWidth: unitWidth, pageHalfHeight, view } = geometry;
  const pct = (value: number): string => `${value.toFixed(3)}%`;
  return {
    left: pct(spine - (view.x / unitWidth) * pageWidth),
    width: pct(((2 * view.x) / unitWidth) * pageWidth),
    top: pct((-(view.y - pageHalfHeight) / (2 * pageHalfHeight)) * 100),
    height: pct((view.y / pageHalfHeight) * 100),
  };
};

export interface LeafTurn {
  canvas: HTMLCanvasElement;
  /** Double page (dos au milieu) ou page seule (dos à gauche), aux proportions de ces pages. */
  fit: (single: boolean, geometry?: LeafGeometry) => void;
  /** Montre la feuille, recto et verso dessinés par `paint`, à l'avancement donné (0 : à droite, 1 : à gauche). */
  begin: (paint: (front: HTMLCanvasElement, back: HTMLCanvasElement) => void, progress: number) => void;
  /** Page tenue : la feuille suit le pointeur (annule tout mouvement en cours). */
  draw: (progress: number) => void;
  /** Mouvement de la feuille jusqu'à `to` ; interrompu par un autre mouvement, il se termine sur place. */
  animate: (to: number, duration: number) => Promise<void>;
  /** Cache la feuille : les pages fixes ont pris le relais. */
  end: () => void;
}

/** La feuille du livre en main (même rendu WebGL), posée sur le grand livre ou le carnet. */
export const createLeafTurn = (): LeafTurn => {
  const canvas = el('canvas', 'sb-leaf');
  const renderer = createLeafRenderer(canvas);
  const front = document.createElement('canvas');
  const back = document.createElement('canvas');
  let progress = 0;
  let frame = 0;
  // Mouvement en cours : interrompu, sa promesse est tenue tout de suite.
  let settle: (() => void) | null = null;
  const stop = (): void => {
    cancelAnimationFrame(frame);
    settle?.();
    settle = null;
  };

  const show = (value: number): void => {
    progress = value;
    renderer?.draw(value);
  };

  return {
    canvas,
    fit: (single, geometry = LEAF_GEOMETRY) => {
      renderer?.setGeometry(geometry);
      Object.assign(canvas.style, single ? box(geometry, 100, 0) : box(geometry, 50, 50));
    },
    begin: (paint, value) => {
      if (!renderer) return;
      paint(front, back);
      renderer.setPages(front, back);
      show(value);
      canvas.classList.add('turning');
    },
    draw: (value) => {
      stop();
      show(value);
    },
    animate: (to, duration) =>
      new Promise((resolve) => {
        stop();
        if (!renderer || duration <= 0) {
          show(to);
          return resolve();
        }
        const from = progress;
        const start = performance.now();
        const step = (now: number): void => {
          const t = Math.min(1, (now - start) / duration);
          show(from + (to - from) * easeInOut(t));
          if (t < 1) frame = requestAnimationFrame(step);
          else {
            settle = null;
            resolve();
          }
        };
        settle = resolve;
        frame = requestAnimationFrame(step);
      }),
    end: () => {
      stop();
      canvas.classList.remove('turning');
    },
  };
};
