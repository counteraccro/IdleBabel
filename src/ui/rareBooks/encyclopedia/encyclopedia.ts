import { getLocale } from '../../../i18n';
import { preparePageTexture } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { canvasTexture } from '../../book3d/textures';
import { board } from '../draw';
import { slowPieces } from '../slowDrawing';
import { loadClassicText } from '../classic/classicText';
import { CALF, encyclopediaBack, encyclopediaFront, encyclopediaSpine, sprinkledEdge } from './encyclopediaBinding';
import { loadEncyclopediaFonts } from './encyclopediaFonts';
import { CONTENTS_PAGE, layoutEncyclopedia, type EncyclopediaLayout } from './encyclopediaLayout';
import { PAPER, encyclopediaLinks, encyclopediaTitlePage, laidPaper, paintEncyclopediaPage } from './encyclopediaPages';
import type { RareBookArt } from '../rareBookArt';

/** Le dos de la maquette : 110 de large pour 800 de haut (le livre fait 1 de haut, le dos s'enroule sur 1,4 fois l'épaisseur). */
const THICKNESS = 110 / 800 / 1.4;

/** Les pièces de la reliure, longues à dessiner (les mouchetures du veau) : gardées par langue (le titre en dépend). */
const pieces = slowPieces(
  {
    front: encyclopediaFront,
    back: encyclopediaBack,
    spine: () => encyclopediaSpine(THICKNESS),
  },
  getLocale,
);

/** Dessine la reliure à l'avance, par petits morceaux quand le navigateur est libre (le livre arrive sans à-coup). */
const warm = async (): Promise<void> => {
  await loadEncyclopediaFonts();
  await pieces.ahead();
};

let laid: EncyclopediaLayout | null = null;
/** La préparation (polices, texte, mise en page), faite une fois : le texte est le même dans les deux langues. */
let preparing: Promise<void> | null = null;
const prepare = (): Promise<void> => {
  if (!preparing) {
    const done = (async () => {
      await loadEncyclopediaFonts();
      const text = await loadClassicText('encyclopedia', 'fr');
      laid = await layoutEncyclopedia(document.createElement('canvas').getContext('2d')!, text);
    })();
    // Un échec (hors ligne…) ne reste pas : on réessaiera à la prochaine ouverture.
    done.catch(() => {
      if (preparing === done) preparing = null;
    });
    preparing = done;
  }
  return preparing;
};

/**
 * L'« Encyclopédie, ou Dictionnaire raisonné des sciences, des arts et des métiers » de Diderot et d'Alembert,
 * tome I (Paris, 1751), dans la reliure de veau marbré des souscripteurs ; dedans, en français dans les deux
 * langues du jeu (Wikisource, orthographe de 1751), le Discours préliminaire de d'Alembert, puis les articles
 * qui parlent de la Bibliothèque (Alphabet, Babel, Bibliothèque, Encyclopédie, Livre…), dans l'ordre
 * alphabétique, sur deux colonnes ; une table des articles en tête. Les notes ne sont pas reprises.
 */
export const encyclopediaArt: RareBookArt = {
  thickness: THICKNESS,
  paper: PAPER,
  // Sans texte (hors ligne…), des pages blanches ; le livre reste beau dehors.
  prepare: () => prepare().catch(() => undefined),
  look: async () => {
    await Promise.all([loadEncyclopediaFonts(), warm().catch(() => undefined)]);
    return {
      cover: canvasTexture(pieces.now('front')),
      back: canvasTexture(pieces.now('back')),
      // L'intérieur des plats : un veau plus sombre (crème, il se confondrait avec les pages).
      inside: board('#45260f', '#24130a'),
      spine: canvasTexture(pieces.now('spine')),
      leather: Number.parseInt(CALF[1].slice(1), 16),
      edge: sprinkledEdge(PAPER[1]),
      paper: PAPER[0],
      headband: headbandTexture('#9a2a1e', '#d9c48f'),
    };
  },
  paint: (page, canvas, spineOnLeft) => {
    const context = preparePageTexture(canvas, spineOnLeft, PAPER);
    laidPaper(context, page);
    if (page === 1) encyclopediaTitlePage(context);
    else if (laid) paintEncyclopediaPage(context, page, laid);
    return true;
  },
  bookmark: CONTENTS_PAGE,
  links: (page) => encyclopediaLinks(page, laid),
};
