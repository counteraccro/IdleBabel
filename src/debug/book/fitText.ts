import { textWidth, type TextItem } from '../../ui/strangeBook/pageItems';

/** Rétréci s'il le faut pour tenir en `room` (repère de la page, 640 de large). */
export const shrinkTo = (item: TextItem, room: number): TextItem => {
  const width = textWidth(item);
  return width > room ? { ...item, size: Math.max(9, Math.floor((item.size * room) / width)) } : item;
};

/**
 * Coupé en lignes de `room` au plus, `lines` lignes au plus (la dernière rétrécie s'il reste trop),
 * espacées de `step`.
 */
export const wrapTo = (item: TextItem, room: number, lines: number, step: number): TextItem[] => {
  const words = item.text.split(' ');
  const out: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && out.length < lines - 1 && textWidth({ ...item, text: candidate }) > room) {
      out.push(line);
      line = word;
    } else line = candidate;
  }
  out.push(line);
  return out.map((text, index) => shrinkTo({ ...item, text, y: item.y + index * step }, room));
};
