import { PARTS, RANKS, SETS } from '../../data/curiosities';
import { S } from '../../data/etheriumStars';
import { arriveCuriosity, atelierOpen } from '../../systems/curiosities';
import { pressCount } from '../../systems/curiosityPresses';
import { pulpPercent } from '../../systems/curiosityPulp';
import { lecternBooks } from '../../systems/curiosityEffects';
import { chips } from '../debugControls';
import type { DebugSubject } from './subject';

/**
 * L'atelier des curiosités (systems/curiosities.ts), pour sa première version en mode débogage seulement (l'auteur, 27/10) :
 * l'ouvrir sans Éther, faire arriver des curiosités, remplir les tiroirs et le carnet, finir les presses.
 */
export const ATELIER_SUBJECT: DebugSubject = {
  id: 'resources:atelier',
  chapter: 'resources',
  name: 'L’atelier',
  description: 'Les curiosités : en faire arriver, remplir les tiroirs, le carnet, les pages de réemploi ; finir les presses.',
  peek: (state) => `${state.atelier.books.length} curiosité(s) · ${state.atelier.reserve} pages`,
  build: (kit, state) => {
    const atelier = state.atelier;
    kit.check(
      'Ouvert (le Sud)',
      'Le Sud de la Rose des vents allumé, sans payer.',
      () => state.etherium.includes(S.atelier),
      (on) => {
        state.etherium = on ? [...state.etherium, S.atelier] : state.etherium.filter((id) => id !== S.atelier);
      },
    );
    kit.row(
      'Une curiosité arrive',
      chips([
        ['au hasard', () => void arriveCuriosity(state, Math.random)],
        ['avec une pièce S', () => void arriveCuriosity(state, Math.random, true)],
        ['cinq', () => Array.from({ length: 5 }, () => arriveCuriosity(state, Math.random))],
      ]),
      'Comme en lisant (la règle du rebut, le chariot plein).',
    );
    kit.number(
      'Pages de réemploi',
      () => atelier.reserve,
      (value) => (atelier.reserve = value),
      { steps: true },
    );
    kit.row(
      'Tiroirs',
      chips([
        ['+5 de chaque', () => PARTS.forEach((part) => atelier.drawers[part].forEach((_, s) => (atelier.drawers[part][s] += 5)))],
        ['vides', () => PARTS.forEach((part) => (atelier.drawers[part] = [0, 0, 0, 0]))],
      ]),
    );
    kit.row(
      'Carnet',
      chips([
        [
          'un set complet',
          () => {
            const set = Math.floor(Math.random() * SETS.length);
            for (const part of PARTS)
              atelier.notebook[set][part] = { state: 1, hue: SETS[set].hue, seed: Math.floor(Math.random() * 1e9), set };
          },
        ],
        ['vide', () => (atelier.notebook = SETS.map(() => ({})))],
      ]),
    );
    kit.number(
      'Pilon (points)',
      () => atelier.pulp,
      (value) => (atelier.pulp = value),
      { steps: true },
    );
    kit.info('Ouvert', () => (atelierOpen(state) ? 'oui' : 'non'));
    kit.info(
      'Chariot',
      () =>
        atelier.books.map((book) => `${RANKS[book.rank]}${book.where === 'lectern' ? '·L' : book.where === 'top' ? '·S' : ''}`).join(' ') ||
        '—',
    );
    kit.info('Au lutrin', () => String(lecternBooks(state).length));
    kit.info('Presses', () => `${atelier.jobs.length} / ${pressCount(state)}`);
    kit.info('Pilon', () => `+${pulpPercent(state)} %`);
    kit.info(
      'Prochaine arrivée',
      () => `${Math.round(atelier.sinceArrival / 60)} min de jeu${atelier.waitBook >= 0 ? ', attend un livre lu' : ''}`,
    );
    kit.actions(['Finir les presses', () => atelier.jobs.forEach((job) => (job.end = Date.now()))]);
  },
};
