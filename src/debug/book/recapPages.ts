import { createInitialState, type GameState } from '../../core/state';
import { createLeafPage, type LeafPage } from '../../ui/strangeBook/pages';
import { folio, heading, textWidth, type Item, type TextItem } from '../../ui/strangeBook/pageItems';
import { debugState } from '../debugState';
import { recapSections } from './recap';
import { shrinkTo } from './fitText';

export const RECAP_TITLE = 'Chiffres';

/** Lignes d'une page : depuis le haut, espacées d'autant, jusqu'au numéro de page (repère 640 × 800). */
const TOP = 168;
const STEP = 30;
const PER_PAGE = 17;
const LEFT = 70;
const RIGHT = 570;

/** Une ligne de page : le titre d'une partie, ou une ligne (n° de partie, n° de ligne). */
type Line = { section: number } | { section: number; row: number };

/** Les lignes réparties en pages ; un titre de partie ne reste jamais seul en bas d'une page. */
const paginate = (state: GameState): Line[][] => {
  const pages: Line[][] = [[]];
  recapSections(state).forEach((section, index) => {
    const lines: Line[] = [{ section: index }, ...section.rows.map((_, row) => ({ section: index, row }))];
    lines.forEach((line, at) => {
      const page = pages[pages.length - 1];
      const full = page.length >= PER_PAGE || (at === 0 && page.length >= PER_PAGE - 2);
      if (full) pages.push([line]);
      else page.push(line);
    });
  });
  return pages;
};

const lineItems = (state: GameState, lines: Line[]): Item[] => {
  const sections = recapSections(state);
  return lines.flatMap((line, index): Item[] => {
    const y = TOP + index * STEP;
    const section = sections[line.section];
    if (!('row' in line))
      return [
        shrinkTo(
          { kind: 'text', text: section.title, x: LEFT, y, size: 19, align: 'left', gold: true, caps: true, spacing: 2 },
          RIGHT - LEFT,
        ),
      ];
    const [label, text] = section.rows[line.row];
    const value = shrinkTo({ kind: 'text', text, x: RIGHT, y, size: 16, align: 'right' }, 300);
    const room = RIGHT - LEFT - textWidth(value) - 16;
    const name: TextItem = shrinkTo(
      { kind: 'text', text: label, x: LEFT + 12, y, size: 16, align: 'left', italic: true, faded: true },
      room - 12,
    );
    return [name, value];
  });
};

/**
 * Le récapitulatif du livre de débogage : tous les chiffres du jeu (chances, parts, prix, rythmes), relus
 * à chaque dessin. `first` : numéro de sa première page dans le livre ; `chapter` : son numéro de chapitre.
 */
export const recapPages = (goTo: (page: number) => void, first: number, chapter: number): LeafPage[] => {
  const read = (): GameState => debugState() ?? createInitialState('fr');
  return paginate(read()).map((lines, index) =>
    createLeafPage(() => [...heading(RECAP_TITLE, chapter), ...lineItems(read(), lines), folio(first + index + 1)], goTo),
  );
};
