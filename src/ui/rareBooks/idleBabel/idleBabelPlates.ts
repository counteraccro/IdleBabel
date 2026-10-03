import { createInitialState } from '../../../core/state';
import { getLocale, messages } from '../../../i18n';
import { coverDesign, rareCover, toRoman } from '../../../systems/coverDesign';
import { TITLE } from '../draw';
import { write } from '../credits/creditsCover';
import { CENTER, GARAMOND, INK, RULE, SOFT, type PlateArt } from './idleBabelLayout';
import { DRAFT_IMAGES, PLATE_BOOKS, pagesText } from './idleBabelStory';

/**
 * Ce qui illustre le livre « Idle Babel » : les planches des couvertures retenues, dessinées par le jeu lui-même
 * (le dos et le plat côte à côte, cadre fin, légende), et les pistes écartées, images capturées des maquettes
 * (public/idle-babel/pistes/). Les couvertures sont dessinées une fois par langue puis gardées en petites images
 * compressées : treize reliures entières resteraient sinon en mémoire.
 */

/** La planche : hauteur du livre, largeur du plat et du dos, l'écart entre eux (mesures de la maquette). */
const PLATE_HEIGHT = 470;
const PLATE_COVER = PLATE_HEIGHT * 0.8;
const PLATE_SPINE = PLATE_HEIGHT * 0.14;
const PLATE_GAP = 14;
const PLATE_TOP = 150;
/** Les images gardées deux fois plus fines que la mise en page, comme les textures des pages. */
const SHARPNESS = 2;

interface Cover {
  front: HTMLImageElement;
  spine: HTMLImageElement;
  name: string;
}

/** Une image prête à dessiner (décodée), ou null si elle manque (hors ligne…) : la planche reste sans elle. */
const load = async (src: string): Promise<HTMLImageElement | null> => {
  const image = new Image();
  image.src = src;
  return image.decode().then(
    () => image,
    () => null,
  );
};

/** Une texture de couverture réduite à `width` × `height` et gardée en WebP. */
const snapshot = async (source: CanvasImageSource, width: number, height: number): Promise<HTMLImageElement | null> => {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(width * SHARPNESS);
  canvas.height = Math.round(height * SHARPNESS);
  canvas.getContext('2d')!.drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  const image = await load(url);
  URL.revokeObjectURL(url);
  return image;
};

/** La couverture retenue de `book`, telle que le jeu la dessine dans la langue du jeu. */
const drawCover = async (book: string): Promise<Cover | null> => {
  // arts.ts range aussi ce livre-ci : chargé ici seulement, pour ne pas tourner en rond.
  const { rareBookArt } = await import('../arts');
  try {
    const look = await rareBookArt(book).look(createInitialState(getLocale()), rareCover(coverDesign(0), book));
    const [front, spine] = await Promise.all([
      snapshot(look.cover.image as CanvasImageSource, PLATE_COVER, PLATE_HEIGHT),
      snapshot(look.spine.image as CanvasImageSource, PLATE_SPINE, PLATE_HEIGHT),
    ]);
    const name = (messages().rareBooks as Record<string, { name?: string }>)[book]?.name ?? book;
    return front && spine ? { front, spine, name } : null;
  } catch {
    return null;
  }
};

/** Le dessin d'une image avec une ombre légère, comme collée sur la page. */
const tipIn = (context: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number): void => {
  context.save();
  context.shadowColor = 'rgba(40,25,10,0.35)';
  context.shadowBlur = 10;
  context.shadowOffsetY = 3;
  context.drawImage(image, x, y, width, height);
  context.restore();
};

/** La planche d'une couverture retenue : le dos et le plat côte à côte, un cadre fin, le nom du livre. */
const plate = (context: CanvasRenderingContext2D, cover: Cover | undefined, book: string, number: number): void => {
  const text = pagesText();
  write(context, `${text.plate} ${toRoman(number)}`, CENTER, 110, { font: `500 16px ${TITLE}`, color: SOFT, spacing: 5 });
  const x = CENTER - (PLATE_COVER + PLATE_SPINE + PLATE_GAP) / 2;
  context.strokeStyle = RULE;
  context.lineWidth = 1;
  context.strokeRect(x - 22.5, PLATE_TOP - 22.5, PLATE_COVER + PLATE_SPINE + PLATE_GAP + 45, PLATE_HEIGHT + 45);
  if (cover) {
    tipIn(context, cover.spine, x, PLATE_TOP, PLATE_SPINE, PLATE_HEIGHT);
    tipIn(context, cover.front, x + PLATE_SPINE + PLATE_GAP, PLATE_TOP, PLATE_COVER, PLATE_HEIGHT);
  }
  write(context, cover?.name ?? book, CENTER, PLATE_TOP + PLATE_HEIGHT + 72, { font: `italic 24px ${GARAMOND}`, color: INK });
  write(context, text.plateNote, CENTER, PLATE_TOP + PLATE_HEIGHT + 100, { font: `italic 17px ${GARAMOND}`, color: SOFT });
};

/** Les pistes écartées en grille : une rangée (1 ou 2), 2 + 1, 2 + 2 ou 3 + 2 ; chaque image dans sa case, son nom dessous. */
const DRAFTS_TOP = 180;
const DRAFTS_BOTTOM = 700;
const DRAFTS_SIDE = 70;
const DRAFTS_GAP = 26;
const DRAFTS_LABEL = 34;

const drafts = (context: CanvasRenderingContext2D, images: Map<string, HTMLImageElement>, files: string[], title: string): void => {
  const text = pagesText();
  write(context, text.drafts, CENTER, 110, { font: `500 16px ${TITLE}`, color: SOFT, spacing: 5 });
  write(context, title, CENTER, 142, { font: `italic 22px ${GARAMOND}`, color: INK });
  const columns = files.length <= 2 ? files.length : files.length <= 4 ? 2 : 3;
  const rows = Math.ceil(files.length / columns);
  const boxWidth = (2 * CENTER - 2 * DRAFTS_SIDE - (columns - 1) * DRAFTS_GAP) / columns;
  const boxHeight = (DRAFTS_BOTTOM - DRAFTS_TOP - rows * DRAFTS_LABEL - (rows - 1) * DRAFTS_GAP) / rows;
  files.forEach((file, i) => {
    const row = Math.floor(i / columns);
    const inRow = Math.min(columns, files.length - row * columns);
    const left = CENTER - (inRow * boxWidth + (inRow - 1) * DRAFTS_GAP) / 2 + (i - row * columns) * (boxWidth + DRAFTS_GAP);
    const top = DRAFTS_TOP + row * (boxHeight + DRAFTS_LABEL + DRAFTS_GAP);
    const image = images.get(file);
    const scale = image ? Math.min(boxWidth / image.naturalWidth, boxHeight / image.naturalHeight) : 1;
    const [width, height] = image ? [image.naturalWidth * scale, image.naturalHeight * scale] : [boxWidth, boxHeight];
    // Sur une seule rangée, les images sont centrées en hauteur ; sinon posées sur le bas de leur case.
    const y = top + (rows === 1 ? (boxHeight - height) / 2 : boxHeight - height);
    if (image) tipIn(context, image, left + (boxWidth - width) / 2, y, width, height);
    const name = (text.draftNames as Record<string, string>)[file] ?? file;
    write(context, name, left + boxWidth / 2, (rows === 1 ? y + height : top + boxHeight) + 24, {
      font: `italic 16px ${GARAMOND}`,
      color: SOFT,
    });
  });
};

/** Tout ce qui illustre le livre, prêt à dessiner, par langue (les couvertures ont leurs mots). */
const prepared = new Map<string, Promise<PlateArt>>();

export const loadPlateArt = (): Promise<PlateArt> => {
  const locale = getLocale();
  let art = prepared.get(locale);
  if (!art) {
    art = (async () => {
      const [covers, images] = await Promise.all([
        Promise.all(PLATE_BOOKS.map(async (book) => [book, await drawCover(book)] as const)),
        Promise.all(
          DRAFT_IMAGES.map(async (file) => [file, await load(`${import.meta.env.BASE_URL}idle-babel/pistes/${file}.webp`)] as const),
        ),
      ]);
      const coverOf = new Map(covers.filter((entry): entry is [string, Cover] => entry[1] !== null));
      const imageOf = new Map(images.filter((entry): entry is [string, HTMLImageElement] => entry[1] !== null));
      return {
        plate: (context, book, number) => plate(context, coverOf.get(book), book, number),
        drafts: (context, files, title) => drafts(context, imageOf, files, title),
        name: (book) => coverOf.get(book)?.name ?? book,
      };
    })();
    prepared.set(locale, art);
    art.catch(() => prepared.delete(locale));
  }
  return art;
};
