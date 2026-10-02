import { preparePageTexture, type Paper } from '../../book/pageRender';
import { getLocale } from '../../../i18n';
import { CONTENTS_PAGE, layoutClassic, type ClassicLayout, type ClassicStyle } from './classicLayout';
import { classicLinks, paintClassicPage } from './classicPages';
import { loadClassicText, type ClassicText } from './classicText';
import type { RareBookArt, RareBookLook } from '../rareBookArt';
import type { CoverDesign } from '../../../systems/coverDesign';
import type { GameState } from '../../../core/state';

/** Ce qui est propre à chaque classique : son texte (public/texts/<id>.*.json), sa couverture, sa page de titre, son style. */
export interface ClassicBook {
  id: string;
  style: ClassicStyle;
  paper: Paper;
  thickness?: number;
  /** Les polices du livre, chargées avant la mise en page. */
  fonts: () => Promise<unknown>;
  cover: (state: GameState, design: CoverDesign) => RareBookLook | Promise<RareBookLook>;
  titlePage: (context: CanvasRenderingContext2D) => void;
  /** « Table des matières », dans la langue du jeu. */
  contentsHeading: () => string;
}

/**
 * Un classique du domaine public en livre rare : la page de titre de l'édition d'origine, la table des
 * matières (cliquable, où mène le signet), puis tout le vrai texte jusqu'à la 410e page au plus ; après
 * la fin, des pages blanches. Le texte est chargé et mis en page à l'ouverture (look).
 */
export const classicArt = (book: ClassicBook): RareBookArt => {
  let laid: { locale: string; text: ClassicText; layout: ClassicLayout } | null = null;
  const layOut = async (): Promise<void> => {
    const locale = getLocale();
    if (laid?.locale === locale) return;
    const text = await loadClassicText(book.id, locale);
    const context = document.createElement('canvas').getContext('2d')!;
    laid = { locale, text, layout: layoutClassic(context, text, book.style) };
  };
  return {
    thickness: book.thickness,
    paper: book.paper,
    look: async (state, design) => {
      await book.fonts();
      // Sans texte (hors ligne…), le livre reste beau dehors ; dedans, des pages blanches.
      await layOut().catch(() => undefined);
      return book.cover(state, design);
    },
    paint: (page, canvas, spineOnLeft) => {
      const context = preparePageTexture(canvas, spineOnLeft, book.paper);
      if (page === 1) book.titlePage(context);
      else if (laid) paintClassicPage(context, page, laid.text, laid.layout, book.style, book.contentsHeading());
      return true;
    },
    bookmark: CONTENTS_PAGE,
    links: (page) => classicLinks(page, laid?.layout ?? null),
  };
};
