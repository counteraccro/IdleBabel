import '@fontsource/eb-garamond/400.css';
import { getLocale } from '../../../i18n';
import { TITLE } from '../draw';
import { CONTENTS_PAGE, GARAMOND, contentsBaselines, layoutIdleBabel, type BookLayout } from './idleBabelLayout';
import { loadPlateArt } from './idleBabelPlates';
import type { PageLink } from '../rareBookArt';

/**
 * Les pages du livre « Idle Babel » : préparées une fois par langue (polices, couvertures et pistes écartées,
 * mise en page), puis dessinées à la demande. Le sommaire mène à chaque chapitre et à chaque partie.
 */

let laid: { locale: string; layout: BookLayout } | null = null;
let preparing: { locale: string; done: Promise<void> } | null = null;

const loadFonts = (): Promise<unknown> =>
  Promise.all(
    [`21px ${GARAMOND}`, `italic 21px ${GARAMOND}`, `500 40px ${TITLE}`, `600 40px ${TITLE}`].map((font) => document.fonts.load(font)),
  );

/** Prépare le livre dans la langue du jeu ; sans illustrations (hors ligne…), les planches restent vides. */
export const prepareIdleBabelPages = (): Promise<void> => {
  const locale = getLocale();
  if (preparing?.locale !== locale) {
    const done = (async () => {
      const [art] = await Promise.all([loadPlateArt(), loadFonts()]);
      const measure = document.createElement('canvas').getContext('2d')!;
      laid = { locale, layout: layoutIdleBabel(measure, art) };
    })();
    // Un échec (hors ligne…) ne reste pas : on réessaiera à la prochaine ouverture.
    done.catch(() => {
      if (preparing?.done === done) preparing = null;
    });
    preparing = { locale, done };
  }
  return preparing.done;
};

/** Dessine la page `page` ; false tant que le livre n'est pas prêt dans la langue du jeu (la page reste vierge). */
export const paintIdleBabelPage = (context: CanvasRenderingContext2D, page: number): boolean => {
  if (laid?.locale !== getLocale()) return false;
  laid.layout.pages.get(page)?.(context);
  return true;
};

/** Les lignes du sommaire mènent à leur chapitre ou à leur partie. */
export const idleBabelLinks = (page: number): PageLink[] => {
  if (page !== CONTENTS_PAGE || laid?.locale !== getLocale()) return [];
  const { contents } = laid.layout;
  return contentsBaselines(contents).map((y, i) => ({
    y: y - (contents[i].part ? 20 : 26),
    height: contents[i].part ? 26 : 34,
    target: contents[i].page,
  }));
};
