import { preparePageTexture, type Paper } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { sealEvent } from '../../../systems/seals';
import { LEATHER, THICKNESS, sandBack, sandFront, sandInside, sandSpine } from './sandCover';
import { loadSandFonts } from './sandDraw';
import { LAST_FOLIO, paintSandPage } from './sandPages';
import type { RareBookArt } from '../rareBookArt';

const PAPER: Paper = ['#e9dcbc', '#e2d2ae', '#d6c39b'];

/**
 * Les pages qui portent en ce moment le numéro 410 : chaque page est tirée à nouveau quand elle est
 * redessinée, on retient ce qui est sous les yeux.
 */
const lastFolios = new Set<number>();

/**
 * Le Livre de sable : un livre sans première ni dernière page, dont les pages ne reviennent jamais.
 * Couverture : un désert, et le titre qui s'en va en grains (sandCover.ts) ; dedans, un livre saint de
 * charabia aux numéros sans suite (sandPages.ts), chaque page tirée à nouveau chaque fois qu'on la dessine.
 */
export const sandArt: RareBookArt = {
  thickness: THICKNESS,
  paper: PAPER,
  look: async () => {
    await loadSandFonts();
    return {
      cover: sandFront(),
      back: sandBack(),
      inside: sandInside(),
      spine: sandSpine(),
      leather: Number.parseInt(LEATHER.slice(1), 16),
      edge: edgeTexture(PAPER[1], '#c9b58c'),
      paper: PAPER[0],
      headband: headbandTexture('#c9a052', '#4a2a16'),
    };
  },
  prepare: async () => {
    await loadSandFonts();
  },
  paint: (page, canvas, spineOnLeft) => {
    const context = preparePageTexture(canvas, spineOnLeft, PAPER);
    const { folio } = paintSandPage(context, spineOnLeft, page === 1, 1 + Math.floor(Math.random() * 2147483645));
    if (folio === LAST_FOLIO) lastFolios.add(page);
    else lastFolios.delete(page);
    return true;
  },
  // Secret : une page numérotée 410, la dernière de tous les livres de Babel, dans le seul qui n'en a pas.
  passed: (page, state) => {
    if (lastFolios.has(page)) sealEvent(state, 'sandLastPage');
  },
};
