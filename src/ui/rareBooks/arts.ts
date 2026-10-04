import { alexHArt } from './alexH/alexH';
import { almanacArt } from './almanac/almanac';
import { arabianNightsArt } from './arabianNights/arabianNights';
import { aliceArt } from './alice/alice';
import { bibleArt } from './bible/bible';
import { blankPageArt } from './blankPage/blankPage';
import { creditsArt } from './credits/credits';
import { dadJokesArt } from './dadJokes/dadJokes';
import { deathBookArt } from './deathBook/deathBook';
import { divineComedyArt } from './divineComedy/divineComedy';
import { encyclopediaArt } from './encyclopedia/encyclopedia';
import { directoryArt } from './directory/directory';
import { idleBabelArt } from './idleBabel/idleBabel';
import { mobyDickArt } from './mobyDick/mobyDick';
import { necronomiconArt } from './necronomicon/necronomicon';
import { odysseyArt } from './odyssey/odyssey';
import { orianaArt } from './oriana/oriana';
import { quixoteArt } from './quixote/quixote';
import { saragossaArt } from './saragossa/saragossa';
import { defaultArt } from './defaultArt';
import { debugBookArt } from './debugBook/debugBook';
import type { RareBookArt } from './rareBookArt';

/** Les livres rares déjà dessinés ; les autres : cuir, vrai titre et lorem ipsum (defaultArt.ts). */
const ARTS: Record<string, RareBookArt> = {
  alexH: alexHArt,
  almanac: almanacArt,
  arabianNights: arabianNightsArt,
  alice: aliceArt,
  bible: bibleArt,
  blankPage: blankPageArt,
  credits: creditsArt,
  dadJokes: dadJokesArt,
  deathBook: deathBookArt,
  divineComedy: divineComedyArt,
  directory: directoryArt,
  encyclopedia: encyclopediaArt,
  idleBabel: idleBabelArt,
  mobyDick: mobyDickArt,
  necronomicon: necronomiconArt,
  odyssey: odysseyArt,
  oriana: orianaArt,
  quixote: quixoteArt,
  saragossa: saragossaArt,
  debug: debugBookArt,
};

export const rareBookArt = (id: string): RareBookArt => ARTS[id] ?? defaultArt(id);
