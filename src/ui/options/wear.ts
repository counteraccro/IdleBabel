/**
 * Usure du cahier : un cahier qui a vécu dans une poche. Tout vient de bruit procédural (SVG
 * feTurbulence) plutôt que de formes dessinées, pour que les taches aient l'air vraies. L'image
 * est calculée une fois, puis posée sur les textures des pages et des plats.
 * Tirée d'une graine : chaque page garde toujours les mêmes taches.
 */
/** Aux proportions d'une page (4 × 5) : une trace de tasse reste ronde. */
export const WEAR_WIDTH = 480;
export const WEAR_HEIGHT = 600;
const W = WEAR_WIDTH;
const H = WEAR_HEIGHT;

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

/** Masque plus fort vers les bords et les coins : là où les doigts et la poche usent le cahier. */
const edgeMask = (id: string, inner: number): string => `<radialGradient id="${id}-g" cx="50%" cy="50%" r="72%">
    <stop offset="${inner}" stop-color="black"/><stop offset="1" stop-color="white"/></radialGradient>
  <mask id="${id}"><rect width="${W}" height="${H}" fill="url(#${id}-g)"/></mask>`;

/** Document SVG complet, étiré sur toute l'image. */
const toSvg = (svg: string): string =>
  `<svg xmlns='http://www.w3.org/2000/svg' width='${W}' height='${H}' viewBox='0 0 ${W} ${H}' preserveAspectRatio='none'>${svg}</svg>`;

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

/** Le papier lui-même : bords assombris et encrassés, deux zones plus jaunes (les carreaux sont dessinés à part). */
const paperBase = (seed: number): string => `<defs>
    <radialGradient id="vig-${seed}" cx="50%" cy="45%" r="72%">
      <stop offset="0.45" stop-color="rgb(120,85,40)" stop-opacity="0"/><stop offset="1" stop-color="rgb(120,85,40)" stop-opacity="0.28"/>
    </radialGradient>
    <radialGradient id="spot1-${seed}" cx="85%" cy="90%" r="45%">
      <stop offset="0" stop-color="rgb(150,105,50)" stop-opacity="0.2"/><stop offset="1" stop-color="rgb(150,105,50)" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="spot2-${seed}" cx="15%" cy="10%" r="40%">
      <stop offset="0" stop-color="rgb(160,120,60)" stop-opacity="0.14"/><stop offset="1" stop-color="rgb(160,120,60)" stop-opacity="0"/>
    </radialGradient>
    ${(['0 0 1 0', '1 0 0 0', '0 0 0 1', '0 1 0 0'] as const)
      .map((dir, i) => {
        const [x1, y1, x2, y2] = dir.split(' ');
        return `<linearGradient id="edge${i}-${seed}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
          <stop offset="0" stop-color="rgb(100,70,30)" stop-opacity="0.3"/><stop offset="0.06" stop-color="rgb(100,70,30)" stop-opacity="0"/></linearGradient>`;
      })
      .join('')}
  </defs>
  <rect width="${W}" height="${H}" fill="url(#spot1-${seed})"/>
  <rect width="${W}" height="${H}" fill="url(#spot2-${seed})"/>
  <rect width="${W}" height="${H}" fill="url(#vig-${seed})"/>
  ${[0, 1, 2, 3].map((i) => `<rect width="${W}" height="${H}" fill="url(#edge${i}-${seed})"/>`).join('')}`;

/** Papier : jaunissement inégal, fibres, rousseurs, crasse vers les bords, parfois une trace de tasse. */
export const paperWear = (seed: number, { coffee = false } = {}): string => {
  const random = seeded(seed);
  const s = Math.floor(random() * 1000);
  const svg = `${paperBase(seed)}<defs>${edgeMask(`edge-${seed}`, 0.45)}</defs>
    ${noise(`tone-${seed}`, { frequency: '0.009', octaves: 4, seed: s, color: [150, 105, 45], slope: 1.3, offset: -0.52 })}
    ${noise(`fiber-${seed}`, { frequency: '0.7 0.06', octaves: 2, seed: s + 1, color: [120, 95, 60], slope: 0.9, offset: -0.42 })}
    ${noise(`grime-${seed}`, { frequency: '0.035', octaves: 4, seed: s + 2, color: [85, 60, 30], slope: 1.6, offset: -0.45, mask: `edge-${seed}` })}
    ${noise(`fox-${seed}`, { frequency: '0.13', octaves: 2, seed: s + 3, color: [135, 85, 35], slope: 9, offset: -7.3, blur: 0.4 })}
    ${noise(`smear-${seed}`, { frequency: '0.004 0.02', octaves: 3, seed: s + 4, color: [70, 65, 60], slope: 1.2, offset: -0.62 })}
    ${coffee ? coffeeRing(random, s) : ''}`;
  return toSvg(svg);
};

/**
 * Carton du plat : surtout uni, avec son grain de fibres ; la crasse s'accumule vers les bords, les
 * coins s'effilochent et s'éclaircissent, un pouce a laissé une trace sur le bord libre (`freeEdge`),
 * et une vieille auréole d'eau a presque disparu.
 */
export const boardWear = (seed: number, { freeEdge = 'right' }: { freeEdge?: 'left' | 'right' } = {}): string => {
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
  return toSvg(svg);
};
