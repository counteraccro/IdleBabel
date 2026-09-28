import { SERIF_FONT, hash, type Item } from '../strangeBook/pageItems';

let measurer: CanvasRenderingContext2D | null = null;

/** Largeur d'un texte dans le repère de la page (même police que l'affichage). */
export const measureText = (text: string, size: number, italic = false): number => {
  measurer ??= document.createElement('canvas').getContext('2d');
  if (!measurer) return text.length * size * 0.5;
  measurer.font = `${italic ? 'italic ' : ''}${size}px ${SERIF_FONT}`;
  return measurer.measureText(text).width;
};

export interface ParagraphStyle {
  /** Bord gauche et largeur de la colonne. */
  left: number;
  width: number;
  size: number;
  line: number;
  align: 'left' | 'center';
  italic?: boolean;
  faded?: boolean;
  /** Apparition en fondu, à partir de ce délai (ms), une ligne après l'autre. */
  reveal?: number;
}

/**
 * Un mot et son aspect. Les mots voisins de même `key` sont écrits d'un seul tenant ; `gather` : ses
 * lettres viennent de s'ordonner (livre blanc).
 */
export interface Word {
  text: string;
  key: string;
  ink?: 'noise' | 'ghost';
  gather?: boolean;
}

/**
 * Un paragraphe dont les mots n'ont pas tous le même aspect (encre, symboles fantômes), coupé à la
 * largeur de la colonne. Chaque ligne est découpée en suites de même aspect, placées d'après la mesure
 * du début de la ligne. Renvoie ses éléments et le bas du texte.
 */
export const wordsParagraph = (words: Word[], top: number, style: ParagraphStyle): { items: Item[]; bottom: number } => {
  const measure = (text: string): number => measureText(text, style.size, style.italic);
  const lines: Word[][] = [[]];
  let width = 0;
  const space = measure(' ');
  for (const word of words) {
    const size = measure(word.text);
    if (width > 0 && width + space + size > style.width) {
      lines.push([]);
      width = 0;
    }
    width += (width > 0 ? space : 0) + size;
    lines[lines.length - 1].push(word);
  }
  const items = lines.flatMap((line, index) => {
    const full = line.map((word) => word.text).join(' ');
    const start = style.align === 'center' ? 320 - measure(full) / 2 : style.left;
    const runs: { start: string; words: Word[] }[] = [];
    line.forEach((word, position) => {
      const last = runs[runs.length - 1];
      if (last && last.words[0].key === word.key) last.words.push(word);
      else runs.push({ start: line.slice(0, position).map((w) => `${w.text} `).join(''), words: [word] });
    });
    return runs.map(({ start: before, words: run }): Item => {
      const first = run[0];
      return {
        kind: 'text',
        text: run.map((word) => word.text).join(' '),
        x: start + measure(before),
        y: top + index * style.line,
        size: style.size,
        align: 'left',
        italic: style.italic,
        faded: style.faded,
        ink: first.ink,
        gather: first.gather ? hash(index, measure(before)) : undefined,
        reveal: style.reveal === undefined ? undefined : style.reveal + index * 120,
      };
    });
  });
  return { items, bottom: top + lines.length * style.line };
};

/** Un paragraphe d'un seul aspect. */
export const paragraph = (text: string, top: number, style: ParagraphStyle, ink?: Word['ink']): { items: Item[]; bottom: number } =>
  wordsParagraph(
    text.split(' ').map((word) => ({ text: word, key: 'text', ink })),
    top,
    style,
  );
