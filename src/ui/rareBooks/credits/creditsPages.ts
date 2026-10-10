import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/eb-garamond/400-italic.css';
import { messages } from '../../../i18n';
import { PAGES_PER_BOOK } from '../../../systems/books';
import { PAGE_TEXTURE } from '../../book/pageLayout';
import { TITLE } from '../draw';
import { hexagon, write } from './creditsCover';
import type { PageLink } from '../rareBookArt';

/**
 * Les pages du livre des crédits (maquette .ai/maquette-credits-pages.html, papier blanc) : un livre moderne
 * ordinaire, l'encre est le bleu nuit de la toile, les titres en Cinzel comme la couverture, les noms en
 * Garamond ; le générique garde sa mise en page de film (le rôle à gauche du milieu, le nom à droite).
 * Mesures de la maquette (page 640 × 800 : celles de la texture).
 */

const GARAMOND = "'EB Garamond', Georgia, serif";
const INK = '#1c2440';
const SOFT = '#6b7590';
const RULE = 'rgba(28,36,64,0.5)';
const { width: WIDTH, height: HEIGHT } = PAGE_TEXTURE;
const CENTER = WIDTH / 2;

/** Le profil GitHub de l'auteur, et le dépôt du jeu (page de l'avant-propos). */
const PROFILE = 'github.com/counteraccro';
const REPOSITORY = 'github.com/counteraccro/IdleBabel';

/** Où commence chaque partie, dans l'ordre du sommaire (pages.parts) ; la dernière est la toute dernière page. */
export const FOREWORD_PAGE = 3;
export const CONTENTS_PAGE = 5;
const PARTS = [FOREWORD_PAGE, 7, 9, 11, 13, PAGES_PER_BOOK];
const [, ROLL_PAGE, TEXTS_PAGE, FONTS_PAGE, NOTES_PAGE, COLOPHON_PAGE] = PARTS;
/** Les notes de mise à jour : le lien de la version, au pied de l’écran, y ouvre le livre. */
export { NOTES_PAGE };

/** Les polices du jeu et qui les a dessinées (toutes sous SIL Open Font License). */
const FONTS: [string, string][] = [
  ['Cinzel', 'Natanael Gama'],
  ['Cinzel Decorative', 'Natanael Gama'],
  ['EB Garamond', 'Georg Duffner'],
  ['Libre Caslon Text', 'Impallari Type'],
  ['IM Fell', 'Igino Marini'],
  ['Cormorant Garamond', 'Christian Thalmann'],
  ['Libre Baskerville', 'Impallari Type'],
  ['Playfair Display', 'Claus Eggers Sørensen'],
  ['Old Standard TT', 'Alexey Kryukov'],
  ['Bodoni Moda', 'Owen Earl'],
  ['Noto Sans Runic', 'Google'],
  ['UnifrakturMaguntia', 'J. « Mach » Wust'],
  ['Oswald', 'Vernon Adams'],
  ['Inter', 'Rasmus Andersson'],
  ['Libre Franklin', 'Impallari Type'],
  ['JetBrains Mono', 'JetBrains'],
  ['Space Mono', 'Colophon Foundry'],
  ['DM Serif Display', 'Colophon Foundry'],
  ['Caveat', 'Impallari Type'],
  ['Nothing You Could Do', 'Kimberly Geswein'],
];

export const loadCreditsPageFonts = (): Promise<unknown> =>
  Promise.all([`400 40px ${GARAMOND}`, `500 40px ${GARAMOND}`, `italic 40px ${GARAMOND}`].map((font) => document.fonts.load(font)));

const text = () => messages().rareBooks.credits.pages;

const folio = (context: CanvasRenderingContext2D, page: number): void =>
  write(context, String(page), CENTER, HEIGHT - 56, { font: `500 14px ${TITLE}`, color: SOFT, spacing: 2 });

/** Le titre d'une partie, et son petit hexagone. */
const heading = (context: CanvasRenderingContext2D, title: string, y = 120): void => {
  write(context, title.toLocaleUpperCase(), CENTER, y, { font: `600 30px ${TITLE}`, color: INK, spacing: 6 });
  context.fillStyle = INK;
  hexagon(context, CENTER, y + 30, 4);
  context.fill();
};

/** Une entrée façon générique : le rôle à gauche du milieu, le nom (et sa suite) à droite. */
const credit = (context: CanvasRenderingContext2D, role: string, name: string, more: string, y: number): void => {
  write(context, role, CENTER - 16, y, { font: `500 13px ${TITLE}`, color: SOFT, spacing: 2, align: 'right' });
  write(context, name, CENTER + 16, y, { font: `400 22px ${GARAMOND}`, color: INK, align: 'left' });
  if (more) write(context, more, CENTER + 16, y + 24, { font: `italic 17px ${GARAMOND}`, color: SOFT, align: 'left' });
};

const titlePage = (context: CanvasRenderingContext2D): void => {
  const { game } = messages().rareBooks.credits;
  const { title, publisher } = text();
  write(context, game, CENTER, 230, { font: `500 22px ${TITLE}`, color: SOFT, spacing: 10 });
  write(context, title.toLocaleUpperCase(), CENTER, 320, { font: `600 64px ${TITLE}`, color: INK, spacing: 8 });
  context.fillStyle = INK;
  hexagon(context, CENTER, 365, 6);
  context.fill();
  write(context, publisher, CENTER, HEIGHT - 110, { font: `500 14px ${TITLE}`, color: SOFT, spacing: 4 });
};

/** Les deux liens de l'avant-propos : leur ligne de base, leur police (les mêmes pour les dessiner et les cliquer). */
const PROFILE_Y = 490;
const REPOSITORY_Y = 622;
const LINK_FONT = `500 22px ${GARAMOND}`;

/** Un lien hors du jeu : souligné, une petite flèche qui sort de la page (il s'ouvre dans un nouvel onglet). */
const link = (context: CanvasRenderingContext2D, address: string, y: number): void => {
  const label = `${address} ↗`;
  write(context, label, CENTER, y, { font: LINK_FONT, color: INK });
  context.font = LINK_FONT;
  const width = context.measureText(label).width;
  context.fillStyle = INK;
  context.fillRect(CENTER - width / 2, y + 6, width, 1.2);
};

const forewordPage = (context: CanvasRenderingContext2D): void => {
  const { foreword, author, about, codeIntro } = text();
  heading(context, foreword);
  write(context, author, CENTER, 250, { font: `600 26px ${TITLE}`, color: INK, spacing: 6 });
  about.forEach((line, i) => write(context, line, CENTER, 310 + i * 32, { font: `21px ${GARAMOND}`, color: INK }));
  link(context, PROFILE, PROFILE_Y);
  context.fillStyle = RULE;
  context.fillRect(CENTER - 30, 535, 60, 1);
  write(context, codeIntro, CENTER, 580, { font: `italic 19px ${GARAMOND}`, color: SOFT });
  link(context, REPOSITORY, REPOSITORY_Y);
  folio(context, FOREWORD_PAGE);
};

/** Le sommaire : ses lignes, de CONTENTS_TOP en CONTENTS_STEP (lignes de base). */
const CONTENTS_TOP = 260;
const CONTENTS_STEP = 56;

const contentsPage = (context: CanvasRenderingContext2D): void => {
  const { contents, parts } = text();
  heading(context, contents);
  parts.forEach((name, i) => {
    const y = CONTENTS_TOP + i * CONTENTS_STEP;
    const font = `400 24px ${GARAMOND}`;
    write(context, name, 90, y, { font, color: INK, align: 'left' });
    write(context, String(PARTS[i]), WIDTH - 90, y, { font: `500 16px ${TITLE}`, color: SOFT, align: 'right', spacing: 1 });
    context.font = font;
    context.fillStyle = RULE;
    for (let x = 90 + context.measureText(name).width + 12; x < WIDTH - 130; x += 9) context.fillRect(x, y - 5, 1.5, 1.5);
  });
  folio(context, CONTENTS_PAGE);
};

const rollPage = (context: CanvasRenderingContext2D): void => {
  const { parts, roll } = text();
  heading(context, parts[1]);
  let y = 230;
  for (const [role, name, more] of roll) {
    credit(context, role, name, more, y);
    y += more ? 74 : 50;
  }
  folio(context, ROLL_PAGE);
};

/** Les textes de la première page (sous le titre de la partie) ; les autres suivent sur son verso. */
const TEXTS_FIRST = 4;

/** Les textes, d'abord sous le titre de la partie, puis sur la page suivante, plus haut. */
const textsPage = (context: CanvasRenderingContext2D, page: number): void => {
  const { parts, textsIntro, texts } = text();
  const first = page === TEXTS_PAGE;
  if (first) {
    heading(context, parts[2]);
    write(context, textsIntro, CENTER, 205, { font: `italic 18px ${GARAMOND}`, color: SOFT });
  }
  const shown = first ? texts.slice(0, TEXTS_FIRST) : texts.slice(TEXTS_FIRST);
  shown.forEach(([title, who, where], i) => {
    const y = (first ? 280 : 130) + i * 110;
    write(context, title, CENTER, y, { font: `500 24px ${GARAMOND}`, color: INK });
    write(context, who, CENTER, y + 28, { font: `italic 18px ${GARAMOND}`, color: INK });
    write(context, where.toLocaleUpperCase(), CENTER, y + 54, { font: `500 12px ${TITLE}`, color: SOFT, spacing: 2 });
  });
  folio(context, page);
};

const fontsPage = (context: CanvasRenderingContext2D): void => {
  const { parts, fontsIntro } = text();
  heading(context, parts[3]);
  write(context, fontsIntro, CENTER, 205, { font: `italic 18px ${GARAMOND}`, color: SOFT });
  // Vingt polices : resserrées pour finir au-dessus du folio.
  FONTS.forEach(([font, who], i) => credit(context, font.toLocaleUpperCase(), who, '', 255 + i * 23));
  folio(context, FONTS_PAGE);
};

/** Les notes de mise à jour : où elles commencent (sous le titre de la partie), et sur les pages suivantes. */
const NOTES_TOP = 230;
const NOTES_NEXT_TOP = 110;
/** Elles s'arrêtent au-dessus du folio. */
const NOTES_BOTTOM = HEIGHT - 90;

type Note = ReturnType<typeof text>['notes'][number];

/** Un journal des modifications : les puces au fer à gauche, leur texte en retrait, coupé à la largeur. */
const NOTES_LEFT = 96;
const NOTES_INDENT = 22;
const NOTES_WIDTH = WIDTH - 2 * NOTES_LEFT - NOTES_INDENT;
const NOTES_FONT = `19px ${GARAMOND}`;
const NOTES_LINE = 26;
/** Sous le nom et la date ; entre deux intertitres ; entre deux puces. */
const NOTES_HEAD = 72;
const NOTES_SECTION = 40;
const NOTES_ITEM = 6;

/** Les lignes d'une puce, coupées à la largeur du texte. */
const wrapItem = (context: CanvasRenderingContext2D, item: string): string[] => {
  context.font = NOTES_FONT;
  const lines: string[] = [];
  let line = '';
  for (const word of item.split(' ')) {
    const tried = line ? `${line} ${word}` : word;
    if (line && context.measureText(tried).width > NOTES_WIDTH) {
      lines.push(line);
      line = word;
    } else line = tried;
  }
  return [...lines, line];
};

/**
 * Une version posée à partir de `top` : son nom et sa date au milieu, puis ses parties (« Nouveautés »,
 * « Corrections »… ; sans intertitre, la liste seule) et leurs puces. Sans `draw`, elle est seulement mesurée.
 * `continued` : la suite d'une version commencée à la page d'avant, sans son nom ni sa date. Rend sa hauteur.
 */
const placeNote = (context: CanvasRenderingContext2D, note: Note, top: number, draw: boolean, continued = false): number => {
  if (draw && !continued) {
    write(context, note.title.toLocaleUpperCase(), CENTER, top, { font: `600 20px ${TITLE}`, color: INK, spacing: 4 });
    write(context, note.date, CENTER, top + 30, { font: `italic 18px ${GARAMOND}`, color: SOFT });
  }
  let y = continued ? top + NOTES_LINE - 6 : top + NOTES_HEAD;
  note.sections.forEach((section, index) => {
    if (index > 0) y += NOTES_SECTION - NOTES_LINE;
    if (section.heading) {
      if (draw) write(context, section.heading, NOTES_LEFT, y, { font: `italic 19px ${GARAMOND}`, color: SOFT, align: 'left' });
      y += NOTES_LINE + 2;
    }
    for (const item of section.items) {
      if (draw) write(context, '•', NOTES_LEFT + 4, y, { font: NOTES_FONT, color: INK, align: 'left' });
      for (const line of wrapItem(context, item)) {
        if (draw) write(context, line, NOTES_LEFT + NOTES_INDENT, y, { font: NOTES_FONT, color: INK, align: 'left' });
        y += NOTES_LINE;
      }
      y += NOTES_ITEM;
    }
  });
  return y - NOTES_LINE - NOTES_ITEM - top + 10;
};

type Placed = { note: Note; y: number; continued: boolean };

/** Les premières puces d'une version, `count` en tout, parties comprises (une partie coupée garde son intertitre). */
const firstItems = (note: Note, count: number): Note => {
  let left = count;
  const sections = note.sections.flatMap((section) => {
    const items = section.items.slice(0, Math.max(0, left));
    left -= items.length;
    return items.length > 0 ? [{ ...section, items }] : [];
  });
  return { ...note, sections };
};
const afterItems = (note: Note, count: number): Note => {
  let skip = count;
  const sections = note.sections.flatMap((section) => {
    const items = section.items.slice(Math.min(skip, section.items.length));
    skip -= section.items.length - items.length;
    return items.length > 0 ? [{ ...section, items }] : [];
  });
  return { ...note, sections };
};
const itemCount = (note: Note): number => note.sections.reduce((total, section) => total + section.items.length, 0);

/**
 * Les versions, page par page, la plus récente en haut : une page pleine, la suite passe à la page blanche d'après.
 * Une version coupée en deux seulement si elle ne tient pas sur une page entière : ses puces continuent sur la
 * suivante (jamais sur le folio).
 */
const notesSheets = (context: CanvasRenderingContext2D): Placed[][] => {
  const sheets: Placed[][] = [[]];
  let y = NOTES_TOP;
  const newSheet = (): void => {
    sheets.push([]);
    y = NOTES_NEXT_TOP;
  };
  for (const whole of text().notes) {
    let note = whole;
    let continued = false;
    while (itemCount(note) > 0) {
      const fits = (part: Note): boolean => y + placeNote(context, part, 0, false, continued) <= NOTES_BOTTOM;
      if (!fits(note) && sheets[sheets.length - 1].length > 0 && !continued) {
        newSheet();
        continue;
      }
      let count = itemCount(note);
      while (count > 1 && !fits(firstItems(note, count))) count--;
      const part = firstItems(note, count);
      sheets[sheets.length - 1].push({ note: part, y, continued });
      y += placeNote(context, part, 0, false, continued) + 50;
      note = afterItems(note, count);
      continued = true;
      if (itemCount(note) > 0) newSheet();
    }
  }
  return sheets;
};

/**
 * Les notes de mise à jour, la plus récente en haut, en journal des modifications (demande de l'auteur, 09/10 : « plus
 * mise à jour et moins lyrique »). Trop longues pour une page, elles continuent sur la suivante.
 */
const notesPage = (context: CanvasRenderingContext2D, page: number): void => {
  const sheet = notesSheets(context)[page - NOTES_PAGE];
  if (!sheet) return;
  if (page === NOTES_PAGE) heading(context, text().parts[4]);
  for (const { note, y, continued } of sheet) placeNote(context, note, y, true, continued);
  folio(context, page);
};

const colophonPage = (context: CanvasRenderingContext2D): void => {
  text().colophon.forEach((line, i) =>
    write(
      context,
      i === 0 ? line.toLocaleUpperCase() : line,
      CENTER,
      470 + i * 28,
      i === 0 ? { font: `500 15px ${TITLE}`, color: INK, spacing: 4 } : { font: `italic 18px ${GARAMOND}`, color: SOFT },
    ),
  );
  context.fillStyle = INK;
  hexagon(context, CENTER, 440, 4);
  context.fill();
};

const PAGES: Record<number, (context: CanvasRenderingContext2D, page: number) => void> = {
  1: titlePage,
  [FOREWORD_PAGE]: forewordPage,
  [CONTENTS_PAGE]: contentsPage,
  [ROLL_PAGE]: rollPage,
  [TEXTS_PAGE]: textsPage,
  [TEXTS_PAGE + 1]: textsPage,
  [FONTS_PAGE]: fontsPage,
  [NOTES_PAGE]: notesPage,
  [COLOPHON_PAGE]: colophonPage,
};

/** Dessine la page `page` sur son papier (les notes peuvent continuer après la leur) ; les autres restent blanches. */
export const paintCreditsPage = (context: CanvasRenderingContext2D, page: number): void =>
  (PAGES[page] ?? (page > NOTES_PAGE && page < COLOPHON_PAGE ? notesPage : undefined))?.(context, page);

/** Les lignes du sommaire mènent à leur partie ; les liens de l'avant-propos ouvrent GitHub (l'auteur, le dépôt). */
export const creditsLinks = (page: number): PageLink[] => {
  if (page === CONTENTS_PAGE) return PARTS.map((target, i) => ({ y: CONTENTS_TOP + i * CONTENTS_STEP - 32, height: 44, target }));
  if (page === FOREWORD_PAGE)
    return [PROFILE_Y, REPOSITORY_Y].map((y, i) => ({ y: y - 28, height: 40, target: page, href: `https://${[PROFILE, REPOSITORY][i]}` }));
  return [];
};
