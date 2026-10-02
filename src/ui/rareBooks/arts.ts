import { alexHArt } from './alexH/alexH';
import { aliceArt } from './alice/alice';
import { blankPageArt } from './blankPage/blankPage';
import { deathBookArt } from './deathBook/deathBook';
import { directoryArt } from './directory/directory';
import { orianaArt } from './oriana/oriana';
import { defaultArt } from './defaultArt';
import { debugBookArt } from './debugBook/debugBook';
import type { RareBookArt } from './rareBookArt';

/** Les livres rares déjà dessinés ; les autres : cuir, vrai titre et lorem ipsum (defaultArt.ts). */
const ARTS: Record<string, RareBookArt> = {
  alexH: alexHArt,
  alice: aliceArt,
  blankPage: blankPageArt,
  deathBook: deathBookArt,
  directory: directoryArt,
  oriana: orianaArt,
  debug: debugBookArt,
};

export const rareBookArt = (id: string): RareBookArt => ARTS[id] ?? defaultArt(id);
