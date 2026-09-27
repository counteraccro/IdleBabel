/**
 * Photographie d'une page du carnet sur un canevas, pour la feuille WebGL qui s'enroule (le HTML
 * vivant ne peut pas servir de texture). La page est recopiée dans une scène hors écran aux
 * dimensions d'une moitié de carnet ; chaque élément y est mesuré puis redessiné à sa place :
 * papier, usure, croquis, mots, cases, traits de crayon, bords déchirés. Les marges restent
 * transparentes : le carton de la moitié de carnet se voit dessous.
 */
const SCALE = 2;
/** Bande le long du dos, là où passent les anneaux : laissée vide, la spirale reste visible. */
const RING_STRIP = 17;
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

/** Les traits de crayon faits en CSS : cases, soulignés des titres, langue entourée. */
const drawPencil = (ctx: CanvasRenderingContext2D, root: HTMLElement, origin: DOMRect): void => {
  const at = (el: Element): DOMRect => {
    const r = el.getBoundingClientRect();
    return new DOMRect(r.left - origin.left, r.top - origin.top, r.width, r.height);
  };
  ctx.strokeStyle = GRAPHITE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  root.querySelectorAll<HTMLInputElement>('input[type=checkbox]').forEach((box) => {
    const r = at(box);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(r.x + 1, r.y + 1, r.width - 2, r.height - 2, [3, 6, 4, 7]);
    ctx.stroke();
    if (box.checked) {
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(r.x + r.width * 0.15, r.y + r.height * 0.55);
      ctx.lineTo(r.x + r.width * 0.4, r.y + r.height * 0.8);
      ctx.lineTo(r.x + r.width * 0.95, r.y + r.height * 0.05);
      ctx.stroke();
    }
  });
  ctx.lineWidth = 1.6;
  root.querySelectorAll('.options-section h2').forEach((heading) => {
    const r = at(heading);
    const y = r.bottom - 3;
    ctx.beginPath();
    ctx.moveTo(r.x + 2, y);
    ctx.quadraticCurveTo(r.x + r.width * 0.25, y - 4, r.x + r.width * 0.5, y - 1);
    ctx.quadraticCurveTo(r.x + r.width * 0.75, y + 2, r.right - 2, y - 2);
    ctx.stroke();
  });
  root.querySelectorAll('.langs .active').forEach((active) => {
    const r = at(active);
    ctx.beginPath();
    ctx.ellipse(r.x + r.width / 2, r.y + r.height / 2, r.width / 2, r.height / 2, -0.05, 0.2, Math.PI * 2 + 0.1);
    ctx.stroke();
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
 * Photographie `page` (page de droite, verso, ou rien : papier nu) dans `canvas`, aux dimensions
 * d'une moitié de carnet (`width` × `height`). `stage` : conteneur hors écran, dans le carnet
 * (il en hérite les couleurs et les polices). `spine` : côté du dos sur cette image (à gauche pour
 * une page de droite, à droite pour un verso) ; la bande des anneaux y reste transparente.
 */
export const snapshotPage = (
  page: HTMLElement | null,
  canvas: HTMLCanvasElement,
  stage: HTMLElement,
  width: number,
  height: number,
  spine: 'left' | 'right',
): void => {
  canvas.width = Math.round(width * SCALE);
  canvas.height = Math.round(height * SCALE);
  const ctx = canvas.getContext('2d')!;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
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
  ctx.clearRect(spine === 'left' ? 0 : width - RING_STRIP, 0, RING_STRIP, height);
  stage.replaceChildren();
};
