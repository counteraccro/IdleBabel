import { el } from '../dom';

/**
 * Usure du carnet : un carnet qui a vécu dans une poche. Tout vient de bruit procédural (SVG
 * feTurbulence) plutôt que de formes dessinées, pour que les taches aient l'air vraies. L'image
 * est calculée une fois (fond d'image) : la page reste légère quand elle tourne.
 * Tirée d'une graine : chaque page garde toujours les mêmes taches.
 */
const W = 460;
const H = 400;

const seeded = (seed: number): (() => number) => {
  let a = seed * 9301 + 49297;
  return () => {
    a = (a * 1664525 + 1013904223) >>> 0;
    return a / 4294967296;
  };
};

/**
 * Un calque de bruit coloré : `alpha` transforme l'intensité du bruit en opacité
 * (pente, seuil) — une pente forte ne garde que des îlots épars.
 */
const noise = (
  id: string,
  { frequency, octaves = 3, seed, color, slope, offset, blur = 0, mask }: {
    frequency: string;
    octaves?: number;
    seed: number;
    color: [number, number, number];
    slope: number;
    offset: number;
    blur?: number;
    mask?: string;
  },
): string => {
  const [r, g, b] = color.map((c) => (c / 255).toFixed(3));
  const soften = blur ? `<feGaussianBlur stdDeviation="${blur}"/>` : '';
  return `<filter id="${id}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="${octaves}" seed="${seed}"/>
      <feColorMatrix type="matrix" values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} ${slope} 0 0 0 ${offset}"/>${soften}
    </filter>
    <rect width="${W}" height="${H}" filter="url(#${id})"${mask ? ` mask="url(#${mask})"` : ''}/>`;
};

/** Masque plus fort vers les bords et les coins : là où les doigts et la poche usent le carnet. */
const edgeMask = (id: string, inner: number): string => `<radialGradient id="${id}-g" cx="50%" cy="50%" r="72%">
    <stop offset="${inner}" stop-color="black"/><stop offset="1" stop-color="white"/></radialGradient>
  <mask id="${id}"><rect width="${W}" height="${H}" fill="url(#${id}-g)"/></mask>`;

const toBackground = (svg: string): string =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='none'>${svg}</svg>`)}")`;

const layer = (className: string, svg: string): HTMLElement => {
  const root = el('span', `wear ${className}`);
  root.setAttribute('aria-hidden', 'true');
  root.style.backgroundImage = toBackground(svg);
  return root;
};

/** Trace de tasse : un anneau cassé, épais par endroits, dont le bord a bu dans le papier. */
const coffeeRing = (random: () => number, seed: number): string => {
  const cx = 70 + random() * (W - 140);
  const cy = 70 + random() * (H - 140);
  const r = 34 + random() * 14;
  const circumference = 2 * Math.PI * r;
  const gap = circumference * (0.15 + random() * 0.25);
  return `<filter id="ring-${seed}" x="-20%" y="-20%" width="140%" height="140%">
      <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" seed="${seed}"/>
      <feDisplacementMap in="SourceGraphic" scale="7"/><feGaussianBlur stdDeviation="0.8"/>
    </filter>
    <g filter="url(#ring-${seed})">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgb(150,100,50)" fill-opacity="0.07"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgb(110,65,25)" stroke-opacity="0.32" stroke-width="2.6"
        stroke-dasharray="${circumference - gap} ${gap}" transform="rotate(${random() * 360} ${cx} ${cy})"/>
      <circle cx="${cx + 2}" cy="${cy + 1.5}" r="${r - 3}" fill="none" stroke="rgb(110,65,25)" stroke-opacity="0.12" stroke-width="1.4"
        stroke-dasharray="${circumference * 0.4} ${circumference * 0.2}"/>
    </g>`;
};

/** Papier : jaunissement inégal, fibres, rousseurs, crasse vers les bords, parfois une trace de tasse. */
export const paperWear = (seed: number, { coffee = false } = {}): HTMLElement => {
  const random = seeded(seed);
  const s = Math.floor(random() * 1000);
  const svg = `<defs>${edgeMask(`edge-${seed}`, 0.45)}</defs>
    ${noise(`tone-${seed}`, { frequency: '0.009', octaves: 4, seed: s, color: [150, 105, 45], slope: 1.3, offset: -0.52 })}
    ${noise(`fiber-${seed}`, { frequency: '0.7 0.06', octaves: 2, seed: s + 1, color: [120, 95, 60], slope: 0.9, offset: -0.42 })}
    ${noise(`grime-${seed}`, { frequency: '0.035', octaves: 4, seed: s + 2, color: [85, 60, 30], slope: 1.6, offset: -0.45, mask: `edge-${seed}` })}
    ${noise(`fox-${seed}`, { frequency: '0.13', octaves: 2, seed: s + 3, color: [135, 85, 35], slope: 9, offset: -7.3, blur: 0.4 })}
    ${noise(`smear-${seed}`, { frequency: '0.004 0.02', octaves: 3, seed: s + 4, color: [70, 65, 60], slope: 1.2, offset: -0.62 })}
    ${coffee ? coffeeRing(random, s) : ''}`;
  return layer('paper-wear', svg);
};

/**
 * Carton kraft : surtout uni, avec son grain de fibres ; la crasse s'accumule vers les bords, les
 * coins s'effilochent et s'éclaircissent, un pouce a laissé une trace sur le bord libre (`freeEdge`),
 * et une vieille auréole d'eau a presque disparu.
 */
export const boardWear = (seed: number, { freeEdge = 'right' }: { freeEdge?: 'left' | 'right' } = {}): HTMLElement => {
  const random = seeded(seed);
  const s = Math.floor(random() * 1000);
  const cx = 110 + random() * (W - 220);
  const cy = 100 + random() * (H - 200);
  const thumbY = H * (0.35 + random() * 0.3);
  const corners = [[0, 0], [W, 0], [0, H], [W, H]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${22 + random() * 16}" fill="white"/>`)
    .join('');
  const svg = `<defs>${edgeMask(`bedge-${seed}`, 0.62)}
      <radialGradient id="bcorner-${seed}-g"><stop offset="0.3" stop-color="white"/><stop offset="1" stop-color="black"/></radialGradient>
      <mask id="bcorner-${seed}"><g fill="url(#bcorner-${seed}-g)">${corners.replaceAll('fill="white"', `fill="url(#bcorner-${seed}-g)"`)}</g></mask>
      <filter id="bsoft-${seed}" x="-50%" y="-50%" width="200%" height="200%">
        <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="${s + 6}"/>
        <feDisplacementMap in="SourceGraphic" scale="14"/><feGaussianBlur stdDeviation="7"/>
      </filter>
      <filter id="btide-${seed}" x="-30%" y="-30%" width="160%" height="160%">
        <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="4" seed="${s + 5}"/>
        <feDisplacementMap in="SourceGraphic" scale="22"/><feGaussianBlur stdDeviation="1.2"/>
      </filter></defs>
    ${noise(`bfib-${seed}`, { frequency: '0.8 0.2', octaves: 2, seed: s, color: [45, 30, 15], slope: 0.7, offset: -0.3 })}
    ${noise(`bfibl-${seed}`, { frequency: '0.6 0.15', octaves: 2, seed: s + 1, color: [200, 170, 125], slope: 0.6, offset: -0.3 })}
    ${noise(`btone-${seed}`, { frequency: '0.008', octaves: 3, seed: s + 2, color: [50, 32, 15], slope: 0.35, offset: -0.12 })}
    ${noise(`bgrime-${seed}`, { frequency: '0.025', octaves: 4, seed: s + 3, color: [28, 17, 8], slope: 1.6, offset: -0.3, mask: `bedge-${seed}` })}
    ${noise(`bfray-${seed}`, { frequency: '0.12', octaves: 3, seed: s + 4, color: [185, 155, 115], slope: 1.6, offset: -0.72, mask: `bcorner-${seed}` })}
    <ellipse cx="${freeEdge === 'right' ? W - 28 : 28}" cy="${thumbY}" rx="26" ry="36" fill="rgb(30,18,8)" fill-opacity="0.2" filter="url(#bsoft-${seed})"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${50 + random() * 25}" ry="${40 + random() * 20}" fill="none"
      stroke="rgb(40,25,10)" stroke-opacity="0.13" stroke-width="1.6" filter="url(#btide-${seed})"/>`;
  return layer('board-wear', svg);
};

/** Bords légèrement irréguliers (papier qui a vécu) sur les côtés libres de la page. */
export const roughEdges = (seed: number, spine: 'left' | 'right'): string => {
  const random = seeded(seed + 101);
  // Papier élimé : petites dents, et de temps en temps une vraie encoche. En pourcentages simples
  // (pas de calc) : la photo de la page (pageSnapshot.ts) relit ce contour pour découper le papier.
  const jitter = (): number => (random() < 0.12 ? 1.2 + random() * 1.6 : random() * 1);
  const pct = (value: number): string => `${value.toFixed(2)}%`;
  const points: string[] = [];
  const steps = 36;
  const along = (i: number): number => (i * 100) / steps;
  if (spine === 'left') {
    points.push('0% 0%');
    for (let i = 1; i <= steps; i++) points.push(`${pct(along(i))} ${pct(jitter())}`);
    for (let i = 1; i <= steps; i++) points.push(`${pct(100 - jitter())} ${pct(along(i))}`);
    for (let i = steps - 1; i >= 0; i--) points.push(`${pct(along(i))} ${pct(100 - jitter())}`);
  } else {
    points.push('100% 0%');
    for (let i = 1; i <= steps; i++) points.push(`${pct(100 - along(i))} ${pct(jitter())}`);
    for (let i = 1; i <= steps; i++) points.push(`${pct(jitter())} ${pct(along(i))}`);
    for (let i = steps - 1; i >= 0; i--) points.push(`${pct(100 - along(i))} ${pct(100 - jitter())}`);
  }
  return `polygon(${points.join(', ')})`;
};
