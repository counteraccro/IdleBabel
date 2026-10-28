import * as THREE from 'three';
import { TITLE } from '../rareBooks/draw';

/**
 * Les pièces de titre du lutrin (l'auteur, 28/10 : les bonus « mieux mis en valeur », dans l'esprit de l'atelier) : une
 * étiquette de cuir comme celle qu'on colle au dos d'un vieux livre, filets et lettres dorés au fer. Maroquin rouge pour
 * un bonus, cuir noir pour un malus, havane pour ce qui n'est ni l'un ni l'autre (les colonnes du casier) ; sous la lampe
 * allumée, la dorure brille.
 */

export type Leather = 'red' | 'black' | 'brown';
/** Une ligne de lettres ; `big` : le titre de la pièce, plus gros ; `silver` : poussée à l'argent (un malus du total). */
export interface TitleLine {
  text: string;
  big?: boolean;
  silver?: boolean;
}

const LEATHER: Record<Leather, [string, string]> = {
  red: ['#7a2219', '#3e0f0b'],
  black: ['#2a2420', '#0e0b09'],
  brown: ['#6a4428', '#2e1c10'],
};
/**
 * Pixels du dessin par unité du meuble : à peu près deux fois ce que la pièce couvre à l'écran (Retina compris). Bien plus,
 * la carte graphique la réduit par paliers flous (mipmaps) et les lettres s'effacent.
 */
const SCALE = 900;

export interface TitlePiece {
  mesh: THREE.Mesh;
  /** Réécrit la pièce (rien : le cuir nu) ; plusieurs lignes, en une ou deux colonnes. */
  write: (lines: TitleLine[], leather?: Leather, columns?: number) => void;
  /** La dorure qui brille (0 : sans lampe, 1 : sous la lampe). */
  glow: (k: number) => void;
}

/** Le grain du cuir : des milliers de petits creux et de reflets, toujours les mêmes (graine fixe). */
const grain = (context: CanvasRenderingContext2D, w: number, h: number): void => {
  let seed = 7;
  const random = (): number => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < (w * h) / 60; i++) {
    context.fillStyle = random() < 0.5 ? 'rgba(0, 0, 0, 0.16)' : 'rgba(255, 220, 190, 0.05)';
    context.fillRect(random() * w, random() * h, 1 + random() * 2, 1 + random() * 1.5);
  }
};

export const createTitlePiece = (onChange: () => void, width: number, height: number): TitlePiece => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * SCALE);
  canvas.height = Math.round(height * SCALE);
  const context = canvas.getContext('2d')!;
  // Ce qui brille : la dorure seule, sur du noir.
  const shine = document.createElement('canvas');
  shine.width = canvas.width;
  shine.height = canvas.height;
  const shineContext = shine.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  const shineTexture = new THREE.CanvasTexture(shine);
  for (const map of [texture, shineTexture]) {
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    // Sans paliers : les lettres restent nettes (la pièce ne s'éloigne jamais assez pour scintiller).
    map.generateMipmaps = false;
    map.minFilter = THREE.LinearFilter;
  }
  const face = new THREE.MeshStandardMaterial({
    map: texture,
    emissiveMap: shineTexture,
    emissive: new THREE.Color(0, 0, 0),
    roughness: 0.6,
  });
  const side = new THREE.MeshStandardMaterial({ color: 0x3e0f0b, roughness: 0.7 });
  // Une pièce de cuir est mince : à peine plus épaisse qu'une couverture.
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.008), [side, side, side, side, face, side]);
  mesh.receiveShadow = true;

  const gold = (top: number, bottom: number, silver = false): CanvasGradient => {
    const gradient = context.createLinearGradient(0, top, 0, bottom);
    gradient.addColorStop(0, silver ? '#f2f0ea' : '#f6e3a1');
    gradient.addColorStop(0.45, silver ? '#bdb8ae' : '#d4a64c');
    gradient.addColorStop(0.55, silver ? '#8e8a82' : '#a8772a');
    gradient.addColorStop(1, silver ? '#d8d4cc' : '#e8c56c');
    return gradient;
  };

  // L'atelier quitté, sa scène est libérée (renderer3d.ts, disposeObject) : plus rien à dessiner.
  let disposed = false;
  texture.addEventListener('dispose', () => (disposed = true));

  let written = '';
  const write = (lines: TitleLine[], leather: Leather = 'red', columns = 1): void => {
    const key = JSON.stringify([lines, leather, columns]);
    if (disposed || key === written) return;
    written = key;
    const [w, h] = [canvas.width, canvas.height];
    const [light, dark] = LEATHER[leather];
    side.color.set(dark);
    // Le cuir, plus clair au milieu, et son grain.
    const leatherFill = context.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    leatherFill.addColorStop(0, light);
    leatherFill.addColorStop(1, dark);
    context.fillStyle = leatherFill;
    context.fillRect(0, 0, w, h);
    grain(context, w, h);
    shineContext.fillStyle = '#000';
    shineContext.fillRect(0, 0, w, h);
    // Deux filets dorés au fer, le second plus fin, en dedans.
    const fillet = (inset: number, line: number): void => {
      for (const [ctx, ink] of [
        [context, gold(0, h)],
        [shineContext, '#c89a48'],
      ] as const) {
        ctx.strokeStyle = ink;
        ctx.lineWidth = line;
        ctx.strokeRect(inset, inset, w - 2 * inset, h - 2 * inset);
      }
    };
    const unit = Math.min(w, h);
    fillet(unit * 0.07, Math.max(2, unit * 0.025));
    fillet(unit * 0.13, Math.max(1, unit * 0.01));

    // Les lettres, poussées au fer (une ombre au-dessus, le creux), puis dorées.
    const big = lines.filter((line) => line.big);
    const rest = lines.filter((line) => !line.big);
    const perColumn = Math.ceil(rest.length / columns);
    const rows = big.length * 1.3 + perColumn;
    const pad = unit * 0.15;
    const row = Math.min((h - 2 * pad) / Math.max(1, rows), h * 0.62);
    const placed: { line: TitleLine; x: number; y: number; room: number; size: number }[] = [];
    let y = (h - rows * row) / 2;
    for (const line of big) {
      placed.push({ line, x: w / 2, y: y + row * 0.65, room: w - 2 * pad, size: row * 0.9 });
      y += row * 1.3;
    }
    const columnWidth = (w - 2 * pad) / columns;
    rest.forEach((line, i) => {
      const column = Math.floor(i / perColumn);
      placed.push({
        line,
        x: pad + columnWidth * (column + 0.5),
        y: y + (i % perColumn) * row + row * 0.5,
        room: columnWidth * 0.94,
        size: row * 0.7,
      });
    });
    for (const { line, x, y: middle, room, size } of placed) {
      const font = `700 ${Math.round(size)}px ${TITLE}`;
      context.font = shineContext.font = font;
      context.textAlign = shineContext.textAlign = 'center';
      context.textBaseline = shineContext.textBaseline = 'middle';
      const fit = Math.min(1, room / context.measureText(line.text).width);
      const draw = (ctx: CanvasRenderingContext2D, dy: number, ink: string | CanvasGradient): void => {
        ctx.save();
        ctx.translate(x, middle + dy);
        ctx.scale(fit, 1);
        ctx.fillStyle = ink;
        ctx.fillText(line.text, 0, 0);
        ctx.restore();
      };
      draw(context, -2, 'rgba(0, 0, 0, 0.55)');
      draw(context, 0, gold(middle - size / 2, middle + size / 2, line.silver));
      draw(shineContext, 0, line.silver ? '#a8a49c' : '#e8b85a');
    }
    texture.needsUpdate = shineTexture.needsUpdate = true;
    onChange();
  };

  const glow = (k: number): void => {
    face.emissive.setScalar(k * 0.8);
    onChange();
  };

  // Cinzel peut arriver après le premier dessin : la pièce se redessine alors.
  void document.fonts?.load(`700 40px ${TITLE}`).then(() => {
    if (!written) return;
    const [lines, leather, columns] = JSON.parse(written) as [TitleLine[], Leather, number];
    written = '';
    write(lines, leather, columns);
  });

  return { mesh, write, glow };
};
