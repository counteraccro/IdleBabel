import { messages } from '../../../i18n';
import { GREEN, GROTESK, ORANGE, PINK, SANS, random, roundRect, text } from './darkPatternsDraw';
import { INK, SOFT, paragraph } from './darkPatternsText';

/**
 * Les exemples des « Dark patterns par l'exemple » : une page web dessinée dans une fenêtre de navigateur, une par
 * chapitre (maquette .ai/maquette-dark-patterns-pages.html). Les cinq premières sont des pièges, qui prennent vie
 * dans la bibliothèque (traps/) ; ici, ce ne sont que des dessins.
 */

const BLUE = '#3a5cf0';
const RED = '#e8392c';
const FAINT = '#b9b5c0';

interface Area {
  x: number;
  y: number;
  w: number;
  h: number;
}

const examples = () => messages().rareBooks.darkPatterns.pages.examples;

/** Une fenêtre de navigateur ; renvoie la zone de la page. */
const browser = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, url: string): Area => {
  context.save();
  context.shadowColor = 'rgba(30,20,50,0.25)';
  context.shadowBlur = 24;
  context.shadowOffsetY = 8;
  roundRect(context, x, y, width, height, 14);
  context.fillStyle = '#e3e4ea';
  context.fill();
  context.restore();
  ['#ff5f57', '#febc2e', '#28c840'].forEach((color, index) => {
    context.beginPath();
    context.arc(x + 20 + index * 18, y + 20, 6, 0, Math.PI * 2);
    context.fillStyle = color;
    context.fill();
  });
  roundRect(context, x + 80, y + 9, width - 96, 22, 11);
  context.fillStyle = '#ffffff';
  context.fill();
  text(context, url, x + 94, y + 25, `400 12px ${SANS}`, SOFT, 'left');
  context.save();
  roundRect(context, x, y + 40, width, height - 40, [0, 0, 14, 14]);
  context.clip();
  context.fillStyle = '#f7f7fa';
  context.fillRect(x, y + 40, width, height - 40);
  context.restore();
  return { x, y: y + 40, w: width, h: height - 40 };
};

/** Du faux texte en barres grises. */
const bars = (context: CanvasRenderingContext2D, x: number, y: number, width: number, count: number, seed: number): void => {
  const next = random(seed);
  context.fillStyle = '#d9dae2';
  for (let bar = 0; bar < count; bar++) {
    roundRect(context, x, y + bar * 18, width * (bar % 5 === 4 ? 0.5 : 0.75 + next() * 0.25), 8, 4);
    context.fill();
  }
};

const button = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  fill: string,
  size = 16,
): void => {
  roundRect(context, x, y, width, height, height / 2);
  context.fillStyle = fill;
  context.fill();
  text(context, label, x + width / 2, y + height / 2 + size * 0.36, `700 ${size}px ${SANS}`, '#ffffff');
};

/** Le voile sombre d'une fenêtre par-dessus la page. */
const veil = (context: CanvasRenderingContext2D, area: Area): void => {
  context.save();
  roundRect(context, area.x, area.y, area.w, area.h, [0, 0, 14, 14]);
  context.clip();
  context.fillStyle = 'rgba(16,17,24,0.4)';
  context.fillRect(area.x, area.y, area.w, area.h);
  context.restore();
};

const card = (context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void => {
  context.save();
  context.shadowColor = 'rgba(0,0,0,0.25)';
  context.shadowBlur = 20;
  context.shadowOffsetY = 6;
  roundRect(context, x, y, width, height, 14);
  context.fillStyle = '#ffffff';
  context.fill();
  context.restore();
};

/** Une case cochée, bleue. */
const ticked = (context: CanvasRenderingContext2D, x: number, y: number, size: number): void => {
  context.fillStyle = BLUE;
  context.fillRect(x, y, size, size);
  text(context, '✓', x + size / 2, y + size * 0.78, `700 ${size * 0.75}px ${SANS}`, '#ffffff');
};

const EXAMPLES: ((context: CanvasRenderingContext2D, area: Area) => void)[] = [
  // Le mur de cookies.
  (context, a) => {
    const t = examples();
    text(context, t.chapterOne, a.x + 24, a.y + 44, `800 24px ${SANS}`, INK, 'left');
    bars(context, a.x + 24, a.y + 66, a.w - 48, 12, 1);
    context.fillStyle = '#16171d';
    context.fillRect(a.x, a.y + a.h - 150, a.w, 150);
    paragraph(context, t.cookies, a.x + 20, a.y + a.h - 116, a.w - 40, `400 14px ${SANS}`, 20, '#ffffff');
    button(context, a.x + a.w - 200, a.y + a.h - 70, 180, 44, t.acceptAll, BLUE);
    text(context, t.settings, a.x + 20, a.y + a.h - 42, `400 11px ${SANS}`, '#7d808c', 'left');
  },
  // Le bouton qui fuit.
  (context, a) => {
    const t = examples();
    bars(context, a.x + 24, a.y + 30, a.w - 48, 14, 2);
    veil(context, a);
    card(context, a.x + 30, a.y + 110, a.w - 60, 190);
    text(context, t.leaving, a.x + a.w / 2, a.y + 160, `800 22px ${SANS}`, INK);
    text(context, t.behind, a.x + a.w / 2, a.y + 190, `400 13px ${SANS}`, SOFT);
    button(context, a.x + a.w - 190, a.y + 320, 150, 40, t.nextPage, BLUE, 14);
    // Les traits du mouvement : il vient de s'écarter.
    context.strokeStyle = BLUE;
    context.lineWidth = 3;
    context.lineCap = 'round';
    for (const dy of [-10, 0, 10]) {
      context.beginPath();
      context.moveTo(a.x + a.w - 230, a.y + 340 + dy);
      context.lineTo(a.x + a.w - 205 + Math.abs(dy), a.y + 340 + dy);
      context.stroke();
    }
  },
  // L'urgence.
  (context, a) => {
    const t = examples();
    bars(context, a.x + 24, a.y + 30, a.w - 48, 14, 3);
    veil(context, a);
    card(context, a.x + 30, a.y + 50, a.w - 60, 330);
    text(context, t.offer, a.x + a.w / 2, a.y + 96, `800 18px ${SANS}`, INK);
    roundRect(context, a.x + a.w / 2 - 110, a.y + 114, 220, 30, 6);
    context.fillStyle = '#fff1f0';
    context.fill();
    text(context, t.stock, a.x + a.w / 2, a.y + 135, `700 14px ${SANS}`, RED);
    text(context, '00:09', a.x + a.w / 2, a.y + 206, `700 52px ${GROTESK}`, RED);
    button(context, a.x + 60, a.y + 240, a.w - 120, 46, t.wantMore, PINK);
    text(context, t.ignorant, a.x + a.w / 2, a.y + 320, `400 10px ${SANS}`, FAINT);
  },
  // Le désabonnement : des confirmations en cascade.
  (context, a) => {
    const t = examples();
    bars(context, a.x + 24, a.y + 30, a.w - 48, 14, 4);
    veil(context, a);
    t.sure.forEach((label, index) => {
      const x = a.x + 34 + index * 26;
      const y = a.y + 50 + index * 70;
      card(context, x, y, a.w - 120, 150);
      text(context, label, x + 24, y + 46, `800 19px ${SANS}`, INK, 'left');
      bars(context, x + 24, y + 66, a.w - 180, 2, 10 + index);
      button(context, x + 24, y + 102, 120, 32, t.stay, BLUE, 13);
      text(context, t.yes, x + 170, y + 123, `400 11px ${SANS}`, FAINT, 'left');
    });
  },
  // L'offre premium.
  (context, a) => {
    const t = examples();
    text(context, t.choose, a.x + a.w / 2, a.y + 44, `800 20px ${SANS}`, INK);
    const prices = ['41', '410', '4 100'];
    const width = (a.w - 60) / 3;
    t.plans.forEach((name, index) => {
      const best = index === 1;
      const x = a.x + 15 + index * (width + 15);
      const y = a.y + (best ? 66 : 80);
      const height = best ? 250 : 222;
      card(context, x, y, width, height);
      if (best) {
        context.strokeStyle = PINK;
        context.lineWidth = 3;
        roundRect(context, x, y, width, height, 14);
        context.stroke();
        button(context, x + 10, y - 12, width - 20, 22, t.best, PINK, 9);
      }
      text(context, name, x + width / 2, y + 40, `700 13px ${SANS}`, INK);
      text(context, prices[index], x + width / 2, y + 90, `700 30px ${GROTESK}`, INK);
      text(context, t.perMonth, x + width / 2, y + 110, `400 10px ${SANS}`, SOFT);
      bars(context, x + 14, y + 130, width - 28, 3, 20 + index);
      button(context, x + 10, y + height - 46, width - 20, 32, t.trial, best ? PINK : BLUE, 11);
    });
    text(context, t.limited, a.x + a.w / 2, a.y + a.h - 24, `400 9px ${SANS}`, '#e4e3ec');
  },
  // Le panier : trois articles glissés, cochés d'avance, en petit.
  (context, a) => {
    const t = examples();
    text(context, t.cart, a.x + 24, a.y + 44, `800 22px ${SANS}`, INK, 'left');
    t.cartRows.forEach(([name, price], index) => {
      const sneaky = index > 0;
      const y = a.y + 90 + index * 52;
      context.fillStyle = '#ffffff';
      context.fillRect(a.x + 20, y - 26, a.w - 40, 44);
      if (sneaky) ticked(context, a.x + 30, y - 12, 14);
      text(context, name, a.x + (sneaky ? 54 : 30), y, `${sneaky ? 400 : 600} ${sneaky ? 11 : 15}px ${SANS}`, sneaky ? SOFT : INK, 'left');
      text(context, price, a.x + a.w - 30, y, `600 14px ${SANS}`, INK, 'right');
    });
    context.fillStyle = '#e4e1ea';
    context.fillRect(a.x + 20, a.y + 300, a.w - 40, 1);
    text(context, t.total, a.x + 30, a.y + 336, `800 18px ${SANS}`, INK, 'left');
    text(context, t.totalPrice, a.x + a.w - 30, a.y + 336, `800 18px ${SANS}`, INK, 'right');
    button(context, a.x + 40, a.y + 370, a.w - 80, 46, t.pay, GREEN);
  },
  // La publicité déguisée : trois grands boutons, et le vrai lien en tout petit.
  (context, a) => {
    const t = examples();
    text(context, t.site, a.x + 24, a.y + 44, `800 20px ${SANS}`, INK, 'left');
    bars(context, a.x + 24, a.y + 62, a.w - 48, 4, 5);
    button(context, a.x + 40, a.y + 150, a.w - 80, 54, t.download, GREEN, 20);
    button(context, a.x + 70, a.y + 230, a.w - 140, 46, t.downloadNow, ORANGE, 16);
    button(context, a.x + 40, a.y + 300, a.w - 80, 54, t.start, BLUE, 20);
    text(context, t.ad, a.x + a.w - 44, a.y + 140, `400 8px ${SANS}`, FAINT, 'right');
    text(context, t.realLink, a.x + 40, a.y + 390, `400 9px ${SANS}`, BLUE, 'left');
  },
  // La foule inventée.
  (context, a) => {
    const t = examples();
    text(context, t.page410, a.x + 24, a.y + 44, `800 22px ${SANS}`, INK, 'left');
    bars(context, a.x + 24, a.y + 66, a.w - 48, 14, 6);
    t.toasts.forEach((label, index) => {
      const y = a.y + a.h - 70 - index * 62;
      card(context, a.x + 20, y, a.w - 40, 50);
      context.beginPath();
      context.arc(a.x + 44, y + 25, 10, 0, Math.PI * 2);
      context.fillStyle = index ? ORANGE : RED;
      context.fill();
      text(context, label, a.x + 64, y + 30, `600 12px ${SANS}`, INK, 'left');
    });
  },
  // La case piège.
  (context, a) => {
    const t = examples();
    text(context, t.almost, a.x + 24, a.y + 50, `800 24px ${SANS}`, INK, 'left');
    bars(context, a.x + 24, a.y + 76, a.w - 48, 4, 7);
    ticked(context, a.x + 24, a.y + 186, 18);
    paragraph(context, t.trick, a.x + 54, a.y + 200, a.w - 80, `400 14px ${SANS}`, 20, INK);
    button(context, a.x + 40, a.y + 300, a.w - 80, 46, t.submit, BLUE);
  },
  // Le défilement infini : des cartes qui s'effacent vers le bas, et une flèche.
  (context, a) => {
    for (let index = 0; index < 6; index++) {
      const y = a.y + 20 + index * 74;
      context.globalAlpha = Math.max(0.15, 1 - index * 0.15);
      card(context, a.x + 24, y, a.w - 48, 60);
      bars(context, a.x + 44, y + 18, a.w - 88, 2, 30 + index);
      context.globalAlpha = 1;
    }
    text(context, '↓', a.x + a.w / 2, a.y + a.h - 10, `700 26px ${SANS}`, PINK);
  },
];

/** L'exemple du chapitre `chapter`, dans une fenêtre de navigateur posée en (x, y). */
export const paintExample = (
  context: CanvasRenderingContext2D,
  chapter: number,
  x: number,
  y: number,
  width: number,
  height: number,
): void => {
  EXAMPLES[chapter](context, browser(context, x, y, width, height, examples().urls[chapter]));
};
