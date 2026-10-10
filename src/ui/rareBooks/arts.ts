import { alexHArt } from './alexH/alexH';
import { almanacArt } from './almanac/almanac';
import { arabianNightsArt } from './arabianNights/arabianNights';
import { aliceArt } from './alice/alice';
import { bibleArt } from './bible/bible';
import { bigXArt } from './bigX/bigX';
import { catalogueArt } from './catalogue/catalogue';
import { centerEarthArt } from './centerEarth/centerEarth';
import { blankPageArt } from './blankPage/blankPage';
import { creditsArt } from './credits/credits';
import { dadJokesArt } from './dadJokes/dadJokes';
import { darkPatternsArt } from './darkPatterns/darkPatterns';
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
import { rabbitArt } from './rabbit/rabbit';
import { saragossaArt } from './saragossa/saragossa';
import { sandArt } from './sand/sand';
import { voynichArt } from './voynich/voynich';
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
  bigX: bigXArt,
  blankPage: blankPageArt,
  catalogue: catalogueArt,
  centerEarth: centerEarthArt,
  credits: creditsArt,
  dadJokes: dadJokesArt,
  darkPatterns: darkPatternsArt,
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
  rabbit: rabbitArt,
  saragossa: saragossaArt,
  sand: sandArt,
  voynich: voynichArt,
  debug: debugBookArt,
};

export const rareBookArt = (id: string): RareBookArt => ARTS[id] ?? defaultArt(id);
