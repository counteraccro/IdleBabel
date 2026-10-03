import { alexHArt } from './alexH/alexH';
import { arabianNightsArt } from './arabianNights/arabianNights';
import { aliceArt } from './alice/alice';
import { bibleArt } from './bible/bible';
import { blankPageArt } from './blankPage/blankPage';
import { creditsArt } from './credits/credits';
import { deathBookArt } from './deathBook/deathBook';
import { directoryArt } from './directory/directory';
import { idleBabelArt } from './idleBabel/idleBabel';
import { mobyDickArt } from './mobyDick/mobyDick';
import { odysseyArt } from './odyssey/odyssey';
import { orianaArt } from './oriana/oriana';
import { quixoteArt } from './quixote/quixote';
import { defaultArt } from './defaultArt';
import { debugBookArt } from './debugBook/debugBook';
import type { RareBookArt } from './rareBookArt';

/** Les livres rares déjà dessinés ; les autres : cuir, vrai titre et lorem ipsum (defaultArt.ts). */
const ARTS: Record<string, RareBookArt> = {
  alexH: alexHArt,
  arabianNights: arabianNightsArt,
  alice: aliceArt,
  bible: bibleArt,
  blankPage: blankPageArt,
  credits: creditsArt,
  deathBook: deathBookArt,
  directory: directoryArt,
  idleBabel: idleBabelArt,
  mobyDick: mobyDickArt,
  odyssey: odysseyArt,
  oriana: orianaArt,
  quixote: quixoteArt,
  debug: debugBookArt,
};

export const rareBookArt = (id: string): RareBookArt => ARTS[id] ?? defaultArt(id);
