import { messages, t } from '../../i18n';
import { sealEvent } from '../../systems/seals';
import { highlightFinds, preparePageTexture, type PageFind, type Paper } from '../book/pageRender';
import { headbandTexture } from '../book3d/headband';
import { edgeTexture } from '../book3d/textures';
import { PAGE_CENTER, SANS, board, write } from './draw';
import { INK, YELLOW, YELLOW_EDGE, directoryBack, directoryFront, directorySpine, hexagon, loadDirectoryFonts } from './directoryCover';
import type { RareBookArt } from './rareBookArt';
import { FIRST_PAGE, letterPages, playerSlot, subscribersOn, type Subscriber } from './directoryEntries';

const THICKNESS = 0.17;

/** Papier jaune d'annuaire, fin. */
const PAPER: Paper = ['#f1df8f', '#e8d27c', '#dcc46a'];

/** Trois colonnes serrées de noms et de numéros, sous le bandeau des mots repères. */
const COLUMNS = [52, 236, 420];
const COLUMN_WIDTH = 168;
const FIRST_ROW = 128;
const ROW_STEP = 15.5;
const ROWS = 38;
const NAME_FONT = `bold 12px ${SANS}`;
const NUMBER_FONT = `12px ${SANS}`;

/** Une ligne de l'annuaire : le nom, des points, le numéro au bout de la colonne. */
const line = (context: CanvasRenderingContext2D, x: number, y: number, { name, number, player }: Subscriber): void => {
  context.font = NUMBER_FONT;
  const numberWidth = context.measureText(number).width;
  context.font = NAME_FONT;
  const nameWidth = context.measureText(name).width;
  context.fillStyle = INK;
  // Le joueur : son nom est surligné à part (highlightFinds), comme une trouvaille.
  if (!player) context.fillText(name, x, y);
  context.font = NUMBER_FONT;
  context.fillText(number, x + COLUMN_WIDTH - numberWidth, y);
  context.fillStyle = 'rgba(27, 26, 23, 0.45)';
  for (let dot = x + nameWidth + 4; dot < x + COLUMN_WIDTH - numberWidth - 4; dot += 4) context.fillRect(dot, y - 2, 1, 1);
};

/** Le sommaire : la première page de chaque lettre, puis les numéros utiles, au dos. */
const contentsPage = (context: CanvasRenderingContext2D): void => {
  const texts = messages().rareBooks.directory;
  write(context, texts.contents.toUpperCase(), PAGE_CENTER, 70, { font: `900 30px ${SANS}`, color: INK, spacing: 3 });
  write(context, texts.subscribers, PAGE_CENTER, 116, { font: `italic 16px ${SANS}`, color: INK });
  const rows = [...letterPages().map(({ letter, page }) => [letter, String(page)]), [texts.usefulNumbers, texts.backCover]];
  const [left, right] = [PAGE_CENTER - 150, PAGE_CENTER + 150];
  rows.forEach(([label, page], index) => {
    // Une ligne de plus avant les numéros utiles.
    const y = 170 + index * 24 + (index === rows.length - 1 ? 16 : 0);
    context.font = `bold 15px ${SANS}`;
    context.fillStyle = INK;
    context.textAlign = 'left';
    context.fillText(label, left, y);
    const labelWidth = context.measureText(label).width;
    context.font = `15px ${SANS}`;
    context.textAlign = 'right';
    context.fillText(page, right, y);
    const pageWidth = context.measureText(page).width;
    context.fillStyle = 'rgba(27, 26, 23, 0.45)';
    for (let dot = left + labelWidth + 6; dot < right - pageWidth - 6; dot += 5) context.fillRect(dot, y - 2, 1.2, 1.2);
  });
  context.textAlign = 'left';
};

const titlePage = (context: CanvasRenderingContext2D): void => {
  write(context, t('rareBooks.directory.cover.0').toUpperCase(), PAGE_CENTER, 230, { font: `900 64px ${SANS}`, color: INK, spacing: 2 });
  write(context, t('rareBooks.directory.subtitle'), PAGE_CENTER, 330, { font: `22px ${SANS}`, color: INK, spacing: 3 });
  hexagon(context, PAGE_CENTER, 470, 46, 3);
  write(context, t('rareBooks.directory.edition'), PAGE_CENTER, 600, { font: `italic 18px ${SANS}`, color: INK });
};

/**
 * L'Annuaire : couverture d'annuaire des années 90, papier jaune, un sommaire, puis trois colonnes serrées
 * de noms en lettres de Babel et de numéros, de A à Z. Les habitants d'une Bibliothèque où l'on est
 * seul… et, à sa place dans l'alphabet, le nom du joueur, surligné comme une trouvaille (un secret).
 */
export const directoryArt: RareBookArt = {
  thickness: THICKNESS,
  paper: PAPER,
  look: async () => {
    await loadDirectoryFonts();
    const plain = board(YELLOW, YELLOW_EDGE);
    return {
      cover: directoryFront(),
      back: directoryBack(),
      inside: plain,
      spine: directorySpine(THICKNESS),
      leather: 0xf0c22e,
      edge: edgeTexture(PAPER[1], '#c9ad4f'),
      paper: PAPER[0],
      headband: headbandTexture('#d9a91c', '#f2df8f'),
    };
  },
  paint: (page, canvas, spineOnLeft, state) => {
    const context = preparePageTexture(canvas, spineOnLeft, PAPER);
    context.textBaseline = 'alphabetic';
    if (page === 1) titlePage(context);
    if (page === 3) contentsPage(context);
    if (page < FIRST_PAGE) return true;
    const entries = subscribersOn(page, state.playerName);
    // Mots repères en haut de page : le premier et le dernier nom.
    context.font = `bold 15px ${SANS}`;
    context.fillStyle = INK;
    context.textAlign = 'left';
    context.fillText(entries[0].name.split(' ')[0], COLUMNS[0], 82);
    context.textAlign = 'right';
    context.fillText(entries[entries.length - 1].name.split(' ')[0], COLUMNS[2] + COLUMN_WIDTH, 82);
    context.textAlign = 'center';
    context.font = `13px ${SANS}`;
    context.fillText(String(page), PAGE_CENTER, 82);
    context.fillRect(COLUMNS[0], 96, COLUMNS[2] + COLUMN_WIDTH - COLUMNS[0], 1.5);
    context.textAlign = 'left';
    const found: PageFind[] = [];
    entries.forEach((item, index) => {
      const x = COLUMNS[Math.floor(index / ROWS)];
      const y = FIRST_ROW + (index % ROWS) * ROW_STEP;
      line(context, x, y, item);
      if (item.player) found.push({ text: item.name, x, y });
    });
    highlightFinds(canvas, context, found, NAME_FONT);
    return true;
  },
  // Secret : son nom et son numéro, à sa place.
  passed: (page, state) => {
    if (page === playerSlot(state.playerName || '…').page) sealEvent(state, 'directory');
  },
};
