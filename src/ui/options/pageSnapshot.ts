import { leafPixelRatio } from '../book/leafRenderer';

/**
 * Photographie d'une page du carnet sur un canevas, pour la feuille WebGL qui s'enroule (le HTML
 * vivant ne peut pas servir de texture). La page est recopiée dans une scène hors écran aux
 * dimensions d'une moitié de carnet ; chaque élément y est mesuré puis redessiné à sa place :
 * papier, usure, croquis, mots, cases, traits de crayon, bords déchirés. Les marges restent
 * transparentes : le carton de la moitié de carnet se voit dessous.
 */

const GRAPHITE = '#34302b';

const images = new Map<string, HTMLImageElement>();
/** Images (usure, croquis) : chargées une fois, dessinées dès qu'elles sont prêtes. */
const image = (src: string): HTMLImageElement => {
  let img = images.get(src);
  if (!img) {
    img = new Image();
    img.src = src;
    images.set(src, img);
  }
  return img;
};
const svgSource = (svg: SVGElement, color: string): string => {
  const markup = svg.outerHTML.replace('<svg ', "<svg xmlns='http://www.w3.org/2000/svg' ").replaceAll('currentColor', color);
  return `data:image/svg+xml,${encodeURIComponent(markup)}`;
};
const backgroundSource = (node: Element): string | null => {
  const match = /url\("(.*)"\)/.exec(getComputedStyle(node).backgroundImage);
  return match ? match[1] : null;
};

/** Lance le chargement des images d'une page, pour qu'elles soient prêtes quand elle tournera. */
export const preloadPage = (page: HTMLElement): void => {
  page.querySelectorAll('.wear').forEach((node) => {
    const src = (node as HTMLElement).style.backgroundImage.match(/url\("(.*)"\)/)?.[1];
    if (src) image(src);
  });
  page.querySelectorAll<SVGElement>('.doodle svg').forEach((svg) => image(svgSource(svg, 'rgb(109, 102, 92)')));
};

/** Découpe « polygon(x% y%, …) » (voir roughEdges) en points dans la page. */
const clipPoints = (clip: string, width: number, height: number): [number, number][] => {
  const inner = /polygon\((.*)\)/.exec(clip)?.[1];
  if (!inner) return [];
  return inner.split(',').map((pair) => {
    const [x, y] = pair.trim().split(/\s+/).map(parseFloat);
    return [(width * x) / 100, (height * y) / 100];
  });
};

/** Papier : la même teinte que la page CSS ; le reste (carreaux, bords, taches) vient de l'image d'usure. */
const drawPaper = (ctx: CanvasRenderingContext2D, w: number, h: number): void => {
  ctx.fillStyle = '#e8dcbd';
  ctx.fillRect(0, 0, w, h);
};

/** Chaque mot, à la place et dans la police où le navigateur l'a mis. */
const drawWords = (ctx: CanvasRenderingContext2D, root: HTMLElement, origin: DOMRect): void => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const parent = node.parentElement!;
    const style = getComputedStyle(parent);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ctx.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
    ctx.fillStyle = style.color;
    ctx.textBaseline = 'alphabetic';
    const text = node.data;
    for (const match of text.matchAll(/\S+/g)) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const rect = range.getBoundingClientRect();
      if (!rect.width) continue;
      const ascent = ctx.measureText(match[0]).fontBoundingBoxAscent;
      ctx.fillText(match[0], rect.left - origin.left, rect.top - origin.top + ascent);
    }
  }
  ctx.letterSpacing = '0px';
};

/**
 * Les traits de crayon faits en CSS (images SVG de fond, dans options.css) : mêmes tracés, même
 * boîte, même épaisseur, pour que la photo ne paraisse pas plus grasse que la page.
 */
const CHECK = { path: new Path2D('M3 11 L8 16 L19 1'), box: 20, width: 2.6 };
const UNDERLINE = { path: new Path2D('M2 5 Q 50 1 100 4 T 198 3'), width: 200, height: 8, stroke: 1.6, band: 7 };
const CIRCLE = { path: new Path2D('M8 20 C 4 8 30 2 48 6 C 60 10 58 26 40 29 C 22 32 6 28 8 16'), width: 60, height: 34, stroke: 1.6 };
const BOX_BORDER = 2;

/** Rotation d'un élément (transform et rotate), en radians. */
const angleOf = (el: Element): number => {
  const style = getComputedStyle(el);
  const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
  const rotate = style.rotate === 'none' ? 0 : parseFloat(style.rotate);
  return Math.atan2(matrix.b, matrix.a) + (rotate * Math.PI) / 180;
};

const drawPencil = (ctx: CanvasRenderingContext2D, root: HTMLElement, origin: DOMRect): void => {
  const at = (el: Element): DOMRect => {
    const r = el.getBoundingClientRect();
    return new DOMRect(r.left - origin.left, r.top - origin.top, r.width, r.height);
  };
  /** Trace `path` (en unités de son viewBox `w` × `h`) étiré sur la boîte, comme preserveAspectRatio="none". */
  const stretched = (path: Path2D, w: number, h: number, stroke: number, x: number, y: number, boxW: number, boxH: number): void => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(boxW / w, boxH / h);
    ctx.lineWidth = stroke;
    ctx.stroke(path);
    ctx.restore();
  };
  ctx.strokeStyle = GRAPHITE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Case : sa bordure et sa coche, tournées avec elle (et avec sa ligne, écrite de travers).
  root.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((box) => {
    const r = at(box);
    const w = box.offsetWidth;
    const h = box.offsetHeight;
    ctx.save();
    ctx.translate(r.x + r.width / 2, r.y + r.height / 2);
    ctx.rotate(angleOf(box) + angleOf(box.closest('.option-toggle') ?? box));
    ctx.translate(-w / 2, -h / 2);
    ctx.lineWidth = BOX_BORDER;
    ctx.beginPath();
    ctx.roundRect(BOX_BORDER / 2, BOX_BORDER / 2, w - BOX_BORDER, h - BOX_BORDER, [3, 6, 4, 7]);
    ctx.stroke();
    if (box.checked) {
      // Fond « center / 125% » de la zone intérieure (sans la bordure).
      const size = (w - 2 * BOX_BORDER) * 1.25;
      stretched(CHECK.path, CHECK.box, CHECK.box, CHECK.width, (w - size) / 2, (h - size) / 2, size, size);
    }
    ctx.restore();
  });
  // Soulignés : fond « bottom / 100% 7px ».
  root.querySelectorAll('.options-section h2').forEach((heading) => {
    const r = at(heading);
    stretched(UNDERLINE.path, UNDERLINE.width, UNDERLINE.height, UNDERLINE.stroke, r.x, r.bottom - UNDERLINE.band, r.width, UNDERLINE.band);
  });
  // Langue entourée : fond « center / 100% 100% ».
  root.querySelectorAll('.langs .active').forEach((active) => {
    const r = at(active);
    stretched(CIRCLE.path, CIRCLE.width, CIRCLE.height, CIRCLE.stroke, r.x, r.y, r.width, r.height);
  });
};

/** Croquis (SVG) avec leur rotation. */
const drawDoodles = (ctx: CanvasRenderingContext2D, root: HTMLElement): void => {
  root.querySelectorAll<HTMLElement>('.doodle').forEach((doodle) => {
    const svg = doodle.querySelector('svg');
    const img = svg && image(svgSource(svg, getComputedStyle(doodle).color));
    if (!img?.complete || !img.naturalWidth) return;
    const style = getComputedStyle(doodle);
    const matrix = new DOMMatrix(style.transform === 'none' ? undefined : style.transform);
    ctx.save();
    ctx.globalAlpha = Number(style.opacity);
    ctx.translate(doodle.offsetLeft + doodle.offsetWidth / 2, doodle.offsetTop + doodle.offsetHeight / 2);
    ctx.transform(matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f);
    ctx.drawImage(img, -doodle.offsetWidth / 2, -doodle.offsetHeight / 2, doodle.offsetWidth, doodle.offsetHeight);
    ctx.restore();
  });
};

/**
 * Anneaux de la spirale (voir .sketchbook-rings dans options.css), redessinés sur la photo : la feuille
 * qui tourne passe devant la vraie spirale, et à plat elle doit la montrer telle qu'elle est. Seule la
 * moitié de chaque anneau posée sur cette page tombe dans l'image.
 */
const RING = { width: 30, height: 9, border: 2, radius: 5, hole: 6, holeInset: 3 };
const drawRings = (ctx: CanvasRenderingContext2D, rings: HTMLElement, spineX: number): void => {
  rings.querySelectorAll<HTMLElement>('span').forEach((ring) => {
    const x = spineX - RING.width / 2;
    const y = rings.offsetTop + ring.offsetTop;
    const half = RING.border / 2;
    ctx.save();
    ctx.lineWidth = RING.border;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 1;
    ctx.strokeStyle = '#8b8a84';
    ctx.beginPath();
    ctx.roundRect(x + half, y + half, RING.width - RING.border, RING.height - RING.border, RING.radius - half);
    ctx.stroke();
    ctx.restore();
    // Bord du haut piqué de rouille.
    ctx.strokeStyle = '#9a7a5c';
    ctx.lineWidth = RING.border;
    ctx.beginPath();
    ctx.moveTo(x + RING.radius, y + half);
    ctx.lineTo(x + RING.width - RING.radius, y + half);
    ctx.stroke();
    // Les trous dans le papier, de part et d'autre du dos.
    ctx.fillStyle = '#1c140d';
    const r = RING.hole / 2;
    for (const cx of [x + RING.border + RING.holeInset + r, x + RING.width - RING.border - RING.holeInset - r]) {
      ctx.beginPath();
      ctx.arc(cx, y + RING.height / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
};

/**
 * Photographie `page` (page de droite, verso, ou rien : papier nu) dans `canvas`, aux dimensions
 * d'une moitié de carnet (`width` × `height`). `stage` : conteneur hors écran, dans le carnet
 * (il en hérite les couleurs et les polices). `rings` : la spirale, dont les anneaux sont redessinés
 * sur le bord du dos (à gauche pour une page de droite, à droite pour un verso).
 */
export const snapshotPage = (
  page: HTMLElement | null,
  canvas: HTMLCanvasElement,
  stage: HTMLElement,
  width: number,
  height: number,
  rings: HTMLElement,
  spine: 'left' | 'right',
): void => {
  // À la finesse du canevas de la feuille : un pixel de la photo pour un pixel de la feuille à plat.
  const scale = leafPixelRatio();
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, width, height);
  const copy = (page?.cloneNode(true) as HTMLElement | undefined) ?? Object.assign(document.createElement('div'), { className: 'sketchbook-verso' });
  stage.style.width = `${width}px`;
  stage.style.height = `${height}px`;
  stage.replaceChildren(copy);
  const origin = stage.getBoundingClientRect();
  const box = copy.getBoundingClientRect();
  const x = box.left - origin.left;
  const y = box.top - origin.top;

  ctx.save();
  ctx.translate(x, y);
  const points = clipPoints(copy.style.clipPath, box.width, box.height);
  if (points.length) {
    ctx.beginPath();
    points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.closePath();
    ctx.clip();
  }
  drawPaper(ctx, box.width, box.height);
  copy.querySelectorAll('.wear').forEach((wear) => {
    const src = backgroundSource(wear);
    const img = src ? image(src) : null;
    if (img?.complete && img.naturalWidth) ctx.drawImage(img, 0, 0, box.width, box.height);
  });
  drawDoodles(ctx, copy);
  ctx.restore();
  drawWords(ctx, copy, origin);
  drawPencil(ctx, copy, origin);
  drawRings(ctx, rings, spine === 'left' ? 0 : width);
  stage.replaceChildren();
};
