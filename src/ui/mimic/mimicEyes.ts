/**
 * Les yeux de la Mimic (maquette .ai/maquette-mimic.html, yeux C « braise » choisis le 11/10) : deux globes peu bombés qui
 * sortent du cuir en s'ouvrant, les paupières taillées dans le cuir du livre, un iris de chat dont la fente se resserre.
 */

/** La texture d'un plat dans la maquette : les places des yeux et leur rayon s'y mesurent. */
export const TEX_W = 640;
export const TEX_H = 800;

/** Rayon d'un globe, en unités de la texture (le plat fait TEX_W de large). */
export const EYE_R = 72;
/** Le globe ne sort qu'un peu du cuir : hauteur de la calotte, en part du rayon. */
const BULGE = 0.38;

/** Braise : sclérotique sombre, iris de feu, lueur. */
const EMBER = { sclera: '#1a0b06', iris: ['#fff2a8', '#ff8a1e', '#6a1600'] } as const;

export type Mouth = 'fore' | 'tail';

/** Place de chaque œil sur le plat : x, y (repère de la texture) et l'axe de la bouche (degrés). La tranche : le long du
 * bord droit, centrés sur sa hauteur ; la queue : le long du bas, centrés sur la largeur. */
export const eyePlaces = (mouth: Mouth): [number, number, number][] =>
  mouth === 'fore'
    ? [
        [TEX_W * 0.78, TEX_H * 0.64, -90],
        [TEX_W * 0.78, TEX_H * 0.36, -90],
      ]
    : [
        [TEX_W * 0.3, TEX_H * 0.78, 0],
        [TEX_W * 0.7, TEX_H * 0.78, 0],
      ];

const NS = 'http://www.w3.org/2000/svg';
let uid = 0;

export interface EyeLayer {
  svg: SVGSVGElement;
  eyes: SVGGElement[];
}

export const eyeLayer = (): EyeLayer => {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('preserveAspectRatio', 'none');
  const id = `mimic-eye${uid++}`;
  svg.innerHTML = `<defs>
    <radialGradient id="${id}light" cx="0.38" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="0.85" stop-color="#000" stop-opacity="0.08"/><stop offset="1" stop-color="#000" stop-opacity="0.3"/></radialGradient>
    <radialGradient id="${id}iris" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${EMBER.iris[0]}"/><stop offset="0.55" stop-color="${EMBER.iris[1]}"/><stop offset="0.9" stop-color="${EMBER.iris[1]}"/><stop offset="1" stop-color="${EMBER.iris[2]}"/></radialGradient>
    <filter id="${id}blur" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="3"/></filter>
    <filter id="${id}glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="6"/></filter>
  </defs><g class="eyes"></g>`;
  const root = svg.querySelector('.eyes')!;
  const fibers = Array.from({ length: 28 }, (_, i) => {
    const a = (i / 28) * 2 * Math.PI;
    const r0 = 0.16 + (i % 3) * 0.04;
    return `<line x1="${(Math.cos(a) * r0).toFixed(3)}" y1="${(Math.sin(a) * r0).toFixed(3)}" x2="${(Math.cos(a) * 0.66).toFixed(3)}" y2="${(Math.sin(a) * 0.66).toFixed(3)}"/>`;
  }).join('');
  const eyes = [0, 1].map((k) => {
    const g = document.createElementNS(NS, 'g');
    g.innerHTML = `<clipPath id="${id}d${k}"><path class="dome"/></clipPath>
      <ellipse class="cast" fill="rgba(0,0,0,0.6)" filter="url(#${id}blur)"/>
      <path class="crease" fill="none" stroke="rgba(0,0,0,0.55)" stroke-linecap="round"/>
      <g class="globe" clip-path="url(#${id}d${k})">
        <path class="glow" filter="url(#${id}glow)"/>
        <path class="sclera" fill="${EMBER.sclera}"/>
        <g class="ball"><circle class="iris" r="0.7" fill="url(#${id}iris)"/><g stroke="rgba(60,30,0,0.35)" stroke-width="0.02">${fibers}</g><circle r="0.69" fill="none" stroke="rgba(30,12,0,0.55)" stroke-width="0.05"/><path class="pupil" fill="#060302"/><ellipse cx="-0.22" cy="-0.3" rx="0.1" ry="0.07" fill="#fff" opacity="0.8"/></g>
        <path class="leather" fill-rule="evenodd"/>
        <path class="lidshade" fill="none" stroke="rgba(0,0,0,0.5)" filter="url(#${id}blur)"/>
        <path class="shading" fill="url(#${id}light)"/>
        <path class="rim" fill="none" stroke="rgba(0,0,0,0.7)"/>
      </g>`;
    root.appendChild(g);
    return g;
  });
  return { svg, eyes };
};

const almond = (cx: number, cy: number, rx: number, ry: number): string =>
  `M${cx - rx} ${cy} Q${cx} ${cy - 2 * ry} ${cx + rx} ${cy} Q${cx} ${cy + 2 * ry} ${cx - rx} ${cy}Z`;

/** Un œil à l'écran : x, y, angle de la bouche, rayon, sinE (1 : vu de dessus), échelle du pli posé sur le plat. */
export type EyePlace = readonly [number, number, number, number, number, number];

/** Ce que font les yeux : ouverture (0 à 1), regard (−1 à 1), largeur de la fente. */
export interface Gaze {
  open: number;
  look: number;
  pupil: number;
}

const attr = (node: Element, values: Record<string, string | number>): void => {
  for (const [name, value] of Object.entries(values)) node.setAttribute(name, String(value));
};

/**
 * Un globe de rayon 1 posé à moitié dans le plat, vu sous l'angle e (sinE = 1 : vu de dessus) : son contour est le haut
 * d'un cercle et le bas de l'ellipse où il entre dans le cuir. Elle dort à plat, un pli dans le cuir.
 */
export const paintEyes = (layer: EyeLayer, leather: string, places: readonly EyePlace[], { open, look, pupil }: Gaze): void => {
  layer.eyes.forEach((g, k) => {
    const [x, y, a, R0, sinE, flat] = places[k];
    // Le globe sort en s'ouvrant ; elle dort à plat.
    const up = Math.min(1, open * 1.6);
    const R = R0 * Math.max(up, 0.001);
    const e = sinE;
    g.setAttribute('transform', `translate(${x} ${y}) rotate(${a})`);
    const globe = g.querySelector<SVGGElement>('.globe')!;
    const u = `scale(${R})`;
    globe.style.display = up > 0.01 ? '' : 'none';
    // Une calotte : vue de dessus, un rond ; vue en rasant, une bosse de BULGE de haut.
    const top = e + (1 - e) * BULGE;
    const dome = `M-1 0 A1 ${top} 0 0 1 1 0 A1 ${e} 0 0 1 -1 0Z`;
    attr(g.querySelector('.dome')!, { d: dome, transform: u });
    for (const sel of ['.glow', '.sclera', '.ball', '.leather', '.lidshade', '.shading', '.rim'])
      g.querySelector(sel)!.setAttribute('transform', u);
    g.querySelector('.sclera')!.setAttribute('d', dome);
    g.querySelector('.shading')!.setAttribute('d', dome);
    // Le regard : au milieu de ce qu'on voit du globe, l'iris glisse le long de la bouche.
    const mid = (-top + e) / 2;
    const h = (top + e) / 2;
    const ry = Math.max(0.001, open) * h * 0.78;
    g.querySelector('.ball')!.setAttribute('transform', `${u} translate(${look * 0.3} ${mid}) scale(${0.85 * h} ${0.85 * h})`);
    // Pupille de chat : une fente pointue, large à l'ouverture, qui se resserre à la lumière.
    g.querySelector('.pupil')!.setAttribute('d', `M0 -0.66 C${pupil} -0.3 ${pupil} 0.3 0 0.66 C${-pupil} 0.3 ${-pupil} -0.3 0 -0.66Z`);
    const glow = g.querySelector<SVGPathElement>('.glow')!;
    attr(glow, { d: almond(0, mid, 0.8, ry), fill: EMBER.iris[1] });
    glow.style.opacity = String(open);
    // Les paupières : le cuir du livre, percé d'une amande qui s'ouvre.
    attr(g.querySelector('.leather')!, { d: `${dome} ${almond(0, mid, 0.86, ry)}`, fill: leather });
    attr(g.querySelector('.lidshade')!, { d: `M-0.86 ${mid} Q0 ${mid - 2 * ry} 0.86 ${mid}`, 'stroke-width': 0.18 });
    attr(g.querySelector('.rim')!, { d: almond(0, mid, 0.86, ry), 'stroke-width': 2.2 / R });
    // L'ombre du globe sur le plat (lumière d'en haut, un peu de face).
    const cast = g.querySelector<SVGEllipseElement>('.cast')!;
    attr(cast, { cx: 0, cy: R * e * 0.25, rx: R * 1.06, ry: R * e * 0.9 + 1 });
    cast.style.opacity = String(up * 0.6);
    // Le pli dans le cuir, quand elle dort : posé sur le plat (écrasé comme lui).
    const crease = g.querySelector<SVGPathElement>('.crease')!;
    attr(crease, { d: `M${-R0 * 0.8} 0 Q0 ${R0 * flat * 0.12} ${R0 * 0.8} 0`, 'stroke-width': Math.max(0.6, R0 * 0.035) });
    crease.style.opacity = String(Math.max(0, 1 - up * 2));
  });
};
