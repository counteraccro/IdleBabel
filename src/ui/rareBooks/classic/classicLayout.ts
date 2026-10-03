import { PAGES_PER_BOOK } from '../../../systems/books';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import type { ClassicText } from './classicText';

/**
 * La mise en page d'un classique : tout son texte, réparti sur les 410 pages comme dans un vrai livre
 * (chaque chapitre s'ouvre sur une page de droite si le style le veut, lettrine, strophes en retrait). Ce
 * qui dépasse la 410e page est coupé ; ce qui reste après la fin du texte est blanc. Un livre trop long
 * pour ses 410 pages peut n'en garder que le début de chaque chapitre (`chapterPages`).
 */

export interface ClassicStyle {
  /** Police du texte, sa taille et son interligne. */
  body: string;
  size: number;
  line: number;
  ink: string;
  /** Couleur et police de la lettrine (sans police : pas de lettrine). */
  accent: string;
  dropCap?: string;
  /** Une lettrine dessinée (une lettre ornée dans son cadre), à la place de la police `dropCap`. */
  dropCapBox?: DropCapBox;
  /** Police des titres de chapitre. */
  heading: string;
  /** Chaque chapitre commence sur une page de droite (une page blanche avant si besoin). */
  chaptersOnRight: boolean;
  /** Au plus ce nombre de pages par chapitre : on s'arrête au dernier paragraphe entier qui y tient. */
  chapterPages?: number;
  /** Le haut de l'ouverture d'un chapitre, propre au livre (sans : son numéro, son titre, un filet). */
  head?: (context: CanvasRenderingContext2D, title: string, label: string) => void;
  /** La page de la table des matières (sans : la 3e, après la page de titre). */
  contentsPage?: number;
  /** Le nom d'une partie hors série dans la table (sans : son nom de partie, « Epilogue »). */
  contentsName?: (label: string, title: string) => string;
  /** Un titre trop long pour une ligne de la table y tient sur deux, plus petit (sans : sur une seule, rapetissé). */
  contentsWrap?: boolean;
  /** Le texte justifié (sauf la dernière ligne de chaque paragraphe) ; sans : aligné à gauche. */
  justify?: boolean;
  /**
   * Des paragraphes numérotés (« 12. Puis… », les tercets de Dante) : le numéro sort du texte et pend dans la
   * marge, à `gap` à gauche du texte, dans sa police ; les paragraphes ne sont plus en retrait. Celui de la
   * lettrine perd le sien.
   */
  numbers?: { font: string; gap: number };
  /** Le titre d'une histoire au fil du texte (ClassicChapter.inline) : centré, dans cette police. */
  inlineHeading?: { font: string; spacing: number };
  /** Les premiers mots d'un chapitre en capitales (« LE COMTE d’Olavidez »), quand il n'a pas de lettrine. */
  openingCaps?: number;
  /** Une ligne seule en capitales plus courte que ça est centrée (« FIN. ») ; sans : 30 caractères. */
  centeredUpTo?: number;
  /** Des placements propres au livre, repris de sa maquette (sans : ceux du moteur). */
  marks?: ClassicMarks;
}

/** Une lettrine dessinée : un carré de `size` sur `lines` lignes, le texte à `gap` de lui. */
export interface DropCapBox {
  lines: number;
  size: number;
  gap: number;
  /** Dessine la lettre `letter` ; `baseline` : la ligne de base de la première ligne du paragraphe. */
  draw: (context: CanvasRenderingContext2D, letter: string, x: number, baseline: number) => void;
}

/** Les placements d'un livre (y : lignes de base, comme sur les maquettes). */
export interface ClassicMarks {
  /** La première ligne d'une page, et celle de l'ouverture d'un chapitre. */
  first: number;
  opening: number;
  /** Le titre courant (sans : aucun) ; `left` : celui des pages de gauche (le titre du livre), sinon celui du chapitre partout. */
  runningHead?: {
    font: string;
    color: string;
    spacing: number;
    y: number;
    left?: () => string;
    /** Celui des pages de droite, d'après le chapitre (sans : son titre). */
    right?: (label: string, title: string) => string;
  };
  /**
   * Le numéro de page, en bas au milieu ; `top` : sauf aux ouvertures, en haut dans le coin extérieur (au
   * milieu si `center`) ; `format` : sa forme (« ( 2 ) ») ; `openings: false` : aucun aux ouvertures.
   */
  folio: { font: string; color: string; y: number; top?: number; center?: boolean; format?: (page: number) => string; openings?: boolean };
  /** Les lignes centrées (les nuits) : leur police, un filet dessous (`rule` sous la ligne de base, demi-largeur `half`), la place en plus après. */
  centered: { font: string; spacing: number; rule: number; half: number; after: number };
  /** La lettrine a sa ligne de base sur celle de la 2e ligne. */
  dropCapOnSecondLine: boolean;
}

const { width: WIDTH, height: HEIGHT } = PAGE_TEXTURE;
export const LEFT = 64;
export const RIGHT = WIDTH - 64;
const TOP = 88;
const BOTTOM = HEIGHT - 82;
/** Haut du texte sous le titre d'un chapitre. */
export const OPENING_TOP = 300;
/** La page de titre, puis la table des matières à partir de la page 3. */
export const CONTENTS_PAGE = 3;
export const CONTENTS_ROWS = 14;
const INDENT = 26;
const VERSE_INDENT = 48;

/** Une ligne posée sur sa page (y : haut de la ligne). */
export interface PlacedLine {
  text: string;
  x: number;
  y: number;
  center?: boolean;
  /** Justifiée : la largeur sur laquelle étaler ses mots. */
  justify?: number;
  /** Le numéro du paragraphe, dans la marge (style.numbers). */
  number?: string;
  /** Le titre d'une histoire au fil du texte (style.inlineHeading). */
  heading?: boolean;
}

export interface ClassicPage {
  chapter: number;
  opening: boolean;
  lines: PlacedLine[];
  /** La lettrine de l'ouverture du chapitre, et sa place. */
  dropCap?: { letter: string; x: number; y: number; size: number };
}

export interface ClassicLayout {
  pages: Map<number, ClassicPage>;
  /** La page où s'ouvre chaque chapitre (les chapitres coupés par la fin du livre n'en ont pas). */
  starts: number[];
  /** La première page de la table des matières, et leur nombre. */
  contentsPage: number;
  contentsPages: number;
}

/** Les mots de `text` en lignes, la i-ième d'au plus `width(i)` de large. */
const wrapVarying = (context: CanvasRenderingContext2D, text: string, width: (line: number) => number): string[] => {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    const tried = line ? `${line} ${word}` : word;
    if (line && context.measureText(tried).width > width(lines.length)) {
      lines.push(line);
      line = word;
    } else line = tried;
  }
  return line ? [...lines, line] : lines;
};

/** Un titre suivi d'un point, sauf s'il finit déjà par une ponctuation. */
export const titled = (title: string): string => (/[.!?]$/.test(title) ? title : `${title}.`);

/** Une ligne seule et courte, en capitales (« FIN. », « THE END ») : centrée. */
const isCentered = (para: string, upTo = 30): boolean => para.length < upTo && !para.includes('\n') && para === para.toUpperCase();

/** La mise en page, un paragraphe à la fois : elle s'arrête (yield) après chacun. */
function* layoutSteps(context: CanvasRenderingContext2D, text: ClassicText, style: ClassicStyle): Generator<void, ClassicLayout> {
  const font = `${style.size}px ${style.body}`;
  const pages = new Map<number, ClassicPage>();
  const starts: number[] = [];
  const contentsPages = Math.ceil(text.chapters.length / CONTENTS_ROWS);
  const contentsPage = style.contentsPage ?? CONTENTS_PAGE;
  const done = (): ClassicLayout => ({ pages, starts, contentsPage, contentsPages });
  let page = contentsPage + contentsPages;
  // Le haut des lignes, d'après les lignes de base voulues (la police est posée par son ascendante).
  context.font = font;
  const ascent = context.measureText('M').fontBoundingBoxAscent;
  const top = style.marks ? style.marks.first - ascent : TOP;
  const openingTop = style.marks ? style.marks.opening - ascent : OPENING_TOP;
  let y = top;
  let current: ClassicPage | null = null;
  /** La dernière page permise au chapitre en cours. */
  let chapterEnd = PAGES_PER_BOOK;
  /** Va à la page suivante ; false : le livre (ou le chapitre) est plein. */
  const turn = (chapter: number, opening = false): boolean => {
    if (current) page++;
    if (page > chapterEnd) return false;
    current = { chapter, opening, lines: [] };
    pages.set(page, current);
    y = opening ? openingTop : top;
    return true;
  };
  const place = (chapter: number, line: string, x: number, center = false, justify?: number, number?: string, heading = false): boolean => {
    if (y + style.line > BOTTOM && !turn(chapter)) return false;
    current!.lines.push({
      text: line,
      x,
      y,
      center,
      ...(justify ? { justify } : {}),
      ...(number ? { number } : {}),
      ...(heading ? { heading } : {}),
    });
    y += style.line;
    return true;
  };
  /** La largeur où étaler la ligne `row` d'un paragraphe, si le livre est justifié (jamais sa dernière ligne). */
  const justified = (lines: string[], row: number, width: (n: number) => number): number | undefined =>
    style.justify && row < lines.length - 1 ? width(row) : undefined;
  /** Pose le paragraphe `para` ; false : il ne tient plus. */
  const placePara = (chapter: number, index: number, para: string): boolean => {
    context.font = font;
    if (para.includes('\n')) {
      // Une strophe : un vers par ligne, en retrait (un vers trop long continue un peu plus loin).
      y += style.line / 2;
      for (const verse of para.split('\n'))
        for (const [row, line] of wrapVarying(context, verse, (n) => RIGHT - LEFT - VERSE_INDENT - (n ? 24 : 0)).entries())
          if (!place(chapter, line, LEFT + VERSE_INDENT + (row ? 24 : 0))) return false;
      y += style.line / 2;
      return true;
    }
    if (isCentered(para, style.centeredUpTo)) {
      y += style.line;
      if (!place(chapter, para, WIDTH / 2, true)) return false;
      y += style.marks?.centered.after ?? 0;
      return true;
    }
    // Un paragraphe numéroté : son numéro ira dans la marge.
    const numbered = style.numbers ? /^(\d+)\. /.exec(para) : null;
    if (numbered) para = para.slice(numbered[0].length);
    // Le premier paragraphe du chapitre : une lettrine (sur deux lignes, ou celles de la lettrine dessinée),
    // si le texte commence par une lettre.
    const box = style.dropCapBox;
    const opening = index === 0 && !text.chapters[chapter].inline;
    const letter = (style.dropCap || box) && opening && /^\p{L}/u.test(para) ? para[0] : '';
    if (letter) {
      const size = box ? box.size : style.line * 2.3;
      const rows = box ? box.lines : 2;
      context.font = `${size}px ${style.dropCap}`;
      const drop = box ? box.size + box.gap : context.measureText(letter).width + 8;
      context.font = font;
      current!.dropCap = { letter, x: LEFT, y, size };
      const width = (n: number): number => RIGHT - LEFT - (n < rows ? drop : 0);
      const lines = wrapVarying(context, para.slice(1), width);
      const placed = lines.every((line, row) => place(chapter, line, LEFT + (row < rows ? drop : 0), false, justified(lines, row, width)));
      // Un paragraphe plus court que la lettrine : le suivant commence sous elle.
      if (placed && lines.length < rows) y += (rows - lines.length) * style.line;
      return placed;
    }
    if (opening && style.openingCaps) {
      const words = para.split(' ');
      para = [...words.slice(0, style.openingCaps).map((word) => word.toUpperCase()), ...words.slice(style.openingCaps)].join(' ');
    }
    const indent = style.numbers ? 0 : INDENT;
    const width = (n: number): number => RIGHT - LEFT - (n ? 0 : indent);
    const lines = wrapVarying(context, para, width);
    const number = numbered ? `${numbered[1]}.` : undefined;
    return lines.every((line, row) =>
      place(chapter, line, LEFT + (row ? 0 : indent), false, justified(lines, row, width), row ? undefined : number),
    );
  };
  for (const [chapter, { paras, inline, quiet, title }] of text.chapters.entries()) {
    if (inline && current) {
      // Une histoire au fil du texte : une ligne blanche, son titre (s'il est imprimé), et le texte continue.
      if (!quiet && style.inlineHeading) {
        y += style.line;
        if (!place(chapter, titled(title), WIDTH / 2, true, undefined, undefined, true)) return done();
        starts.push(page);
        y += style.line / 2;
      } else {
        const start = y + style.line > BOTTOM ? page + 1 : page;
        if (start > chapterEnd) return done();
        starts.push(start);
      }
    } else {
      if (current) page++;
      if (style.chaptersOnRight && page % 2 === 0) page++;
      current = null;
      if (page > PAGES_PER_BOOK) break;
      chapterEnd = Math.min(PAGES_PER_BOOK, page + (style.chapterPages ?? Infinity) - 1);
      turn(chapter, true);
      starts.push(page);
    }
    for (const [index, para] of paras.entries()) {
      yield;
      const before: { page: number; y: number; current: ClassicPage; lines: number } = {
        page,
        y,
        current: current!,
        lines: current!.lines.length,
      };
      if (placePara(chapter, index, para)) continue;
      // Le livre est plein : le texte s'arrête où il en est. Le chapitre est plein : il s'arrête à la fin du
      // paragraphe d'avant (sauf s'il n'en a pas d'entier).
      if (chapterEnd === PAGES_PER_BOOK || index === 0) {
        if (chapterEnd === PAGES_PER_BOOK) return done();
        page = chapterEnd;
        break;
      }
      for (let extra = before.page + 1; extra <= page; extra++) pages.delete(extra);
      ({ page, y, current } = before);
      current.lines.length = before.lines;
      break;
    }
  }
  return done();
}

/**
 * Rend la main au navigateur (sans les ralentissements de setTimeout dans un onglet caché). Un seul canal,
 * réutilisé : un canal neuf par pause, jamais fermé, resterait en mémoire.
 */
let channel: MessageChannel | null = null;
const waiting: (() => void)[] = [];
const pause = (): Promise<void> =>
  new Promise((resolve) => {
    if (!channel) {
      channel = new MessageChannel();
      channel.port1.onmessage = () => waiting.shift()?.();
    }
    waiting.push(resolve);
    channel.port2.postMessage(null);
  });

/** Temps de calcul d'affilée, en ms, avant de rendre la main : pas d'à-coup, même en lisant vite. */
const SLICE = 6;

/**
 * Met en page tout le livre, par petits morceaux entre deux images (un gros classique prend ~200 ms
 * de calcul en tout).
 */
export const layoutClassic = async (context: CanvasRenderingContext2D, text: ClassicText, style: ClassicStyle): Promise<ClassicLayout> => {
  const steps = layoutSteps(context, text, style);
  let since = performance.now();
  for (;;) {
    const step = steps.next();
    if (step.done) return step.value;
    if (performance.now() - since > SLICE) {
      await pause();
      since = performance.now();
    }
  }
};
