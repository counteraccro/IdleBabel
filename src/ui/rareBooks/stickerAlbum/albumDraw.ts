import '@fontsource/lilita-one/400.css';
import '@fontsource/crimson-pro/400.css';
import '@fontsource/crimson-pro/400-italic.css';
import '@fontsource/caveat/600.css';
import { getLocale } from '../../../i18n';

/**
 * Les outils de l'album d'autocollants (maquette .ai/maquette-album-autocollants.html, validée le 22/10) : les polices, le
 * papier à trame de points, le bandeau de couleur des pages et sa pastille. Mesures de la maquette (page 640 × 800, celle de
 * la texture).
 */

export const W = 640;
export const H = 800;
export const C = W / 2;
export const POP = "'Lilita One', 'Arial Black', sans-serif";
export const SANS = "'Helvetica Neue', Arial, sans-serif";
export const HAND = "'Caveat', cursive";
export const SERIF = "'Crimson Pro', Georgia, serif";
export const INK = '#4a3a28';
export const PENCIL = '#3a3a8a';
export const YELLOW = '#ffe14a';
export const RED = '#c8202b';
export const BLUE = '#1d5fb8';

export const loadAlbumFonts = (): Promise<unknown> =>
  Promise.all(
    [`40px "Lilita One"`, `400 40px "Crimson Pro"`, `italic 400 40px "Crimson Pro"`, `600 40px Caveat`].map((font) =>
      document.fonts.load(font),
    ),
  );

/** Un nombre écrit à la façon de la langue du jeu (« 4 728 », « 4,728 »). */
export const group = (n: number): string => new Intl.NumberFormat(getLocale()).format(n);

export const text = (
  context: CanvasRenderingContext2D,
  label: string,
  x: number,
  y: number,
  font: string,
  color: string | CanvasGradient,
  align: CanvasTextAlign = 'center',
): void => {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.textBaseline = 'alphabetic';
  context.fillText(label, x, y);
};

/** Le mot `label` raccourci (…) pour tenir dans `width`, dans la police déjà choisie. */
export const shorten = (context: CanvasRenderingContext2D, label: string, width: number): string => {
  let short = label;
  while (context.measureText(short).width > width && short.length > 4) short = `${short.slice(0, -2)}…`;
  return short;
};

/**
 * Le papier de l'album : une trame de points très légère sur la page déjà préparée (pageRender), le numéro de la page dans
 * le coin extérieur, à la couleur de la page.
 */
export const paper = (context: CanvasRenderingContext2D, color: string, number: number, spineOnLeft: boolean): void => {
  context.fillStyle = 'rgba(120,90,40,0.05)';
  context.beginPath();
  for (let y = 6; y < H; y += 12)
    for (let x = (y / 12) % 2 ? 6 : 0; x < W; x += 12) {
      context.moveTo(x + 1.6, y);
      context.arc(x, y, 1.6, 0, 2 * Math.PI);
    }
  context.fill();
  text(context, String(number), spineOnLeft ? W - 40 : 40, H - 26, `18px ${POP}`, color);
};

/** Le bandeau de la page, en biais : le titre en jaune bombé, le sous-titre ; la pastille du compte (`total` 0 : aucune). */
export const header = (context: CanvasRenderingContext2D, title: string, subtitle: string, color: string, have = 0, total = 0): void => {
  context.save();
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(0, 30);
  context.lineTo(W, 18);
  context.lineTo(W, 108);
  context.lineTo(0, 120);
  context.closePath();
  context.fill();
  context.fillStyle = 'rgba(255,255,255,0.12)';
  context.beginPath();
  context.moveTo(0, 104);
  context.lineTo(W, 92);
  context.lineTo(W, 108);
  context.lineTo(0, 120);
  context.closePath();
  context.fill();
  context.lineJoin = 'round';
  let size = 44;
  do context.font = `${size--}px ${POP}`;
  while (context.measureText(title.toUpperCase()).width > W - 60 && size > 20);
  context.textAlign = 'center';
  context.lineWidth = 8;
  context.strokeStyle = 'rgba(0,0,0,0.35)';
  context.strokeText(title.toUpperCase(), C, 78);
  context.fillStyle = YELLOW;
  context.fillText(title.toUpperCase(), C, 76);
  text(context, subtitle, C, 102, `italic 17px ${SERIF}`, '#fff8e0');
  context.restore();
  if (!total) return;
  const full = have === total;
  context.save();
  context.translate(W - 70, 140);
  context.rotate(0.12);
  context.fillStyle = full ? '#2f8a3a' : '#ffffff';
  context.strokeStyle = color;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(0, 0, 34, 0, 2 * Math.PI);
  context.fill();
  context.stroke();
  const count = `${have}/${total}`;
  text(context, count, 0, 8, `${count.length > 5 ? 18 : 22}px ${POP}`, full ? '#fff' : color);
  context.restore();
};

/** Un petit bandeau de couleur au milieu d'une page, pour une deuxième partie (les fers d'angle sous les cuirs). */
export const subHeader = (context: CanvasRenderingContext2D, title: string, color: string, y: number): void => {
  context.fillStyle = color;
  context.fillRect(60, y + 6, W - 120, 30);
  text(context, title.toUpperCase(), C, y + 29, `22px ${POP}`, YELLOW);
};
