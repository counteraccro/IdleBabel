import type { RelicId } from '../../data/relics';

/**
 * Le dessin de chaque relique en quelques traits (repère 20 × 20, or des médaillons) : son médaillon à côté du compteur,
 * son sceau au bord de l'écran. Le même dessin, agrandi, fait son sceau du Grand Livre (ui/strangeBook/sigil.ts).
 */
export const RELIC_ICONS: Record<RelicId, string> = {
  loupe:
    '<circle cx="8.2" cy="8.2" r="5.2" fill="none" stroke="#e8c776" stroke-width="1.4"/><path d="M12 12l5 5" stroke="#e8c776" stroke-width="2.2" stroke-linecap="round"/>',
  astrolabe:
    '<circle cx="10" cy="11.5" r="6.2" fill="none" stroke="#e8c776" stroke-width="1.3"/><circle cx="10" cy="11.5" r="3.4" fill="none" stroke="#e8c776" stroke-width="0.8"/><circle cx="10" cy="3.4" r="1.5" fill="none" stroke="#e8c776" stroke-width="1"/><path d="M5 14.5l10-6" stroke="#e8c776" stroke-width="1.2"/>',
  hourglass:
    '<path d="M5.5 3h9M5.5 17h9M7 3q0 4.5 3 7q3 2.5 3 7M13 3q0 4.5-3 7q-3 2.5-3 7" fill="none" stroke="#e8c776" stroke-width="1.3" stroke-linecap="round"/><path d="M8.3 15.6q1.7-2 3.4 0z" fill="#e8c776"/>',
};

export const relicIcon = (id: RelicId, className = ''): string =>
  `<svg class="${className}" viewBox="0 0 20 20" aria-hidden="true">${RELIC_ICONS[id]}</svg>`;
