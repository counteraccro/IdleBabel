import './sealVision.css';
import { el } from './dom';
import { t } from '../i18n';
import { SEALS, sealSeries } from '../data/seals';
import { onSealed } from '../systems/seals';
import { isDeciphered } from '../systems/decipher';
import { strangeBookFound } from '../systems/strangeBook';
import { sealSvg, sigil } from './strangeBook/sigil';
import { plateTitle, sealLegend } from './strangeBook/plates';
import { sealPage } from './strangeBook/pages';
import { openStrangeBookAt } from './strangeBook/openAt';
import type { GameState } from '../core/state';

const STRANGE_BOOK_HASH = '#livre';
/**
 * Les premières visions cliquables le disent (les tout premiers sceaux tombent avant le Grand Livre, et ne se cliquent
 * pas) : trois fois, ou jusqu'au premier clic.
 */
const VISION_HINTS = 3;

/**
 * Un sceau vient d'être apposé : il apparaît dans l'obscurité, à droite de l'écran — d'abord en relief, puis doré —
 * et sa légende s'écrit dessous, sous le nom de sa planche (maquette validée le 08/10, piste B,
 * .ai/maquette-annonce-sceaux.html) : en symboles de Babel tant que les sceaux ne sont pas déchiffrés, avec une ligne
 * qui le dit. La vision reste tant qu'on la survole ; cliquée, elle ouvre le Grand Livre sur la planche du sceau.
 * Plusieurs sceaux d'un coup (retour d'absence, gros palier) : le plus avancé, le nombre des autres, et le clic mène
 * à l'introduction des sceaux.
 */
export const mountSealVisions = (state: GameState): void => {
  const stage = el('div', 'seal-visions');
  document.body.append(stage);
  let count = 0;

  onSealed((ids) => {
    const seal = SEALS.find((candidate) => candidate.id === ids[ids.length - 1]);
    if (!seal) return;
    const shapes = sigil(sealSeries(seal), seal.tier?.index ?? 0);
    const uid = `vision-${count++}`;
    const vision = el('div', 'seal-vision');
    const mark = el('div', 'seal-vision-mark');
    mark.innerHTML = `<div class="seal-vision-relief">${sealSvg(shapes, 'embossed', uid)}</div><div class="seal-vision-gold">${sealSvg(shapes, 'gold', uid)}</div>`;
    const readable = isDeciphered(state, 'seals');
    const text = el('div', 'seal-vision-text');
    const legend = el('div', `seal-vision-legend${readable ? '' : ' babel'}`, sealLegend(state, seal.id).name);
    text.append(el('div', 'seal-vision-plate', plateTitle(state, seal.plate)), legend);
    if (!readable) text.append(el('div', 'seal-vision-note', t('strangeBook.sealVision.unread')));
    const others = ids.length - 1;
    if (others > 0)
      text.append(
        el('div', 'seal-vision-note', t(`strangeBook.sealVision.${others === 1 ? 'moreOne' : 'more'}`).replace('{n}', String(others))),
      );
    vision.append(mark, text);
    // Cliquable une fois le Grand Livre en main, et s'il n'est pas déjà ouvert (le sceau y luit déjà).
    if (strangeBookFound(state) && window.location.hash !== STRANGE_BOOK_HASH) {
      vision.classList.add('clickable');
      if (state.visionHints < VISION_HINTS) {
        state.visionHints += 1;
        text.append(el('div', 'seal-vision-note touch', t(`strangeBook.sealVision.${others > 0 ? 'touchMany' : 'touch'}`)));
      }
      vision.addEventListener('click', () => {
        state.visionHints = VISION_HINTS;
        vision.remove();
        // Le Grand Livre ouvert entre-temps (une vision encore à l'écran) : rien à rouvrir.
        if (window.location.hash === STRANGE_BOOK_HASH) return;
        const focus = others > 0 ? undefined : seal.id;
        openStrangeBookAt({ page: sealPage(state, focus ?? null), seal: focus });
        window.location.hash = STRANGE_BOOK_HASH;
      });
    } else vision.setAttribute('aria-hidden', 'true');
    // La vision s'en va à la fin de son animation (en pause tant qu'on la survole).
    vision.addEventListener('animationend', (event) => {
      if (event.target === vision) vision.remove();
    });
    stage.append(vision);
  });
};
