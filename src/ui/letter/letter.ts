import './letter.css';
import { el, type Component } from '../dom';
import { t } from '../../i18n';
import { modalOpen } from '../modal/modal';
import { LETTERS } from '../../systems/babelText';
import { BABEL_GAP, BABEL_WORD, BOON } from '../../data/letter';
import { advanceLetter, boonSeconds, catchLetter, catchWordLetter, letterStays, type Coming } from '../../systems/letter';
import { tranceFactor } from '../../systems/etherium';
import { durationText } from './duration';
import type { GameState } from '../../core/state';

/** Le compte à rebours n'avance pas de plus d'une seconde d'un coup (onglet repris, machine en veille). */
const MAX_STEP = 1;
/** Le temps que la légende reste (voir .letter-gift). */
const GIFT_MS = 3700;
/** Grains de poussière d'or quand on l'attrape. */
const DUST = 22;
/** La légende ne descend pas plus haut que ça (en part de l'écran) : jamais sur le compteur. */
const GIFT_TOP = 0.2;
/** Elle reste à cette distance des bords de l'écran (px). */
const GIFT_MARGIN = 160;

/** Sa trajectoire (en parts de l'écran, `t` de 0 à 1) : elle monte du livre en main, lentement, en se balançant. */
const path = (t: number, seed: number) => ({
  x: 0.5 + 0.05 * Math.sin(t * 6 + seed) + 0.03 * t * Math.sign(Math.sin(seed)),
  y: 0.74 - 0.58 * t,
  turn: 18 * Math.sin(t * 4 + seed),
  scale: 1 - 0.35 * t,
});

/**
 * La lettre qui s'échappe du livre en main (maquette validée le 08/10, .ai/maquette-bonus-temporaires.html) : elle
 * vient quand le compte à rebours (systems/letter.ts) est fini, à l'écran du jeu seulement, aucune fenêtre ouverte.
 * Attrapée, elle se défait en poussière d'or et dit ce qu'elle donne ; ratée, elle s'éteint. Le mot BABEL vient lettre
 * par lettre, et s'écrit au-dessus du livre à mesure.
 */
export const createLetter = (state: GameState): Component => {
  const root = el('div', 'letter-stage');
  let last = Date.now();
  /** Une lettre à l'écran (ou le mot en cours) : le compte à rebours attend. */
  let busy = false;
  let spelled: HTMLElement | null = null;

  const glowCounter = (): void => {
    document
      .querySelector('.counter .value')
      ?.animate(
        [{ textShadow: '0 0 0 transparent' }, { textShadow: '0 0 18px rgba(232,199,118,.9)' }, { textShadow: '0 0 0 transparent' }],
        { duration: 1400 },
      );
  };

  const dust = (x: number, y: number): void => {
    for (let i = 0; i < DUST; i++) {
      const grain = el('div', 'letter-dust');
      grain.style.left = `${x}px`;
      grain.style.top = `${y}px`;
      root.append(grain);
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 50;
      grain.animate(
        [
          { transform: 'translate(0,0)', opacity: 1 },
          { transform: `translate(${Math.cos(angle) * speed}px, ${Math.sin(angle) * speed - 25}px)`, opacity: 0 },
        ],
        { duration: 900 + Math.random() * 700, easing: 'cubic-bezier(.2,.7,.3,1)' },
      ).onfinish = () => grain.remove();
    }
  };

  const gift = (x: number, y: number, name: string, what: string): void => {
    const legend = el('div', 'letter-gift');
    legend.style.left = `${Math.min(Math.max(x, GIFT_MARGIN), window.innerWidth - GIFT_MARGIN)}px`;
    legend.style.top = `${Math.max(y - 14, window.innerHeight * GIFT_TOP)}px`;
    legend.append(el('div', 'letter-gift-name', name), el('div', 'letter-gift-what', what));
    root.append(legend);
    window.setTimeout(() => legend.remove(), GIFT_MS);
  };

  /** Le mot BABEL au-dessus du livre : les lettres attrapées en or. */
  const spell = (caught: number): void => {
    if (!spelled) {
      spelled = el('div', 'letter-spelled');
      root.append(spelled);
    }
    spelled.innerHTML = BABEL_WORD.map(([letter], i) => (i < caught ? `<b>${letter}</b>` : letter)).join('');
  };
  const endWord = (): void => {
    const word = spelled;
    spelled = null;
    busy = false;
    if (!word) return;
    word.style.opacity = '0';
    window.setTimeout(() => word.remove(), 900);
  };

  /** Une lettre monte du livre ; `onCatch` reçoit le point où on l'a prise et les secondes qui lui restaient. */
  const fly = (glyph: string, word: boolean, onCatch: (x: number, y: number, left: number) => void, onMiss: () => void): void => {
    const catcher = el('div', 'letter-catch');
    const shape = el('div', `letter-glyph${word ? ' word' : ''}`, glyph);
    catcher.append(shape, el('div', 'letter-hit'));
    root.append(catcher);
    const seed = Math.random() * Math.PI * 2;
    const stays = letterStays(state);
    let elapsed = 0;
    let previous = performance.now();
    let caught = false;
    const step = (now: number): void => {
      if (caught || !catcher.isConnected) return;
      elapsed += Math.min(now - previous, 100);
      previous = now;
      const progress = elapsed / (stays * 1000);
      if (progress >= 1) {
        catcher.classList.add('gone');
        window.setTimeout(() => catcher.remove(), 1300);
        onMiss();
        return;
      }
      const p = path(progress, seed);
      catcher.style.transform = `translate(${p.x * window.innerWidth}px, ${p.y * window.innerHeight}px)`;
      shape.style.transform = `rotate(${p.turn}deg) scale(${p.scale})`;
      shape.style.opacity = String(Math.min(1, progress * 6, (1 - progress) * 6));
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    catcher.addEventListener('pointerdown', (event) => {
      if (caught) return;
      caught = true;
      event.stopPropagation();
      catcher.remove();
      dust(event.clientX, event.clientY);
      onCatch(event.clientX, event.clientY, stays - elapsed / 1000);
    });
  };

  const letter = (): void => {
    busy = true;
    fly(
      LETTERS[Math.floor(Math.random() * LETTERS.length)],
      false,
      (x, y, left) => {
        busy = false;
        const given = catchLetter(state, left);
        const seconds = boonSeconds(state, given.boon);
        const what = t(`ui.letter.boons.${given.boon}.what`)
          .replace('{x}', String(tranceFactor(state, BOON.trance)))
          .replace('{d}', seconds === undefined ? '' : durationText(seconds));
        gift(x, y, t(`ui.letter.boons.${given.boon}.name`), what);
        if (given.pages !== undefined) glowCounter();
      },
      () => {
        busy = false;
      },
    );
  };

  const word = (index = 0): void => {
    busy = true;
    spell(index);
    fly(
      BABEL_WORD[index][0],
      true,
      (x, y) => {
        catchWordLetter(state, index);
        spell(index + 1);
        glowCounter();
        const done = index === BABEL_WORD.length - 1;
        const part = t('ui.letter.word.what').replace('{n}', String(Math.round(BABEL_WORD[index][1] * 100)));
        gift(x, y, done ? t('ui.letter.word.name') : BABEL_WORD[index][0], part);
        if (done) window.setTimeout(endWord, 2500);
        else window.setTimeout(() => root.isConnected && word(index + 1), BABEL_GAP * 1000);
      },
      endWord,
    );
  };

  const come = (coming: Coming): void => (coming === 'word' ? word() : letter());

  const update = (): void => {
    const now = Date.now();
    const seconds = Math.min(MAX_STEP, (now - last) / 1000);
    last = now;
    // Seulement à l'écran du jeu, visible, sans fenêtre ouverte, et pas en train de s'en aller.
    if (busy || document.hidden || modalOpen() || !root.isConnected || root.classList.contains('screen-out')) return;
    const coming = advanceLetter(state, seconds);
    if (coming) come(coming);
  };
  return { root, update };
};
