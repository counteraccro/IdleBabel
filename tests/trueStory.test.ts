import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/core/state';
import { STARS, starById } from '../src/data/etheriumStars';
import { SEALS } from '../src/data/seals';
import { ANOMALIES, HINTS_AFTER_PRESTIGE, hintSeal } from '../src/data/anomalies';
import { BRIBE_PAGES } from '../src/data/trueStory';
import { lightStar, pageOpen, starOpen, storyBribes } from '../src/systems/etherium';
import { pagesPerSecond } from '../src/systems/production';
import { libraryBookCount } from '../src/systems/library';
import fr from '../src/i18n/fr/rareBooks.json';
import en from '../src/i18n/en/rareBooks.json';

const CURTAIN = STARS.filter((star) => star.page === 'curtain');

describe('« Mon histoire vraie », la fausse fin', () => {
  it('le Rideau : neuf étoiles, de 10 à 100 000 Éther, ouvert dès le début', () => {
    expect(CURTAIN.map((star) => star.cost)).toEqual([10, 25, 60, 150, 400, 1000, 3000, 10_000, 100_000]);
    expect(pageOpen(createInitialState('fr', 0, 1), 'curtain')).toBe(true);
    expect(BRIBE_PAGES).toHaveLength(CURTAIN.length);
  });

  it('l’ourlet de droite attend toutes les autres étoiles ; une bribe par étoile allumée', () => {
    const state = createInitialState('fr', 0, 1);
    state.ether = 1e7;
    for (const star of CURTAIN.filter((one) => one.id !== 'curtain.br' && one.id !== 'curtain.bl'))
      expect(lightStar(state, star.id)).toBe(true);
    expect(storyBribes(state)).toBe(7);
    // Son étoile d'avant (le bout droit de la tringle) est allumée, mais pas l'ourlet de gauche.
    expect(starOpen(state, 'curtain.br')).toBe(false);
    expect(lightStar(state, 'curtain.bl')).toBe(true);
    expect(starOpen(state, 'curtain.br')).toBe(true);
  });

  it('le Rideau entier : la lecture double, à part ; le sceau secret « Pas celui-ci. »', () => {
    const state = createInitialState('fr', 0, 1);
    state.tools.diagonal = 10;
    state.etherium = CURTAIN.filter((star) => star.id !== 'curtain.br').map((star) => star.id);
    const before = pagesPerSecond(state);
    expect(SEALS.find((seal) => seal.id === 'notThisOne')!.reached!(state)).toBe(false);
    state.etherium.push('curtain.br');
    expect(pagesPerSecond(state)).toBeCloseTo(before * 2);
    expect(SEALS.find((seal) => seal.id === 'notThisOne')!.reached!(state)).toBe(true);
    expect(SEALS.some((seal) => seal.id === 'constellation-curtain')).toBe(false);
  });

  it('son indice existe, et ne tombe qu’après un premier prestige', () => {
    expect(ANOMALIES.some((sentence) => sentence.id === 'hintNotThisOne')).toBe(true);
    expect(hintSeal('hintNotThisOne')).toBe('notThisOne');
    expect(HINTS_AFTER_PRESTIGE).toContain('hintNotThisOne');
  });

  it('le livre entre dans la bibliothèque à la première étoile', () => {
    const state = createInitialState('fr', 0, 1);
    const count = libraryBookCount(state);
    state.etherium.push('curtain.c0');
    expect(libraryBookCount(state)).toBe(count + 1);
  });

  it('une bribe par page, dans chaque langue', () => {
    for (const texts of [fr, en]) expect(texts.trueStory.bribes).toHaveLength(BRIBE_PAGES.length);
    expect(starById('curtain.br')?.after).toBe('curtain.r');
  });
});
