import { preparePageTexture, type Paper } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { board } from '../draw';
import { LEATHER, bibleBack, bibleFront, bibleSpine, bibleTitlePage, giltEdge, loadBibleFonts } from './bibleCover';
import { CONTENTS_PAGE } from './bibleBooks';
import { bibleLinks, paintBiblePage } from './biblePages';
import type { RareBookArt } from '../rareBookArt';

/** Le papier bible : fin, presque blanc. */
const PAPER: Paper = ['#f7f1e2', '#efe6cf', '#e2d5b6'];
/** Un gros livre. */
const THICKNESS = 0.15;

/**
 * La Bible : une Bible de famille du début du XXe siècle (chagrin noir, titre doré, tranches dorées). Dedans
 * la vraie page de titre (Segond 1910 en français, King James en anglais), la table des livres, les deux
 * Testaments et les 66 livres sous leurs vrais noms avec leurs vrais chapitres ; le texte, lui, en lorem
 * ipsum : choix de l'auteur, par respect, on ne cite pas les Écritures.
 */
export const bibleArt: RareBookArt = {
  thickness: THICKNESS,
  paper: PAPER,
  look: async () => {
    await loadBibleFonts();
    return {
      cover: bibleFront(),
      back: bibleBack(),
      inside: board('#1c1a18', '#0c0b0a'),
      spine: bibleSpine(THICKNESS),
      leather: Number.parseInt(LEATHER.slice(1), 16),
      // Les tranches dorées.
      edge: giltEdge(),
      paper: PAPER[0],
      headband: headbandTexture('#8a1c22', '#d9b25a'),
    };
  },
  paint: (page, canvas, spineOnLeft) => {
    const context = preparePageTexture(canvas, spineOnLeft, PAPER);
    context.textBaseline = 'alphabetic';
    if (page === 1) {
      bibleTitlePage(context);
      return true;
    }
    return paintBiblePage(context, page);
  },
  bookmark: CONTENTS_PAGE,
  links: bibleLinks,
};
