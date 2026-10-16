import '@fontsource/cinzel/600.css';
import * as THREE from 'three';
import { canvasTexture } from '../book3d/textures';
import { drawBabelDigit } from '../babelDigits';

/**
 * Les panneaux de la machine de la Loterie (maquette validée le 16/10, .ai/maquette-meuble-des-fins.html) : bordeaux,
 * étoilés de points, cerclés d'or ; leurs textes et symboles sont dorés, comme partout dans le jeu (les néons de couleur
 * étaient « trop colorés »), avec un halo léger. La texture sert aussi de lumière propre (emissiveMap).
 */
const CINZEL = "'Cinzel', Georgia, serif";

/** Un dessin doré, avec son halo. */
const halo = (context: CanvasRenderingContext2D, draw: () => void): void => {
  context.save();
  context.shadowColor = 'rgba(224, 180, 90, 0.55)';
  context.shadowBlur = 12;
  draw();
  context.restore();
};

/** Le dégradé doré d'un texte, sur la hauteur du panneau. */
const goldText = (context: CanvasRenderingContext2D): CanvasGradient => {
  const gradient = context.createLinearGradient(0, 0, 0, context.canvas.height);
  gradient.addColorStop(0, '#f7e2a6');
  gradient.addColorStop(0.55, '#d9a94e');
  gradient.addColorStop(1, '#a8762c');
  return gradient;
};

/** Règle la police pour que `text` tienne dans `max` pixels : la taille voulue, ou moins (le texte anglais peut être plus long). */
const fitFont = (context: CanvasRenderingContext2D, text: string, size: number, family: string, max: number): void => {
  context.font = `600 ${size}px ${family}`;
  const width = context.measureText(text).width;
  if (width > max) context.font = `600 ${Math.floor((size * max) / width)}px ${family}`;
};

export interface Panel {
  mesh: THREE.Mesh;
  /** Redessine le fond, puis ce que le panneau montre. */
  redraw: () => void;
}

/** Un panneau de `w` × `h` (unités de la scène, 1024 pixels par unité) ; `paint` y dessine ce qu'il montre. */
const panel = (w: number, h: number, paint: (context: CanvasRenderingContext2D, w: number, h: number) => void, plain = false): Panel => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * 1024);
  canvas.height = Math.round(h * 1024);
  const context = canvas.getContext('2d')!;
  const texture = canvasTexture(canvas);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    emissiveMap: texture,
    emissive: 0xffffff,
    emissiveIntensity: 0.4,
    roughness: 0.5,
  });
  const redraw = (): void => {
    const [W, H] = [canvas.width, canvas.height];
    if (plain) {
      // L'écran des jetons : noir.
      context.fillStyle = '#05080c';
      context.fillRect(0, 0, W, H);
    } else {
      const gradient = context.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, W * 0.7);
      gradient.addColorStop(0, '#4a1424');
      gradient.addColorStop(1, '#1e0810');
      context.fillStyle = gradient;
      context.fillRect(0, 0, W, H);
      for (let i = 0; i < 90; i++) {
        context.fillStyle = `rgba(255, 200, 220, ${0.05 + ((i * 37) % 10) / 60})`;
        context.fillRect((i * 997) % W, (i * 571) % H, 2, 2);
      }
      context.strokeStyle = 'rgba(224,180,90,0.7)';
      context.lineWidth = 4;
      context.strokeRect(14, 14, W - 28, H - 28);
    }
    paint(context, W, H);
    texture.needsUpdate = true;
  };
  redraw();
  return { mesh: new THREE.Mesh(new THREE.PlaneGeometry(w, h), material), redraw };
};

/**
 * Le panneau du bas : « GROS LOT », et trois 7 de Babel (le 7-7-7 des casinos) ; après un tirage, son résultat (`result`) :
 * un titre (« BONUS »), et ce qu'il donne en dessous.
 */
export const jackpotPanel = (title: () => string, result: () => { title: string; line: string } | null): Panel =>
  panel(0.88, 0.48, (context, w, h) => {
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const shown = result();
    if (shown) {
      halo(context, () => {
        context.fillStyle = goldText(context);
        fitFont(context, shown.title, h * 0.24, CINZEL, w * 0.8);
        context.fillText(shown.title, w / 2, h * 0.36);
        fitFont(context, shown.line, h * 0.12, CINZEL, w * 0.82);
        context.fillText(shown.line, w / 2, h * 0.66);
      });
      return;
    }
    halo(context, () => {
      context.fillStyle = goldText(context);
      // Dans le cadre doré du panneau (sa marge de 14 px et le filet) : 80 % de la largeur au plus.
      fitFont(context, title(), h * 0.2, CINZEL, w * 0.8);
      context.fillText(title(), w / 2, h * 0.28);
    });
    for (let i = 0; i < 3; i++) halo(context, () => drawBabelDigit(context, 7, w / 2 + (i - 1) * h * 0.42, h * 0.66, h * 0.34, 6));
  });

/** L'enseigne du fronton : « LOTERIE ». */
export const signPanel = (title: () => string): Panel =>
  panel(0.84, 0.26, (context, w, h) => {
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    halo(context, () => {
      context.fillStyle = goldText(context);
      fitFont(context, title(), h * 0.5, CINZEL, w * 0.8);
      context.fillText(title(), w / 2, h * 0.54);
    });
  });

/** L'écran des jetons : leur nombre, en deux chiffres de Babel. */
export const tokensPanel = (tokens: () => number): Panel =>
  panel(
    0.34,
    0.08,
    (context, w, h) => {
      [...String(tokens()).padStart(2, '0')].forEach((digit, i) =>
        halo(context, () => drawBabelDigit(context, Number(digit), w / 2 + (i - 0.5) * h * 0.95, h / 2, h * 0.72, 8)),
      );
    },
    true,
  );
