import { el } from '../dom';
import { t } from '../../i18n';
import { LETTERS } from '../../systems/babelText';
import { setNumberText } from '../babelDigits';

/**
 * La Mimic quand aucune place de la salle n'est visible (écran en portrait) : un sceau de méthode au bord droit, à la
 * hauteur de la ruche, bord rouge sombre, l'icône d'un petit livre qui dort (maquette .ai/maquette-mimic-cote.html,
 * piste A choisie le 11/10). Sous l'icône, ce qu'elle a avalé (avec l'œil de l'Etherium) ; mêmes deux clics.
 */

let uid = 0;

/** L'icône : un petit livre fermé, de trois quarts, qui dort ; la mâchoire (le plat) pivote sur le dos. */
const sigil = (): string => {
  const id = `mimic-gold${uid++}`;
  return `<svg class="method-sigil" viewBox="12 12 76 76" aria-hidden="true"><defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100" y2="100"><stop offset="0" stop-color="#f7e2a6"/><stop offset=".5" stop-color="#d9a94e"/><stop offset="1" stop-color="#a8762c"/></linearGradient></defs><g fill="none" stroke="url(#${id})" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M26 52 L26 60 Q26 63 29 63 L70 63 L70 55"/>
    <path d="M30 56 L68 56 M30 59.5 L68 59.5" stroke-width="1.4"/>
    <path class="teeth" d="M31 53 l3 -4 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4 l3 4 l3 -4 l3 4" stroke-width="2"/>
    <g class="jaw">
      <path d="M26 52 L32 32 L76 32 L70 52 Z"/>
      <path d="M26 52 Q22 50 25 44 L30 33" stroke-width="3.6"/>
      <g class="eye-shut"><path d="M38 42 q4 4 8 0"/><path d="M52 42 q4 4 8 0"/></g>
      <g class="eye-open"><path d="M37 42 q5 -5 10 0 q-5 5 -10 0 Z"/><path d="M51 42 q5 -5 10 0 q-5 5 -10 0 Z"/><path d="M42 39.5 v5 M56 39.5 v5" stroke-width="2.4"/></g>
    </g>
  </g></svg>`;
};

export interface MimicSide {
  root: HTMLElement;
  /** Ce qu'elle a avalé (null : sans l'œil, on ne le voit pas), « z z z » (le Sommeil léger). */
  show: (options: { count: string | null; eaten: string | null; snore: boolean }) => void;
  bite: () => void;
  /** Elle disparaît : les lettres de Babel s'échappent du sceau, et ce qu'elle rend (`text`). */
  vanish: (text: string) => void;
  destroy: () => void;
}

/** `golden` : la Mimic dorée de la Loterie (le même sceau, en or). */
export const createMimicSide = (onClick: () => void, golden = false): MimicSide => {
  const root = el('div', golden ? 'mimic-side golden' : 'mimic-side');
  const seal = el('button', 'method-seal mimic');
  seal.type = 'button';
  const name = t(golden ? 'ui.lottery.golden.name' : 'ui.mimic.name');
  seal.setAttribute('aria-label', name);
  seal.innerHTML = `<span class="method-rim"></span><span class="method-core"></span>${sigil()}`;
  const count = el('span', 'method-count');
  seal.append(count);
  const snores = el('div', 'mimic-side-zzz');
  snores.innerHTML = '<span>z</span><span>z</span><span>z</span>';
  const tip = el('div', 'mimic-tip');
  const tipName = el('strong', undefined, name);
  const tipLine = el('em', undefined, t(golden ? 'ui.lottery.golden.line' : 'whiteBook.intuitions.lightSleep.description'));
  const tipEaten = el('div');
  tip.append(tipName, tipLine, tipEaten);
  root.append(seal, snores, tip);
  seal.addEventListener('click', (event) => {
    event.stopPropagation();
    onClick();
  });

  // Elle ouvre les yeux de temps en temps.
  let gone = false;
  let timer = 0;
  const blink = (): void => {
    if (!gone && !seal.classList.contains('bite')) {
      seal.classList.add('awake');
      window.setTimeout(() => !seal.classList.contains('bit') && seal.classList.remove('awake'), 1800);
    }
    timer = window.setTimeout(blink, 6000 + Math.random() * 8000);
  };
  timer = window.setTimeout(blink, 2000 + Math.random() * 4000);

  return {
    root,
    show: ({ count: shown, eaten, snore }) => {
      setNumberText(count, shown ?? '', 10);
      const line = eaten ? t('ui.mimic.eaten').replace('{n}', eaten) : '';
      if (tipEaten.textContent !== line) tipEaten.innerHTML = eaten ? t('ui.mimic.eaten').replace('{n}', `<span>${eaten}</span>`) : '';
      root.classList.toggle('snoring', snore);
    },
    bite: () => {
      seal.classList.add('awake', 'bit');
      seal.classList.remove('bite');
      void seal.offsetWidth;
      seal.classList.add('bite');
      seal.addEventListener('animationend', () => seal.classList.remove('bite'), { once: true });
    },
    vanish: (text) => {
      gone = true;
      seal.classList.add('gone');
      const size = seal.offsetWidth;
      for (let i = 0; i < 14; i++) {
        const letter = el('span', 'mimic-spill', LETTERS[i % LETTERS.length]);
        letter.style.left = `${size / 2}px`;
        letter.style.top = `${size * 0.55}px`;
        root.append(letter);
        const a = Math.random() * Math.PI * 2;
        const d = size * (0.6 + Math.random() * 0.9);
        letter.animate(
          [
            { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
            { opacity: 1, offset: 0.15 },
            { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d}px)) scale(1.1)`, opacity: 0 },
          ],
          { duration: 1300 + Math.random() * 500, delay: i * 30, fill: 'both' },
        ).onfinish = () => letter.remove();
      }
      const gain = el('div', 'mimic-gain mimic-side-gain', text);
      gain.style.top = `${size * 0.4}px`;
      root.append(gain);
      gain.animate(
        [
          { transform: 'translateY(0)', opacity: 0 },
          { opacity: 1, offset: 0.15 },
          { transform: 'translateY(-50px)', opacity: 0 },
        ],
        { duration: 2600, fill: 'both' },
      ).onfinish = () => gain.remove();
    },
    destroy: () => {
      window.clearTimeout(timer);
      root.remove();
    },
  };
};
