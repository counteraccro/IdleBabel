import * as THREE from 'three';
import { marble, MARBLES } from './marble';
import { EDGE_W, MH, rng } from './mockup';
import type { CoverDetails, EdgeKind } from '../../../systems/coverDetails';

/** Texture de la tranche : x le long des feuilles (la hauteur du livre), y à travers le bloc (pageStack.ts). */
const LENGTH = 512;
const ACROSS = 512;

/** Teinte unie des tranches teintes. */
const TINTS: Partial<Record<EdgeKind, string>> = { red: '#a3352a', yellow: '#d9b24a' };

/**
 * La tranche d'un livre (maquette : vue de face, 96 de large pour 800 de haut, plats à gauche et à droite) :
 * nature, jaspée de rouge ou de bleu, teinte (rouge, jaune, ou la couleur d'un livre moderne : `tint`), dorée
 * ou marbrée. Dessinée de face comme sur la maquette, puis couchée dans le repère de la texture ; les feuilles
 * et l'ombre contre les plats, à la manière de edgeTexture (textures.ts).
 */
export const ordinaryEdge = (kind: EdgeKind | 'tint', paper: string, details: CoverDetails, tint?: string): THREE.CanvasTexture => {
  const view = document.createElement('canvas');
  view.width = EDGE_W * 2;
  view.height = MH * 2;
  const context = view.getContext('2d')!;
  context.scale(2, 2);
  const random = rng(details.seed + 17);
  if (kind === 'gilt') {
    const burnish = context.createLinearGradient(0, 0, 0, MH);
    burnish.addColorStop(0, '#a07e34');
    burnish.addColorStop(0.3, '#d8b45e');
    burnish.addColorStop(0.5, '#f0d488');
    burnish.addColorStop(0.7, '#c9a24f');
    burnish.addColorStop(1, '#8a6a2c');
    context.fillStyle = burnish;
    context.fillRect(0, 0, EDGE_W, MH);
  } else if (kind === 'marbled') context.drawImage(marble(details.seed, details.marble, 0, EDGE_W, MH), 0, 0, EDGE_W, MH);
  else {
    context.fillStyle = kind === 'tint' ? (tint ?? paper) : (TINTS[kind] ?? paper);
    context.fillRect(0, 0, EDGE_W, MH);
  }
  if (kind === 'redSprinkle' || kind === 'blueSprinkle') {
    const color = kind === 'redSprinkle' ? '165,40,28' : '40,70,130';
    for (let i = 0; i < 1600; i++) {
      context.fillStyle = `rgba(${color},${0.45 + random() * 0.45})`;
      context.beginPath();
      context.arc(random() * EDGE_W, random() * MH, 0.5 + random() * 1.3, 0, 2 * Math.PI);
      context.fill();
    }
  }
  if (kind === 'red' || kind === 'yellow' || kind === 'gilt' || kind === 'tint') {
    // Brunie : un reflet le long de la tranche.
    const shine = context.createLinearGradient(0, 0, EDGE_W, 0);
    shine.addColorStop(0, 'rgba(255,255,255,0)');
    shine.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    shine.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = shine;
    context.fillRect(0, 0, EDGE_W, MH);
  }

  const node = document.createElement('canvas');
  node.width = LENGTH;
  node.height = ACROSS;
  const texture = node.getContext('2d')!;
  // Couchée : la hauteur de la vue devient x, sa largeur devient y.
  texture.setTransform(0, ACROSS / view.width, LENGTH / view.height, 0, 0, 0);
  texture.drawImage(view, 0, 0);
  texture.setTransform(1, 0, 0, 1, 0, 0);
  // Les feuilles, une fine ligne chacune (comme edgeTexture), et le papier plus sombre contre les plats.
  texture.fillStyle = kind === 'plain' ? '#b39d74' : kind === 'gilt' ? 'rgba(90,62,18,0.18)' : 'rgba(0,0,0,0.14)';
  for (let y = 0; y < ACROSS; y += 3) texture.fillRect(0, y, LENGTH, random() < 0.3 ? 1.4 : 0.8);
  const shade = texture.createLinearGradient(0, 0, 0, ACROSS);
  shade.addColorStop(0, 'rgba(60, 40, 10, 0.35)');
  shade.addColorStop(0.15, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(0.85, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, 'rgba(40, 25, 5, 0.45)');
  texture.fillStyle = shade;
  texture.fillRect(0, 0, LENGTH, ACROSS);
  const result = new THREE.CanvasTexture(node);
  result.colorSpace = THREE.SRGBColorSpace;
  return result;
};

/** Les deux fils des tranchefiles, assortis à la tranche (la couleur du cuir pour une tranche nature). */
export const headbandColors = (kind: EdgeKind, details: CoverDetails, leather: string): [string, string] => {
  switch (kind) {
    case 'redSprinkle':
      return ['#8a2a20', '#e8dcc0'];
    case 'blueSprinkle':
      return ['#2a4070', '#e8dcc0'];
    case 'red':
      return ['#8a2a20', '#d9c48f'];
    case 'yellow':
      return ['#2f5a32', '#d9b24a'];
    case 'gilt':
      return ['#6e1a20', '#d9b56a'];
    case 'marbled':
      return [MARBLES[details.marble][0], MARBLES[details.marble][2]];
    default:
      return [leather, '#d9c48f'];
  }
};
