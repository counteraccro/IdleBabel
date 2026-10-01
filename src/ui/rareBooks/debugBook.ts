import { hashText, seeded } from '../../core/random';
import { randomBabelText } from '../../systems/babelText';
import { PAGES_PER_BOOK } from '../../systems/books';
import { layoutPage } from '../book/pageLayout';
import { drawPageTexture, type Paper } from '../book/pageRender';
import { drawTitlePageTexture } from '../book/titlePage';
import { headbandTexture } from '../book3d/headband';
import { edgeTexture } from '../book3d/textures';
import { debugCover } from '../../debug/book/debugCover';
import type { RareBookArt } from './rareBookArt';

/** Le papier du livre de débogage (debugBook3d.ts) : gris froid, un reflet de la pierre de la couverture. */
const PAPER: Paper = ['#e3e2dc', '#d6d4cc', '#c6c3b9'];
/** Longueur d'une page (comme le livre en main). */
const PAGE_LENGTH = 700;
/** Part des mots qui buguent : à la première page, à la dernière (le livre se dégrade en le lisant). */
const GLITCH_FIRST = 0.04;
const GLITCH_LAST = 0.3;
/** Ce qui remonte du code sous le charabia. */
const TOKENS = ['0x0B4BE1', 'NaN', 'undefined', 'null', '<EOF>', 'segfault', '{{name}}', '[object Object]', '#REF!', 'ERR', '410', '\\0'];
/** Les signes qui remplacent des lettres d'un mot abîmé. */
const NOISE = '#@%~_|/\\';

/**
 * Du charabia de Babel qui bugue : des mots remplacés par des bouts de code, des passages qui bégaient
 * (répétés), des lettres changées en signes. De plus en plus au fil des pages.
 */
const glitch = (text: string, page: number, random: () => number): string => {
  const rate = GLITCH_FIRST + ((GLITCH_LAST - GLITCH_FIRST) * page) / PAGES_PER_BOOK;
  const words = text.split(' ');
  const out: string[] = [];
  for (const word of words) {
    if (random() >= rate) {
      out.push(word);
      continue;
    }
    const kind = random();
    if (kind < 0.35) out.push(TOKENS[Math.floor(random() * TOKENS.length)]);
    else if (kind < 0.65 && out.length > 2) out.push(...out.slice(-1 - Math.floor(random() * 3)), word);
    else out.push([...word].map((letter) => (random() < 0.5 ? NOISE[Math.floor(random() * NOISE.length)] : letter)).join(''));
  }
  return out.join(' ');
};

let tick: ((now: number) => boolean) | null = null;

/**
 * Le livre de débogage, trouvé comme un livre rare (10× plus rare) : sa couverture d'obsidienne, et
 * du charabia qui bugue. Hors du mode ?debug, il ne s'ouvre pas dans la bibliothèque ; avec, on y lit
 * le vrai livre de débogage (debugBook3d.ts).
 */
export const debugBookArt: RareBookArt = {
  paper: PAPER,
  look: async () => {
    const cover = await debugCover();
    tick = cover.tick;
    return {
      cover: cover.front,
      back: cover.back,
      inside: cover.plain,
      spine: cover.spine,
      leather: 0xc8c8d0,
      edge: edgeTexture(PAPER[1], '#9d9a90'),
      paper: PAPER[0],
      headband: headbandTexture('#d9b56a', '#1c1a2a'),
    };
  },
  paint: (page, canvas, spineOnLeft, _state, design) => {
    if (page === 1) drawTitlePageTexture(canvas, design, PAPER);
    else {
      const random = seeded(hashText(`debug:${page}`));
      drawPageTexture(
        canvas,
        layoutPage({ before: glitch(randomBabelText(PAGE_LENGTH, random), page, random), after: '' }),
        spineOnLeft,
        PAPER,
      );
    }
    return true;
  },
  tick: (now) => tick?.(now) ?? false,
};
