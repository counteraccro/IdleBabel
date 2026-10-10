import { messages } from '../../../i18n';
import { PAGE_CENTER } from '../draw';
import { titled } from '../classic/classicLayout';
import { DIDOT, OLD, print } from './centerEarthCover';
import type { Paper } from '../../book/pageRender';

/**
 * Les pages, d'après .ai/maquette-voyage-centre-terre.html : la page de titre de chaque édition (Hetzel en
 * français, Ward, Lock & Co. en anglais), l'ouverture des chapitres (un chiffre romain chez Hetzel, les titres
 * de Malleson en anglais). Les y sont des lignes de base, comme sur la maquette.
 */
export const PAPER: Paper = ['#f5eedc', '#efe5ce', '#e8dcc0'];
export const INK = '#231c16';
export const BODY_SIZE = 17;
export const BODY_LINE = 26;

/** Les lignes de la page de titre : leur police et leur espacement, par sorte (i18n titlePage). */
const KINDS: Record<string, [string, number]> = {
  series: [`13px ${OLD}`, 2],
  collection: [`15px ${OLD}`, 4],
  big: [`700 48px ${DIDOT}`, 6],
  au: [`italic 22px ${DIDOT}`, 2],
  title: [`700 34px ${DIDOT}`, 3],
  by: [`13px ${OLD}`, 4],
  author: [`700 24px ${OLD}`, 4],
  small: [`13px ${OLD}`, 2],
  city: [`18px ${OLD}`, 6],
  tiny: [`12px ${OLD}`, 1.5],
  bigEn: [`700 44px ${DIDOT}`, 5],
  into: [`italic 20px ${DIDOT}`, 4],
  titleEn: [`700 32px ${DIDOT}`, 2],
  from: [`13px ${OLD}`, 3],
  translated: [`12px ${OLD}`, 3],
  translator: [`15px ${OLD}`, 1.5],
  vicar: [`italic 15px ${OLD}`, 0],
  cityEn: [`18px ${OLD}`, 4],
  address: [`14px ${OLD}`, 1.5],
  year: [`16px ${OLD}`, 2],
};

const rule = (context: CanvasRenderingContext2D, y: number, half: number): void => {
  context.fillStyle = INK;
  context.fillRect(PAGE_CENTER - half, y, 2 * half, 1);
};

/** La page de titre, ligne par ligne ([y, sorte, texte] ; une sorte « rule » : un filet de demi-largeur texte). */
export const centerEarthTitlePage = (context: CanvasRenderingContext2D): void => {
  for (const [y, kind, text] of messages().rareBooks.centerEarth.titlePage as [number, string, string][]) {
    if (kind === 'rule') rule(context, y, Number(text));
    else print(context, text, PAGE_CENTER, y, KINDS[kind][0], INK, KINDS[kind][1]);
  }
};

/** L'ouverture d'un chapitre : sans titre (Hetzel), son seul chiffre romain ; avec (Malleson), « CHAPTER I. » et lui. */
export const centerEarthHead = (context: CanvasRenderingContext2D, title: string, label: string): void => {
  if (title) {
    print(context, `${label}.`, PAGE_CENTER, 160, `20px ${OLD}`, INK, 4);
    const text = titled(title.toUpperCase());
    context.font = `700 21px ${OLD}`;
    context.letterSpacing = '2px';
    const fits = context.measureText(text).width <= 500;
    context.letterSpacing = '0px';
    if (fits) {
      print(context, text, PAGE_CENTER, 206, `700 21px ${OLD}`, INK, 2);
      rule(context, 236, 28);
    } else {
      // Un titre trop long pour une ligne (« Preparations for Blasting a Passage… ») : sur deux, coupé au milieu.
      const words = text.split(' ');
      const half = Math.ceil(words.length / 2);
      [words.slice(0, half).join(' '), words.slice(half).join(' ')].forEach((line, row) =>
        print(context, line, PAGE_CENTER, 200 + row * 28, `700 19px ${OLD}`, INK, 2),
      );
      rule(context, 250, 28);
    }
  } else {
    print(context, label, PAGE_CENTER, 200, `700 34px ${DIDOT}`, INK);
    rule(context, 232, 28);
  }
};

/** Le nom d'un chapitre (table des matières) : son titre, ou « Chapitre IV » chez Hetzel. */
export const centerEarthChapter = (label: string, title: string): string => title || `${messages().rareBooks.centerEarth.chapter} ${label}`;

/** Le titre courant d'une page de droite : le nom du chapitre. */
export const centerEarthRunning = (label: string, title: string): string => centerEarthChapter(label, title).toUpperCase();
