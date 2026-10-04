import { preparePageTexture, type Paper } from '../../book/pageRender';
import { getLocale } from '../../../i18n';
import { CONTENTS_PAGE, layoutClassic, type ClassicLayout, type ClassicStyle } from './classicLayout';
import { classicLinks, paintClassicPage } from './classicPages';
import { loadClassicText, type ClassicText } from './classicText';
import { keepLayout } from '../keptLayouts';
import type { RareBookArt, RareBookLook } from '../rareBookArt';
import type { CoverDesign } from '../../../systems/coverDesign';
import type { GameState } from '../../../core/state';

/** Ce qui est propre à chaque classique : son texte (public/texts/<id>.*.json), sa couverture, sa page de titre, son style. */
export interface ClassicBook {
  id: string;
  /** Les langues dont on a le texte (sans : toutes) ; dans une autre langue, on lit la première. */
  locales?: string[];
  style: ClassicStyle;
  paper: Paper;
  thickness?: number;
  /** Les polices du livre, chargées avant la mise en page. */
  fonts: () => Promise<unknown>;
  /** Dessine à l'avance ce que `cover` est long à dessiner (appelé par look, avant cover). */
  warm?: () => Promise<unknown>;
  cover: (state: GameState, design: CoverDesign) => RareBookLook | Promise<RareBookLook>;
  titlePage: (context: CanvasRenderingContext2D) => void;
  /**
   * Une page avant la page de titre (le fac-similé d'une autre édition) : elle prend la page 1, la page de
   * titre la 3 ; le style place alors la table des matières plus loin (`contentsPage`).
   */
  flyleaf?: (context: CanvasRenderingContext2D) => void;
  /** Ce qui marque le papier de chaque page (piqûres, rousseurs), dessiné avant le texte. */
  decorate?: (context: CanvasRenderingContext2D, page: number) => void;
  /** « Table des matières », dans la langue du jeu. */
  contentsHeading: () => string;
}

/**
 * Le texte sans ses paragraphes, une fois mis en page : les lignes posées les portent déjà, il ne reste à
 * lire que les titres et les numéros des chapitres (table des matières, titres courants). Moitié moins de
 * mémoire par livre gardé.
 */
const headings = (text: ClassicText): ClassicText => ({ chapters: text.chapters.map((chapter) => ({ ...chapter, paras: [] })) });

/**
 * Un classique du domaine public en livre rare : la page de titre de l'édition d'origine, la table des
 * matières (cliquable, où mène le signet), puis tout le vrai texte jusqu'à la 410e page au plus ; après
 * la fin, des pages blanches. Le texte n'est chargé et mis en page que pour être lu (prepare), pas pour la
 * couverture : la vitrine de la bibliothèque n'en charge aucun.
 */
export const classicArt = (book: ClassicBook): RareBookArt => {
  let laid: { locale: string; text: ClassicText; layout: ClassicLayout } | null = null;
  /** La préparation en cours ou faite (polices, texte, mise en page), pour la langue `locale`. */
  let preparing: { locale: string; done: Promise<void> } | null = null;
  /** La langue du texte : celle du jeu si on l'a. */
  const textLocale = (): string => {
    const locale = getLocale();
    return !book.locales || book.locales.includes(locale) ? locale : book.locales[0];
  };
  /** Combien de fois la mise en page a été oubliée : une préparation commencée avant ne garde rien. */
  let forgotten = 0;
  /** Oublie la mise en page (keptLayouts.ts) : elle sera refaite à la prochaine ouverture. */
  const forget = (): void => {
    laid = null;
    preparing = null;
    forgotten++;
  };
  const prepare = (): Promise<void> => {
    const locale = textLocale();
    keepLayout(forget);
    if (preparing?.locale !== locale) {
      const since = forgotten;
      const done = (async () => {
        await book.fonts();
        const text = await loadClassicText(book.id, locale);
        const context = document.createElement('canvas').getContext('2d')!;
        const layout = await layoutClassic(context, text, book.style);
        // Oublié entre-temps, ou une autre langue demandée : rien n'est gardé.
        if (forgotten === since && textLocale() === locale) laid = { locale, text: headings(text), layout };
      })();
      // Un échec (hors ligne…) ne reste pas : on réessaiera à la prochaine ouverture.
      done.catch(() => {
        if (preparing?.done === done) preparing = null;
      });
      preparing = { locale, done };
    }
    return preparing.done;
  };
  return {
    thickness: book.thickness,
    paper: book.paper,
    // Sans texte (hors ligne…), des pages blanches ; le livre reste beau dehors.
    prepare: () => prepare().catch(() => undefined),
    look: async (state, design) => {
      // La reliure longue à dessiner l'est par morceaux pendant que les polices arrivent : cover la reprend.
      await Promise.all([book.fonts(), book.warm?.().catch(() => undefined)]);
      return book.cover(state, design);
    },
    paint: (page, canvas, spineOnLeft) => {
      const context = preparePageTexture(canvas, spineOnLeft, book.paper);
      book.decorate?.(context, page);
      if (page === 1) (book.flyleaf ?? book.titlePage)(context);
      else if (page === 3 && book.flyleaf) book.titlePage(context);
      else if (laid) paintClassicPage(context, page, laid.text, laid.layout, book.style, book.contentsHeading());
      return true;
    },
    bookmark: book.style.contentsPage ?? CONTENTS_PAGE,
    links: (page) => classicLinks(page, laid?.layout ?? null),
  };
};
