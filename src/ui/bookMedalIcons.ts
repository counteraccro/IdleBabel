/**
 * Le dessin de chaque médaillon des livres de l'en-tête, en quelques traits (repère 20 × 20, or des médaillons, violet de
 * la goutte pour l'Etherium) : maquette .ai/maquette-menu-naturel.html, piste 3.
 */
const GOLD = '#e8c776';
const VIOLET = '#c9a2ff';

const BOOK_MEDAL_ICONS: Record<string, string> = {
  // Le livre blanc : un livre ouvert.
  white: `<path d="M10 5.5Q6.5 3.8 3 4.6V15.4Q6.5 14.6 10 16.3Q13.5 14.6 17 15.4V4.6Q13.5 3.8 10 5.5Z M10 5.5V16.3" fill="none" stroke="${GOLD}" stroke-width="1.2" stroke-linejoin="round"/>`,
  // Le jeton des tâches : le dessin du Jeton (relics/relicIcons.ts).
  tasks: `<circle cx="10" cy="10" r="6.2" fill="none" stroke="${GOLD}" stroke-width="1.3"/><circle cx="10" cy="10" r="4.6" fill="none" stroke="${GOLD}" stroke-width="0.7"/><path d="M10 7L12.6 8.5V11.5L10 13L7.4 11.5V8.5Z" fill="none" stroke="${GOLD}" stroke-width="0.9" stroke-linejoin="round"/>`,
  // Le Grand Livre : un gros livre fermé, son sceau au milieu.
  strange: `<rect x="4.5" y="2.8" width="11" height="14.4" rx="1" fill="none" stroke="${GOLD}" stroke-width="1.3"/><path d="M6.3 3V17" stroke="${GOLD}" stroke-width=".8"/><circle cx="11" cy="10" r="2.6" fill="none" stroke="${GOLD}" stroke-width="1"/><circle cx="11" cy="10" r=".9" fill="${GOLD}"/>`,
  // L'Etherium : la goutte.
  etherium: `<path d="M10 2.8Q14.8 9 14.8 12.2A4.8 4.8 0 0 1 5.2 12.2Q5.2 9 10 2.8Z" fill="none" stroke="${VIOLET}" stroke-width="1.3" stroke-linejoin="round"/><path d="M8.2 12.6a2 2 0 0 0 1.8 1.9" fill="none" stroke="${VIOLET}" stroke-width=".9" stroke-linecap="round"/>`,
  // Le cahier d'options : une plume.
  options: `<path d="M14.6 3.2Q8 5 5.6 12.6L4.6 16.8M5.6 12.6Q11.5 11.6 14.6 3.2M7.4 9.8L10 9.3" fill="none" stroke="${GOLD}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>`,
  // La clé de la bibliothèque.
  library: `<circle cx="10" cy="5.6" r="2.8" fill="none" stroke="${GOLD}" stroke-width="1.3"/><path d="M10 8.4V17.2M10 13.6h2.6M10 16h2" fill="none" stroke="${GOLD}" stroke-width="1.3" stroke-linecap="round"/>`,
  // Le livre de débogage : la plaque d'obsidienne.
  debug: `<path d="M10 2.6L16.4 6.3V13.7L10 17.4L3.6 13.7V6.3Z" fill="none" stroke="${GOLD}" stroke-width="1.2" stroke-linejoin="round"/><path d="M10 6.5V13.5M6.8 8.2L13.2 11.8" stroke="${GOLD}" stroke-width=".8"/>`,
};

export const bookMedalIcon = (id: string): string => `<svg viewBox="0 0 20 20" aria-hidden="true">${BOOK_MEDAL_ICONS[id] ?? ''}</svg>`;
