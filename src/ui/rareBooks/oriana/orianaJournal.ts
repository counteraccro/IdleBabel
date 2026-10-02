import { messages } from '../../../i18n';
import { hashText, seeded } from '../../../core/random';
import { LETTERS } from '../../../systems/babelText';
import { PAGE_CENTER, wrap, write } from '../draw';
import { DISPLAY, INK, MONO } from './orianaCover';
import { BODY, GREY, LEFT, LINE, RIGHT, folio, unbreakable } from './orianaProse';

/**
 * L'annexe : son journal de bord, tenu comme une chaîne de blocs. Chaque bloc a son numéro, l'empreinte du
 * bloc précédent et la sienne (en lettres de Babel), et ses « transactions » : un vol, une conversation,
 * des verres. Les empreintes se suivent d'une page à l'autre, comme dans une vraie chaîne.
 */

/** Le numéro du premier bloc de l'annexe : il y en a eu d'autres avant. */
const FIRST_BLOCK = 3841;
const BLOCKS_PER_PAGE = 3;
const BLOCK_HEIGHT = 168;
const BLOCK_STEP = 200;
const BOX_LEFT = 76;
const BOX_RIGHT = 564;

/** L'empreinte d'un bloc : seize lettres de Babel, toujours les mêmes pour le même bloc. */
const fingerprint = (block: number): string => {
  const random = seeded(hashText(`oriana:block:${block}`));
  return Array.from({ length: 16 }, () => LETTERS[Math.floor(random() * LETTERS.length)]).join('');
};

/** Une transaction : un modèle de la liste, ses trous remplis (villes, siège, heure, nombres). */
const transaction = (template: string, random: () => number): string => {
  const { cities } = messages().rareBooks.oriana;
  const city = Math.floor(random() * cities.length);
  const city2 = (city + 1 + Math.floor(random() * (cities.length - 1))) % cities.length;
  const n = 1 + Math.floor(random() * 6);
  return template
    .replace('{city}', cities[city])
    .replace('{city2}', cities[city2])
    .replace('{seat}', `${1 + Math.floor(random() * 38)}${'ABCDEF'[Math.floor(random() * 6)]}`)
    .replace('{h}', String(1 + Math.floor(random() * 5)))
    .replace('{m}', String(Math.floor(random() * 60)).padStart(2, '0'))
    .replace('{n}', String(n))
    .replace(/\{n2\}/g, String(n + 1 + Math.floor(random() * 6)));
};

/** Un bloc, son cadre et le trait qui le relie au suivant. */
const writeBlock = (context: CanvasRenderingContext2D, block: number, top: number, linked: boolean): void => {
  const { block: label, previous, hash, transactions } = messages().rareBooks.oriana;
  const random = seeded(hashText(`oriana:transactions:${block}`));
  context.strokeStyle = INK;
  context.lineWidth = 2;
  context.strokeRect(BOX_LEFT, top, BOX_RIGHT - BOX_LEFT, BLOCK_HEIGHT);
  if (linked) {
    context.beginPath();
    context.moveTo(PAGE_CENTER, top + BLOCK_HEIGHT);
    context.lineTo(PAGE_CENTER, top + BLOCK_STEP);
    context.stroke();
  }
  const x = BOX_LEFT + 20;
  write(context, label.replace('{n}', String(block)), x, top + 14, { font: `700 18px ${MONO}`, color: INK, align: 'left' });
  write(context, `${previous} ${fingerprint(block - 1)}`, x, top + 44, { font: `13px ${MONO}`, color: GREY, align: 'left' });
  write(context, `${hash} ${fingerprint(block)}`, x, top + 64, { font: `13px ${MONO}`, color: GREY, align: 'left' });
  // Trois transactions différentes.
  const picked = transactions.map((template) => ({ template, key: random() })).sort((a, b) => a.key - b.key);
  picked.slice(0, 3).forEach(({ template }, index) =>
    write(context, `• ${unbreakable(transaction(template, random))}`, x, top + 96 + index * 22, {
      font: `14px ${MONO}`,
      color: INK,
      align: 'left',
    }),
  );
};

/**
 * La page `index` de l'annexe (0 : la première, avec son titre et l'explication, puis un bloc ; ensuite trois
 * blocs par page, le dernier de la page relié au premier de la suivante).
 */
export const journalPage = (context: CanvasRenderingContext2D, index: number, page: number, last: boolean): void => {
  const { journalTitle, journalIntro } = messages().rareBooks.oriana;
  let top = 90;
  let count = BLOCKS_PER_PAGE;
  let first = FIRST_BLOCK + 1 + (index - 1) * BLOCKS_PER_PAGE;
  if (index === 0) {
    write(context, journalTitle, PAGE_CENTER, 90, { font: `italic 34px ${DISPLAY}`, color: INK });
    context.font = BODY;
    const lines = wrap(context, unbreakable(journalIntro), RIGHT - LEFT);
    lines.forEach((line, row) => write(context, line, LEFT, 170 + row * LINE, { font: BODY, color: INK, align: 'left' }));
    top = 170 + lines.length * LINE + 40;
    count = 1;
    first = FIRST_BLOCK;
  }
  for (let block = 0; block < count; block++) {
    writeBlock(context, first + block, top + block * BLOCK_STEP, !(last && block === count - 1));
  }
  folio(context, page);
};
