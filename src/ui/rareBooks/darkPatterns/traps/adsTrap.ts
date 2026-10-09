import './adsTrap.css';
import { el } from '../../../dom';
import { button, site, traps, type Trap } from './trapStage';

/** Les rangées où se posent les trois gros boutons (en part de la hauteur de la page). */
const ROWS = [0.32, 0.46, 0.6, 0.74];
const COLORS = ['#32d17a', '#ff8a3c', '#3a5cf0'];

/**
 * La publicité déguisée : trois gros boutons « Télécharger » qui sont des annonces ; chacun ouvre une fausse pub
 * dont la croix ramène au site, où les boutons ont changé de place. La grande porte : « Réclamer mon prix ».
 * La vraie sortie : « le vrai lien », minuscule, en bas.
 */
export const adsTrap: Trap = ({ layer, show, done }) => {
  const text = traps().ads;
  const page = site(text.site, text.text, 4);
  const real = button('link', text.realLink, () => done(true, text.free));
  real.classList.add('dp-real');
  let shown = 0;
  const popup = (): void => {
    const [title, body] = text.popups[shown++ % text.popups.length];
    const ad = el('div', 'dp-ad');
    const cross = button('link', '×', () => {
      ad.remove();
      shuffle();
    });
    cross.className = 'dp-close';
    ad.append(
      cross,
      el('h3', undefined, title),
      el('p', undefined, body),
      button('hot', text.claim, () => done(false, text.claimed)),
    );
    layer.append(ad);
  };
  const big = text.buttons.map((label, index) => {
    const node = button('big', label, popup);
    node.classList.add('dp-download');
    node.style.background = COLORS[index];
    node.append(el('small', undefined, text.ad));
    return node;
  });
  // Trois des quatre rangées, un peu à gauche ou à droite : ils changent de place à chaque retour sur le site.
  const shuffle = (): void => {
    const rows = [...ROWS].sort(() => Math.random() - 0.5);
    big.forEach((node, index) => {
      node.style.left = `calc(${(0.38 + Math.random() * 0.24) * 100}% - ${node.offsetWidth / 2}px)`;
      node.style.top = `${rows[index] * 100}%`;
    });
  };
  page.append(...big, real);
  show(page);
  shuffle();
};
