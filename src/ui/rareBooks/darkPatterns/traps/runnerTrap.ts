import { el } from '../../../dom';
import { button, dialog, traps, type Trap } from './trapStage';

/** Le pointeur à moins de cette distance du bouton : il s'écarte. */
const NEAR = 110;
/** Il se fatigue après tant de fuites ou tant de temps (il ralentit), puis s'arrête. */
const SLOW_DODGES = 14;
const SLOW_MS = 9000;
const STOP_DODGES = 20;
const STOP_MS = 12000;

/**
 * Le bouton timide : « Page suivante » s'écarte de la souris (ou du doigt), puis s'essouffle et se laisse
 * attraper. La grande porte : « Rester sur cette page (recommandé) ».
 */
export const runnerTrap: Trap = ({ layer, show, done, signal }) => {
  const text = traps().runner;
  const box = dialog(
    text.title,
    text.text,
    button('link', text.stay, () => done(false, text.stayed)),
  );
  box.classList.add('dp-high');
  const runner = button('big', text.next, () => {
    if (tired) done(true, text.caught);
  });
  runner.classList.add('dp-runner');
  show(box, runner);
  let dodges = 0;
  let started = 0;
  let tired = false;
  const place = (x: number, y: number): void => {
    runner.style.left = `${x}px`;
    runner.style.top = `${y}px`;
  };
  place(layer.clientWidth / 2 - 80, layer.clientHeight * 0.55);

  const flee = (pointerX: number, pointerY: number): void => {
    if (tired) return;
    const now = performance.now();
    started ||= now;
    dodges++;
    if (dodges > SLOW_DODGES || now - started > SLOW_MS) {
      runner.classList.add('dp-tired');
      runner.replaceChildren(text.next, el('span', 'dp-sweat', '💦'));
      if (dodges > STOP_DODGES || now - started > STOP_MS) {
        tired = true;
        runner.replaceChildren(text.tired);
        return;
      }
    }
    const own = runner.getBoundingClientRect();
    const frame = layer.getBoundingClientRect();
    const [centerX, centerY] = [own.left + own.width / 2, own.top + own.height / 2];
    const distance = Math.hypot(centerX - pointerX, centerY - pointerY) || 1;
    const jump = runner.classList.contains('dp-tired') ? 70 : 220;
    let x = centerX + ((centerX - pointerX) / distance) * jump + (Math.random() - 0.5) * 120 - frame.left - own.width / 2;
    let y = centerY + ((centerY - pointerY) / distance) * jump + (Math.random() - 0.5) * 120 - frame.top - own.height / 2;
    // Coincé contre un bord : il repart vers le milieu.
    if (x < 10 || x > frame.width - own.width - 10) x = frame.width / 2 - own.width / 2 + (Math.random() - 0.5) * frame.width * 0.6;
    if (y < 10 || y > frame.height - own.height - 10) y = frame.height / 2 + (Math.random() - 0.5) * frame.height * 0.6;
    place(Math.min(Math.max(10, x), frame.width - own.width - 10), Math.min(Math.max(10, y), frame.height - own.height - 10));
  };

  layer.addEventListener(
    'pointermove',
    (event) => {
      const own = runner.getBoundingClientRect();
      if (Math.hypot(event.clientX - (own.left + own.width / 2), event.clientY - (own.top + own.height / 2)) < NEAR)
        flee(event.clientX, event.clientY);
    },
    { signal },
  );
  // Au doigt, pas de survol : il s'écarte au moment où on le touche.
  runner.addEventListener(
    'pointerdown',
    (event) => {
      if (tired) return;
      event.preventDefault();
      flee(event.clientX, event.clientY);
    },
    { signal },
  );
};
