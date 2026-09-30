import { el } from '../dom';

let vellumId = 0;

/** Sommets d'un hexagone (pointe en haut), centré en `cx`, `cy`, dans le repère 100 × 125 du plat. */
const hexagon = (cx: number, cy: number, r: number): string =>
  Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return `${(cx + r * Math.cos(angle)).toFixed(2)},${(cy + r * Math.sin(angle)).toFixed(2)}`;
  }).join(' ');

/**
 * Plat de vélin (SVG, repère 100 × 125) : une peau, pas un papier. Un relief de plis et de petites
 * bosses éclairé en lumière rasante, des marbrures (la peau n'est jamais d'une seule teinte), des
 * pores, les bords brunis par les mains, un double filet doré (le livre est précieux) et, sur le plat
 * de devant, un hexagone frappé à froid : un creux sombre, avec la lumière qui accroche sa lèvre du bas.
 * `ornaments` : les petits hexagones dorés des coins (sans eux pour un dos, où ils s'écraseraient).
 */
export const createVellum = (seed: number, stamped: boolean, { ornaments = true } = {}): HTMLElement => {
  const id = `vellum-${vellumId++}`;
  const root = el('span', 'cover-vellum');
  const outer = hexagon(50, 58, 17);
  const inner = hexagon(50, 58, 13.5);
  const stamp = stamped
    ? `<g fill="none" stroke-linejoin="round">
        <g stroke="rgba(255, 250, 236, 0.55)" transform="translate(0 0.45)">
          <polygon points="${outer}" stroke-width="0.9"/><polygon points="${inner}" stroke-width="0.45"/>
        </g>
        <g stroke="rgba(92, 72, 40, 0.42)">
          <polygon points="${outer}" stroke-width="0.9"/><polygon points="${inner}" stroke-width="0.45"/>
        </g>
        <polygon points="${inner}" fill="rgba(92, 72, 40, 0.05)" stroke="none"/>
      </g>`
    : '';
  // Filets dorés : un large à 5 du bord, un fin à 7,5 ; un petit hexagone doré à chaque coin.
  const corners = [
    [5, 5],
    [95, 5],
    [5, 120],
    [95, 120],
  ]
    .map(
      ([cx, cy]) =>
        `<polygon points="${hexagon(cx, cy, 2.6)}" fill="url(#${id}-gold)" stroke="rgba(70, 50, 20, 0.5)" stroke-width="0.25"/>`,
    )
    .join('');
  const gilding = `<g fill="none">
      <rect x="5" y="5" width="90" height="115" stroke="rgba(70, 50, 20, 0.45)" stroke-width="1.4" transform="translate(0.25 0.35)"/>
      <rect x="5" y="5" width="90" height="115" stroke="url(#${id}-gold)" stroke-width="1.1"/>
      <rect x="7.5" y="7.5" width="85" height="110" stroke="url(#${id}-gold)" stroke-width="0.35"/>
    </g>${ornaments ? corners : ''}`;
  root.innerHTML = `<svg viewBox="0 0 100 125" preserveAspectRatio="none" aria-hidden="true">
  <defs>
    <!-- Relief de la peau : bosses et plis éclairés en lumière rasante ; leurs ombres assombrissent la teinte. -->
    <filter id="${id}-crinkle" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.4 0.34" numOctaves="3" seed="${seed}" result="noise"/>
      <feDiffuseLighting in="noise" surfaceScale="0.7" lighting-color="#fff">
        <feDistantLight azimuth="225" elevation="46"/>
      </feDiffuseLighting>
      <!-- Une surface plate sous cette lumière ressort à environ 0,7 : on la ramène à 1, puis on garde
           seulement le manque de lumière, en ombre brune transparente (1 − éclairage). Pas de mode de
           fusion : dans le livre ouvert en perspective, le navigateur l'ignorerait. -->
      <feComponentTransfer>
        <feFuncR type="linear" slope="1.38"/><feFuncG type="linear" slope="1.38"/><feFuncB type="linear" slope="1.38"/>
      </feComponentTransfer>
      <feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0 0.12  -1 0 0 0 1"/>
    </filter>
    <filter id="${id}-folds" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.035 0.05" numOctaves="3" seed="${seed + 3}" result="noise"/>
      <feDiffuseLighting in="noise" surfaceScale="3.5" lighting-color="#fff">
        <feDistantLight azimuth="225" elevation="46"/>
      </feDiffuseLighting>
      <!-- Une surface plate sous cette lumière ressort à environ 0,7 : on la ramène à 1, puis on garde
           seulement le manque de lumière, en ombre brune transparente (1 − éclairage). Pas de mode de
           fusion : dans le livre ouvert en perspective, le navigateur l'ignorerait. -->
      <feComponentTransfer>
        <feFuncR type="linear" slope="1.38"/><feFuncG type="linear" slope="1.38"/><feFuncB type="linear" slope="1.38"/>
      </feComponentTransfer>
      <feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.22  0 0 0 0 0.12  -1 0 0 0 1"/>
    </filter>
    <!-- Marbrures : la peau n'est jamais d'une seule teinte. -->
    <filter id="${id}-clouds" x="0" y="0" width="1" height="1">
      <feTurbulence type="fractalNoise" baseFrequency="0.05 0.04" numOctaves="4" seed="${seed + 1}"/>
      <feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.37  0 0 0 0 0.19  0 0 0 1.6 -0.62"/>
    </filter>
    <!-- Pores et follicules : de petits points plus sombres, épars. -->
    <filter id="${id}-pores" x="0" y="0" width="1" height="1">
      <feTurbulence type="turbulence" baseFrequency="1.1" numOctaves="1" seed="${seed + 2}"/>
      <feColorMatrix values="0 0 0 0 0.33  0 0 0 0 0.24  0 0 0 0 0.12  0 0 0 4.5 -3.7"/>
    </filter>
    <!-- Or repoussé : clair en haut, plus sombre en bas, comme les titres dorés des autres livres. -->
    <linearGradient id="${id}-gold" x1="0" y1="0" x2="0.35" y2="1">
      <stop offset="0" stop-color="#f3dc9c"/>
      <stop offset="0.5" stop-color="#c8993f"/>
      <stop offset="1" stop-color="#8f6a26"/>
    </linearGradient>
    <!-- Teinte de la peau, sous tout le reste. -->
    <linearGradient id="${id}-skin" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e6dabb"/>
      <stop offset="1" stop-color="#d9caa4"/>
    </linearGradient>
    <radialGradient id="${id}-edges" cx="50%" cy="48%" r="72%">
      <stop offset="0.5" stop-color="rgb(112, 86, 48)" stop-opacity="0"/>
      <stop offset="1" stop-color="rgb(112, 86, 48)" stop-opacity="0.55"/>
    </radialGradient>
  </defs>
  <rect width="100" height="125" fill="url(#${id}-skin)"/>
  <rect width="100" height="125" filter="url(#${id}-clouds)"/>
  <rect width="100" height="125" filter="url(#${id}-folds)" opacity="0.45"/>
  <rect width="100" height="125" filter="url(#${id}-crinkle)" opacity="0.28"/>
  <rect width="100" height="125" filter="url(#${id}-pores)" opacity="0.6"/>
  <rect width="100" height="125" fill="url(#${id}-edges)"/>
  ${gilding}
  ${stamp}
</svg>`;
  return root;
};
