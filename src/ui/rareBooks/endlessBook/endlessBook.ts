import { getLocale } from '../../../i18n';
import { preparePageTexture, type Paper } from '../../book/pageRender';
import { headbandTexture } from '../../book3d/headband';
import { edgeTexture } from '../../book3d/textures';
import { ENDLESS_BOOK_ID, followParagraph, seeParagraphs } from '../../../systems/endlessBook';
import { plainBoard } from '../draw';
import { loadBookText } from '../classic/classicText';
import { keepLayout } from '../keptLayouts';
import { BLACK, GREEN, endlessBookBack, endlessBookFront, endlessBookSpine, loadEndlessBookFonts } from './endlessBookCover';
import { FIRST_PAGE, layoutEndless, type EndlessLayout, type EndlessText } from './endlessBookLayout';
import { endlessLinks, paintEndlessPage, paintLegalPage, paintRulesPage, paintTitlePage } from './endlessBookPages';
import type { RareBookArt } from '../rareBookArt';

/** Le dos de la maquette : 100 de large pour 800 de haut (le dos s'enroule sur 1,4 fois l'épaisseur). */
const THICKNESS = 100 / 800 / 1.4;

/** Le papier crème de la maquette, un peu plus jaune en bas. */
const PAPER: Paper = ['#f3ead6', '#eee3cb', '#e8dcc0'];

/** La mise en page gardée (keptLayouts.ts), la préparation en cours, et combien de fois elle a été oubliée. */
let laid: { locale: string; layout: EndlessLayout } | null = null;
let preparing: { locale: string; done: Promise<void> } | null = null;
let forgotten = 0;

const forget = (): void => {
  laid = null;
  preparing = null;
  forgotten++;
};

const prepare = (): Promise<void> => {
  const locale = getLocale();
  keepLayout(forget);
  if (preparing?.locale !== locale) {
    const since = forgotten;
    const done = (async () => {
      await loadEndlessBookFonts();
      const text = await loadBookText<EndlessText>(ENDLESS_BOOK_ID, locale);
      const layout = await layoutEndless(document.createElement('canvas').getContext('2d')!, text);
      if (forgotten === since && getLocale() === locale) laid = { locale, layout };
    })();
    // Un échec (hors ligne…) ne reste pas : on réessaiera à la prochaine ouverture.
    done.catch(() => {
      if (preparing?.done === done) preparing = null;
    });
    preparing = { locale, done };
  }
  return preparing.done;
};

/**
 * « Le Livre sans fin… sauf une ? » (maquette .ai/maquette-livre-sans-fin.html, piste A) : un livre-jeu des années 80,
 * cent paragraphes et une seule fin. Son texte (public/texts/endlessBook.*.json) n'est chargé et mis en page que pour
 * être lu. Dans la bibliothèque, les choix se cliquent (les pages tournent jusqu'au paragraphe ; le 81, qui renvoie au
 * 81, fait trembler le livre), et le chemin suivi peut valoir deux sceaux secrets (systems/endlessBook.ts).
 */
export const endlessBookArt: RareBookArt = {
  thickness: THICKNESS,
  paper: PAPER,
  prepare: () => prepare().catch(() => undefined),
  look: async () => {
    await loadEndlessBookFonts();
    return {
      cover: endlessBookFront(),
      back: endlessBookBack(),
      inside: plainBoard('#1c1a1e', BLACK),
      spine: endlessBookSpine(THICKNESS),
      leather: Number.parseInt(BLACK.slice(1), 16),
      // Un poche : des tranches de papier blanc, à peine jaunies.
      edge: edgeTexture('#efe6d0', '#d8ccae'),
      paper: PAPER[0],
      headband: headbandTexture(GREEN, '#e8dcc0'),
      ribbon: '#1d6b5e',
    };
  },
  paint: (page, canvas, spineOnLeft) => {
    const context = preparePageTexture(canvas, spineOnLeft, PAPER);
    if (page === 1) paintTitlePage(context);
    else if (page === 2) paintLegalPage(context);
    else if (page === 3) paintRulesPage(context);
    else if (laid) paintEndlessPage(context, page, laid.layout);
    return true;
  },
  // Le signet est au 1 : on y revient à chaque mort.
  bookmark: FIRST_PAGE,
  links: (page) => (laid ? endlessLinks(page, laid.layout) : []),
  followed: (page, link, state) => {
    const choice = laid?.layout.choices.get(link);
    if (choice) followParagraph(state, choice.from, choice.to, Math.floor(link.target / 2));
  },
  shown: (page, state) => {
    const starts = laid?.layout.pages.get(page)?.starts;
    if (starts) seeParagraphs(state, starts, Math.floor(page / 2));
  },
};
