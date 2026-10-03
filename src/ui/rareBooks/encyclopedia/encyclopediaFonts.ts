import '@fontsource/im-fell-dw-pica/400.css';
import '@fontsource/im-fell-dw-pica/400-italic.css';
import '@fontsource/im-fell-dw-pica-sc/400.css';
import '@fontsource/im-fell-french-canon/400.css';
import '@fontsource/im-fell-french-canon/400-italic.css';

/**
 * Les polices de l'Encyclopédie : des caractères anciens, l'encre qui bave un peu (IM Fell). Le texte en Pica,
 * ses petites capitales, les titres en Canon.
 */
export const FELL = "'IM Fell DW Pica', Georgia, serif";
export const FELL_SC = "'IM Fell DW Pica SC', 'IM Fell DW Pica', Georgia, serif";
export const CANON = "'IM Fell French Canon', 'IM Fell DW Pica', Georgia, serif";

export const loadEncyclopediaFonts = (): Promise<unknown> =>
  Promise.all(
    [`16px ${FELL}`, `italic 16px ${FELL}`, `16px ${FELL_SC}`, `20px ${CANON}`, `italic 20px ${CANON}`].map((font) =>
      document.fonts.load(font),
    ),
  );
