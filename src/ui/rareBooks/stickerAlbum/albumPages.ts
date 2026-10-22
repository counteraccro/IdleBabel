import { messages } from '../../../i18n';
import { PAGES_PER_BOOK } from '../../../systems/books';
import { STRANGE_BOOK_INDEX } from '../../../systems/strangeBook';
import {
  ALBUM_SLOTS,
  ALBUM_STEP,
  MODERN_COLORS,
  RAREST,
  albumSticker,
  checkAlbumFull,
  partSlots,
  rareAt,
  scanAlbum,
  type AlbumPart,
  type AlbumSlot,
} from '../../../systems/stickerAlbum';
import { idle } from '../slowDrawing';
import { BLUE, C, H, HAND, PENCIL, POP, RED, SANS, SERIF, W, YELLOW, group, header, paper, subHeader, text } from './albumDraw';
import { ROW_H, grid, type Cell } from './albumStickers';
import type { GameState } from '../../../core/state';
import type { PageLink } from '../rareBookArt';

/**
 * Les pages de l'album (maquette .ai/maquette-album-autocollants.html, validée le 22/10) : le titre, le mode d'emploi et
 * le sommaire ; la collection, une ou deux parties par page ; la liste de contrôle ; puis « Mes livres » jusqu'à la page
 * 410, douze livres par page dans l'ordre de lecture.
 */

const texts = () => messages().rareBooks.stickerAlbum;
type Texts = ReturnType<typeof texts>;

/** Les pages de la collection : leurs parties (une ou deux) et leur couleur ; les livres rares, douze par page. */
interface CollectionPage {
  parts: AlbumPart[];
  /** Pour les livres rares : les cases de cette page. */
  slots?: AlbumSlot[];
  color: string;
}
const RARES_PER_PAGE = 12;
const rarePages = (): CollectionPage[] => {
  const slots = partSlots('rares');
  return Array.from({ length: Math.ceil(slots.length / RARES_PER_PAGE) }, (_, k) => ({
    parts: ['rares'],
    slots: slots.slice(k * RARES_PER_PAGE, (k + 1) * RARES_PER_PAGE),
    color: '#1c2a4a',
  }));
};
const COLLECTION: CollectionPage[] = [
  { parts: ['leathers', 'corners'], color: '#8a3a22' },
  { parts: ['ornaments', 'rolls'], color: '#a0761c' },
  { parts: ['half'], color: '#4f6b3a' },
  { parts: ['modern'], color: '#1f6f8b' },
  { parts: ['comics'], color: '#c23b22' },
  { parts: ['titles'], color: '#5b3f8c' },
  { parts: ['words'], color: '#5b3f8c' },
  ...rarePages(),
  { parts: ['rarest'], color: '#6b1d3a' },
  { parts: ['dates'], color: '#2d2a26' },
];

export const TITLE_PAGE = 1;
export const HOW_TO_PAGE = 2;
export const CONTENTS_PAGE = 3;
const FIRST_COLLECTION_PAGE = 4;
export const CHECKLIST_PAGE = FIRST_COLLECTION_PAGE + COLLECTION.length;
export const FIRST_MINE_PAGE = CHECKLIST_PAGE + 1;
export const MINE_PER_PAGE = 12;
/** Les cases de « Mes livres » : de la page qui suit la liste de contrôle à la dernière. */
export const MINE_SLOTS = (PAGES_PER_BOOK - FIRST_MINE_PAGE + 1) * MINE_PER_PAGE;
const MINE_COLOR = '#3d6b4a';
const DARK = '#2d2a26';

/** La première page de la partie `part` (le sommaire). */
const pageOf = (part: AlbumPart): number => FIRST_COLLECTION_PAGE + COLLECTION.findIndex((page) => page.parts.includes(part));

/** L'album passe les livres lus en revue par petits bouts, dans les moments libres, tant qu'il en reste. */
let scanning = false;
const keepScanning = (state: GameState): void => {
  if (scanning || scanAlbum(state, 0)) return;
  scanning = true;
  const step = async (): Promise<void> => {
    while (!scanAlbum(state, ALBUM_STEP)) await idle();
    scanning = false;
  };
  void step();
};

const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

const quoted = (book: Texts, word: string): string => fill(book.quoted, { w: word });

/** Le nom d'une case de la collection, dans la langue du jeu. */
const slotName = (book: Texts, slot: AlbumSlot): string => {
  const { parts } = book;
  const covers = messages().covers;
  switch (slot.part) {
    case 'half':
      return fill(parts.half.name, { n: (slot.rank >> 1) + 1, kind: parts.half.kinds[slot.rank & 1] });
    case 'modern':
      return fill(parts.modern.name, {
        color: parts.modern.colors[slot.rank % MODERN_COLORS],
        layout: parts.modern.layouts[Math.floor(slot.rank / MODERN_COLORS)],
      });
    case 'comics':
      return fill(parts.comics.name, { n: slot.rank + 1 });
    case 'titles':
      return covers.titles[slot.rank].join(' ');
    case 'words':
      return quoted(book, covers.words[slot.rank]);
    case 'rares':
      return (messages().rareBooks as Record<string, { name?: string }>)[slot.rare!]?.name ?? slot.rare!;
    default:
      return parts[slot.part].names[slot.rank];
  }
};

/** Ce qu'attend un introuvable : son cuir, son fleuron, puis son titre, ou son fer d'angle et sa roulette. */
const rarestHint = (book: Texts, rank: number): string => {
  const { parts } = book;
  const rarest = RAREST[rank];
  const end =
    rarest.title !== undefined
      ? quoted(book, messages().covers.titles[rarest.title].join(' '))
      : `${parts.corners.names[rarest.corner]}, ${parts.rolls.names[rarest.roll]}`;
  return `${parts.leathers.names[rarest.leather]}, ${parts.ornaments.names[rarest.ornament]}, ${end}`;
};

const fromLine = (book: Texts, from: number, doubles: number): string => {
  const line = fill(book.from, { n: group(from + 1) });
  if (!doubles) return line;
  return `${line} · ${doubles === 1 ? book.oneDouble : fill(book.doubles, { n: group(doubles) })}`;
};

const cellOf = (state: GameState, book: Texts, slot: AlbumSlot): Cell => {
  const sticker = albumSticker(state, slot);
  return {
    number: slot.number,
    name: slotName(book, slot),
    numbered: true,
    book: sticker.book,
    doubles: sticker.doubles,
    rare: slot.rare,
    hint: slot.part === 'rarest' ? rarestHint(book, slot.rank) : undefined,
    // Un livre rare donné par le débogage (« Tout trouver ») n'a pas de vrai numéro.
    from: sticker.book === undefined || sticker.book < 0 ? undefined : fromLine(book, sticker.book, sticker.doubles),
  };
};

const owned = (state: GameState, slots: AlbumSlot[]): number => slots.filter((slot) => albumSticker(state, slot).book !== undefined).length;

const collectionPage = (context: CanvasRenderingContext2D, state: GameState, book: Texts, page: CollectionPage): void => {
  const [first, second] = page.parts;
  const firstSlots = page.slots ?? partSlots(first);
  const secondSlots = second ? partSlots(second) : [];
  const part = book.parts[first];
  const subtitle =
    first === 'rares'
      ? fill(book.parts.rares.subtitle, {
          n: COLLECTION.filter((p) => p.parts[0] === 'rares').indexOf(page) + 1,
          m: COLLECTION.filter((p) => p.parts[0] === 'rares').length,
        })
      : part.subtitle;
  header(context, part.title, subtitle, page.color, owned(state, [...firstSlots, ...secondSlots]), firstSlots.length + secondSlots.length);
  const cells = (slots: AlbumSlot[]) => slots.map((slot) => cellOf(state, book, slot));
  if (!second) return grid(context, state, cells(firstSlots), 150, 760);
  const split = 150 + Math.ceil(firstSlots.length / 4) * ROW_H + 10;
  grid(context, state, cells(firstSlots), 150, split);
  subHeader(context, book.parts[second].title, page.color, split);
  grid(context, state, cells(secondSlots), split + 46, 760);
};

const titlePage = (context: CanvasRenderingContext2D, book: Texts): void => {
  context.save();
  context.lineJoin = 'round';
  context.textAlign = 'center';
  book.titleLines.forEach((line, i) => {
    let size = i ? 64 : 50;
    do context.font = `${size--}px ${POP}`;
    while (context.measureText(line).width > W - 80 && size > 20);
    const y = i ? 362 : 300;
    context.lineWidth = 8;
    context.strokeStyle = RED;
    context.strokeText(line, C, y);
    context.fillStyle = YELLOW;
    context.fillText(line, C, y);
  });
  context.restore();
  text(context, book.subtitle, C, 410, `italic 24px ${SERIF}`, '#4a3a28');
  text(context, fill(book.count, { n: ALBUM_SLOTS.length }), C, 450, `20px ${POP}`, RED);
  text(context, fill(book.mine, { n: group(MINE_SLOTS) }), C, 476, `italic 18px ${SERIF}`, '#4a3a28');
  text(context, book.publisher, C, 700, `18px ${POP}`, '#4a3a28');
};

const howToPage = (context: CanvasRenderingContext2D, book: Texts): void => {
  header(context, book.howTo, book.howToSubtitle, BLUE);
  let y = 200;
  book.steps.forEach((step, i) => {
    text(context, `${i + 1}.`, 80, y, `28px ${POP}`, BLUE, 'left');
    context.font = `21px ${SERIF}`;
    let row = '';
    for (const word of step.split(' ')) {
      if (row && context.measureText(row + word).width > 460) {
        text(context, row.trimEnd(), 124, y, `21px ${SERIF}`, '#3a2e22', 'left');
        y += 28;
        row = '';
      }
      row += `${word} `;
    }
    text(context, row.trimEnd(), 124, y, `21px ${SERIF}`, '#3a2e22', 'left');
    y += 62;
  });
};

/** Le sommaire : ses entrées et leur page. */
const contentsEntries = (book: Texts): [string, number][] => {
  const entries = book.contentsEntries;
  return [
    [entries.leathers, pageOf('leathers')],
    [entries.ornaments, pageOf('ornaments')],
    [entries.half, pageOf('half')],
    [entries.modern, pageOf('modern')],
    [entries.comics, pageOf('comics')],
    [entries.titles, pageOf('titles')],
    [entries.words, pageOf('words')],
    [entries.rares, pageOf('rares')],
    [entries.rarest, pageOf('rarest')],
    [entries.dates, pageOf('dates')],
    [entries.checklist, CHECKLIST_PAGE],
    [entries.mine, FIRST_MINE_PAGE],
  ];
};
const CONTENTS_TOP = 190;
const CONTENTS_LINE = 44;

const contentsPage = (context: CanvasRenderingContext2D, book: Texts): void => {
  header(context, book.contents, '', DARK);
  contentsEntries(book).forEach(([name, page], i) => {
    const y = CONTENTS_TOP + i * CONTENTS_LINE;
    text(context, name, 90, y, `22px ${SERIF}`, '#3a2e22', 'left');
    const width = context.measureText(name).width;
    text(context, String(page), W - 90, y, `22px ${POP}`, RED, 'right');
    context.setLineDash([2, 6]);
    context.strokeStyle = 'rgba(80,60,30,0.4)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(100 + width, y - 6);
    context.lineTo(W - 120, y - 6);
    context.stroke();
    context.setLineDash([]);
  });
};

/** Les entrées du sommaire, cliquables. */
export const contentsLinks = (): PageLink[] =>
  contentsEntries(texts()).map(([, target], i) => ({ y: CONTENTS_TOP + i * CONTENTS_LINE - 30, height: CONTENTS_LINE, target }));

/** La liste de contrôle : chaque numéro, coché au crayon, et ses doubles ; le total en bas. */
const checklistPage = (context: CanvasRenderingContext2D, state: GameState, book: Texts): void => {
  header(context, book.checklist, book.checklistSubtitle, DARK, owned(state, [...ALBUM_SLOTS]), ALBUM_SLOTS.length);
  const columns = 5;
  const top = 214;
  const line = 20.5;
  const perColumn = Math.ceil(ALBUM_SLOTS.length / columns);
  const width = (W - 70) / columns;
  let doubles = 0;
  ALBUM_SLOTS.forEach((slot, i) => {
    const x = 36 + Math.floor(i / perColumn) * width;
    const y = top + (i % perColumn) * line;
    context.strokeStyle = '#7a6a58';
    context.lineWidth = 1;
    context.strokeRect(x, y - 11, 12, 12);
    text(context, String(slot.number), x + 34, y, `12px ${SANS}`, '#4a3a28', 'right');
    const sticker = albumSticker(state, slot);
    if (sticker.book === undefined) return;
    context.strokeStyle = PENCIL;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x + 1, y - 5);
    context.lineTo(x + 5, y);
    context.lineTo(x + 14, y - 14);
    context.stroke();
    doubles += sticker.doubles;
    if (sticker.doubles) text(context, `×${group(sticker.doubles)}`, x + 42, y + 1, `600 16px ${HAND}`, PENCIL, 'left');
  });
  text(context, fill(book.doublesTotal, { n: group(doubles) }), C, H - 48, `600 30px ${HAND}`, PENCIL);
};

/** Une page de « Mes livres » : douze livres dans l'ordre de lecture, les livres rares en brillant. */
const minePage = (context: CanvasRenderingContext2D, state: GameState, book: Texts, page: number): void => {
  const first = (page - FIRST_MINE_PAGE) * MINE_PER_PAGE;
  const rareNames = messages().rareBooks as Record<string, { name?: string }>;
  const cells: Cell[] = Array.from({ length: MINE_PER_PAGE }, (_, k) => {
    const index = first + k;
    const read = index < state.booksFinished;
    const rare = read ? rareAt(state, index) : undefined;
    const name = rare
      ? (rareNames[rare]?.name ?? rare)
      : index === STRANGE_BOOK_INDEX
        ? book.strange
        : fill(book.book, { n: group(index + 1) });
    return { number: index + 1, name, numbered: false, book: read ? index : undefined, doubles: 0, rare };
  });
  const have = cells.filter((cell) => cell.book !== undefined).length;
  header(
    context,
    book.mineTitle,
    fill(book.mineSubtitle, { a: group(first + 1), b: group(first + MINE_PER_PAGE) }),
    MINE_COLOR,
    have,
    MINE_PER_PAGE,
  );
  grid(context, state, cells, 150, 760);
};

/** La couleur de la page `page` (son numéro, en bas). */
const colorOf = (page: number): string => {
  if (page === TITLE_PAGE) return RED;
  if (page === HOW_TO_PAGE) return BLUE;
  if (page >= FIRST_MINE_PAGE) return MINE_COLOR;
  return COLLECTION[page - FIRST_COLLECTION_PAGE]?.color ?? DARK;
};

/** Peint la page `page` sur le papier déjà préparé ; false : au-delà de l'album. */
export const paintAlbumPage = (context: CanvasRenderingContext2D, state: GameState, page: number, spineOnLeft: boolean): boolean => {
  if (page < 1 || page > PAGES_PER_BOOK) return false;
  keepScanning(state);
  checkAlbumFull(state);
  const book = texts();
  paper(context, colorOf(page), page, spineOnLeft);
  if (page === TITLE_PAGE) titlePage(context, book);
  else if (page === HOW_TO_PAGE) howToPage(context, book);
  else if (page === CONTENTS_PAGE) contentsPage(context, book);
  else if (page < CHECKLIST_PAGE) collectionPage(context, state, book, COLLECTION[page - FIRST_COLLECTION_PAGE]);
  else if (page === CHECKLIST_PAGE) checklistPage(context, state, book);
  else minePage(context, state, book, page);
  return true;
};
