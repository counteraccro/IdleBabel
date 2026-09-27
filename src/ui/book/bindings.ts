/** Reliures de cuir : chaque livre pris sur les étagères a la sienne. */
export interface Binding {
  /** Bords de la couverture. */
  dark: string;
  /** Plats de la couverture. */
  leather: string;
  /** Creux du dos. */
  deep: string;
}

const BINDINGS: readonly Binding[] = [
  { dark: '#2a140c', leather: '#4a2414', deep: '#1c0d07' }, // brun
  { dark: '#2b0c0f', leather: '#561a1f', deep: '#1a0609' }, // bordeaux
  { dark: '#0f1f16', leather: '#1f3d2a', deep: '#08120c' }, // vert bouteille
  { dark: '#10162a', leather: '#22304f', deep: '#080c18' }, // bleu nuit
  { dark: '#33230d', leather: '#6b4a1c', deep: '#1f1507' }, // fauve
  { dark: '#161412', leather: '#2c2824', deep: '#0b0a09' }, // noir
  { dark: '#2a1a24', leather: '#4d2f42', deep: '#170d14' }, // prune
];

/** Livres modernes : toile unie de couleur vive. */
const MODERN_BINDINGS: readonly Binding[] = [
  { dark: '#a8431c', leather: '#d0582a', deep: '#7a2e12' }, // orange
  { dark: '#135a5c', leather: '#1c7c7e', deep: '#0c3d3e' }, // canard
  { dark: '#7e1d2a', leather: '#a8283a', deep: '#57131d' }, // cramoisi
  { dark: '#1f3f86', leather: '#2c55ad', deep: '#142a5c' }, // cobalt
];

/** Le livre étrange : un cuir presque noir, aux reflets bleutés. */
export const STRANGE_BINDING: Binding = { dark: '#0b0d12', leather: '#1b2029', deep: '#050608' };

export const modernBindingFor = (index: number): Binding => MODERN_BINDINGS[index % MODERN_BINDINGS.length];

/** Reliure du n-ième livre : deux livres qui se suivent n'ont jamais la même. */
export const bindingFor = (index: number): Binding => BINDINGS[index % BINDINGS.length];

export const applyBinding = (element: HTMLElement, binding: Binding): void => {
  element.style.setProperty('--leather-dark', binding.dark);
  element.style.setProperty('--leather', binding.leather);
  element.style.setProperty('--leather-deep', binding.deep);
};
