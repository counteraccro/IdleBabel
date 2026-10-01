import { t } from '../../i18n';
import { hashText, seeded } from '../../core/random';
import { LETTERS } from '../../systems/babelText';
import { preparePageTexture, type Paper } from '../book/pageRender';
import { headbandTexture } from '../book3d/headband';
import { edgeTexture } from '../book3d/textures';
import { PAGE_CENTER, SANS, board, write } from './draw';
import { INK, YELLOW, YELLOW_EDGE, directoryBack, directoryFront, directorySpine, hexagon, loadDirectoryFonts } from './directoryCover';
import type { RareBookArt } from './rareBookArt';
import type { GameState } from '../../core/state';

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

/** Le livre a 410 feuilles : le nom du joueur est sur l'une de ses pages (pas la page de titre). */
const PAGES = 820;

const word = (random: () => number, min: number, max: number): string => {
  const size = min + Math.floor(random() * (max - min + 1));
  const text = Array.from({ length: size }, () => LETTERS[Math.floor(random() * LETTERS.length)])
    .join('')
    .replace(/[ ,.]/g, 'a');
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/** Un abonné : nom et initiale en lettres de Babel, et un numéro. */
const entry = (random: () => number): { name: string; number: string } => ({
  name: `${word(random, 4, 9)} ${word(random, 1, 1)}.`,
  number: Array.from({ length: 4 }, () => String(Math.floor(random() * 100)).padStart(2, '0')).join(' '),
});

/** Où est le nom du joueur : une page, une colonne, une ligne, tirées de son nom. */
const playerSpot = (state: GameState): { page: number; column: number; row: number } => {
  const random = seeded(hashText(`annuaire:${state.playerName}`));
  return { page: 2 + Math.floor(random() * (PAGES - 1)), column: Math.floor(random() * COLUMNS.length), row: Math.floor(random() * ROWS) };
};

/** Une ligne de l'annuaire : le nom, des points, le numéro au bout de la colonne. */
const line = (context: CanvasRenderingContext2D, x: number, y: number, name: string, number: string): void => {
  context.font = NUMBER_FONT;
  const numberWidth = context.measureText(number).width;
  context.font = NAME_FONT;
  const nameWidth = context.measureText(name).width;
  context.fillStyle = INK;
  context.fillText(name, x, y);
  context.font = NUMBER_FONT;
  context.fillText(number, x + COLUMN_WIDTH - numberWidth, y);
  context.fillStyle = 'rgba(27, 26, 23, 0.45)';
  for (let dot = x + nameWidth + 4; dot < x + COLUMN_WIDTH - numberWidth - 4; dot += 4) context.fillRect(dot, y - 2, 1, 1);
};

const titlePage = (context: CanvasRenderingContext2D): void => {
  write(context, t('rareBooks.directory.cover.0').toUpperCase(), PAGE_CENTER, 230, { font: `900 64px ${SANS}`, color: INK, spacing: 2 });
  write(context, t('rareBooks.directory.subtitle'), PAGE_CENTER, 330, { font: `22px ${SANS}`, color: INK, spacing: 3 });
  hexagon(context, PAGE_CENTER, 470, 46, 3);
  write(context, t('rareBooks.directory.edition'), PAGE_CENTER, 600, { font: `italic 18px ${SANS}`, color: INK });
};

/**
 * L'Annuaire : couverture jaune, papier jaune, trois colonnes serrées de noms en lettres de Babel et de
 * numéros. Les habitants d'une Bibliothèque où l'on est seul… et, une seule fois, le nom du joueur, sur
 * une lueur dorée comme une trouvaille.
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
    if (page === 1) {
      titlePage(context);
      return true;
    }
    const random = seeded(hashText(`annuaire:${page}`));
    const entries = Array.from({ length: COLUMNS.length * ROWS }, () => entry(random)).sort((a, b) => a.name.localeCompare(b.name));
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
    const spot = playerSpot(state);
    entries.forEach((item, index) => {
      const column = Math.floor(index / ROWS);
      const row = index % ROWS;
      const x = COLUMNS[column];
      const y = FIRST_ROW + row * ROW_STEP;
      if (page === spot.page && column === spot.column && row === spot.row) {
        // Le joueur, à sa place : une lueur dorée derrière, comme une trouvaille.
        context.fillStyle = 'rgba(240, 150, 20, 0.45)';
        context.fillRect(x - 4, y - 12, COLUMN_WIDTH + 8, 16);
        line(context, x, y, state.playerName || '…', item.number);
      } else line(context, x, y, item.name, item.number);
    });
    return true;
  },
};
