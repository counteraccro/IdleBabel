import { OCHRE, ROSE, star, outline, painted, type Path } from './voynichDraw';

/**
 * Les cœurs des cercles d'étoiles : un signe par mois, dans l'ordre du vrai manuscrit, qui va de mars à
 * décembre (les deux derniers sont perdus). Les mois sont écrits comme dans le vrai, d'une main plus récente,
 * en lettres latines, les mêmes dans les deux langues. Les poissons sont ceux de la maquette ; les autres,
 * dans le même style. Les signes qui sont des personnes (gémeaux, vierge) sont habillés.
 */

type Context = CanvasRenderingContext2D;
type Sign = (context: Context, cx: number, cy: number) => void;

const GREY = 'rgba(120,140,150,0.5)';
const BROWN = 'rgba(140,90,60,0.5)';
const PALE = 'rgba(200,190,160,0.55)';
const BLUE_ROBE = 'rgba(70,100,150,0.5)';

const line =
  (x0: number, y0: number, x1: number, y1: number): Path =>
  (c) => {
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
  };

/** Un poisson de longueur `l`, tourné de `angle`. */
const fish = (context: Context, x: number, y: number, l: number, angle: number): void => {
  context.save();
  context.translate(x, y);
  context.rotate(angle);
  painted(
    context,
    (c) => {
      c.beginPath();
      c.moveTo(l * 0.5, 0);
      c.bezierCurveTo(l * 0.2, -l * 0.28, -l * 0.25, -l * 0.22, -l * 0.35, 0);
      c.bezierCurveTo(-l * 0.25, l * 0.22, l * 0.2, l * 0.28, l * 0.5, 0);
      c.closePath();
      c.moveTo(-l * 0.33, 0);
      c.lineTo(-l * 0.55, -l * 0.18);
      c.lineTo(-l * 0.5, 0);
      c.lineTo(-l * 0.55, l * 0.18);
      c.closePath();
    },
    GREY,
    2,
  );
  outline(
    context,
    (c) => {
      c.beginPath();
      c.arc(l * 0.32, -l * 0.05, 3, 0, Math.PI * 2);
      c.moveTo(l * 0.18, -l * 0.18);
      c.quadraticCurveTo(l * 0.1, 0, l * 0.18, l * 0.18);
    },
    1.4,
  );
  context.restore();
};

/** Une bête à quatre pattes, tournée vers la droite ; `head` dessine ce qui la distingue (cornes, crinière). */
const beast = (context: Context, cx: number, cy: number, color: string, head: (context: Context) => void): void => {
  context.save();
  context.translate(cx, cy);
  outline(context, (c) => {
    c.beginPath();
    for (const x of [-30, -16, 16, 30]) {
      c.moveTo(x, 18);
      c.lineTo(x + (x < 0 ? -3 : 3), 50);
    }
    c.moveTo(-44, 2);
    c.quadraticCurveTo(-66, 0, -62, -20);
  });
  head(context);
  painted(
    context,
    (c) => {
      c.beginPath();
      c.ellipse(0, 6, 46, 22, 0, 0, Math.PI * 2);
      c.moveTo(66, -12);
      c.arc(52, -12, 14, 0, Math.PI * 2);
    },
    color,
    2,
  );
  outline(context, (c) => {
    c.beginPath();
    c.arc(56, -15, 2, 0, Math.PI * 2);
  });
  context.restore();
};

/** Une personne debout, en robe longue. */
const figure = (context: Context, x: number, y: number, robe: string): void => {
  painted(
    context,
    (c) => {
      c.beginPath();
      c.moveTo(x - 10, y - 18);
      c.lineTo(x + 10, y - 18);
      c.lineTo(x + 20, y + 52);
      c.lineTo(x - 20, y + 52);
      c.closePath();
    },
    robe,
    2,
  );
  painted(
    context,
    (c) => {
      c.beginPath();
      c.arc(x, y - 31, 11, 0, Math.PI * 2);
    },
    'rgba(220,190,160,0.5)',
    2,
  );
};

export const SIGNS: readonly { month: string; draw: Sign }[] = [
  {
    month: 'mars',
    draw: (context, cx, cy) => {
      fish(context, cx - 12, cy - 30, 120, 0.15);
      fish(context, cx + 12, cy + 34, 120, Math.PI + 0.15);
    },
  },
  {
    month: 'abril',
    // Le bélier : des cornes enroulées.
    draw: (context, cx, cy) =>
      beast(context, cx - 6, cy, PALE, (c) =>
        outline(
          c,
          (p) => {
            p.beginPath();
            p.arc(50, -22, 10, Math.PI * 1.1, Math.PI * 2.9);
            p.arc(50, -22, 5, Math.PI * 0.9, Math.PI * 2.4);
          },
          2.6,
        ),
      ),
  },
  {
    month: 'may',
    // Le taureau : deux cornes en croissant.
    draw: (context, cx, cy) =>
      beast(context, cx - 6, cy, BROWN, (c) =>
        outline(
          c,
          (p) => {
            p.beginPath();
            p.moveTo(44, -22);
            p.quadraticCurveTo(36, -44, 48, -50);
            p.moveTo(60, -22);
            p.quadraticCurveTo(70, -44, 60, -52);
          },
          3,
        ),
      ),
  },
  {
    month: 'yony',
    // Les gémeaux : deux personnes qui se tiennent la main.
    draw: (context, cx, cy) => {
      outline(context, line(cx - 22, cy, cx + 22, cy));
      figure(context, cx - 30, cy - 4, BLUE_ROBE);
      figure(context, cx + 30, cy - 4, ROSE);
    },
  },
  {
    month: 'jollet',
    // Le crabe.
    draw: (context, cx, cy) => {
      outline(context, (c) => {
        c.beginPath();
        for (const side of [-1, 1])
          for (let leg = 0; leg < 3; leg++) {
            const y = cy + 2 + leg * 9;
            c.moveTo(cx + side * 26, y);
            c.lineTo(cx + side * 46, y - 6);
            c.lineTo(cx + side * 54, y + 14);
          }
        for (const side of [-1, 1]) {
          c.moveTo(cx + side * 16, cy - 14);
          c.lineTo(cx + side * 28, cy - 40);
        }
      });
      for (const side of [-1, 1])
        painted(
          context,
          (c) => {
            c.beginPath();
            c.arc(cx + side * 30, cy - 50, 12, side > 0 ? Math.PI * 0.85 : Math.PI * 1.65, side > 0 ? Math.PI * 2.35 : Math.PI * 3.15);
            c.closePath();
          },
          ROSE,
          2,
        );
      painted(
        context,
        (c) => {
          c.beginPath();
          c.ellipse(cx, cy + 4, 30, 20, 0, 0, Math.PI * 2);
        },
        ROSE,
        2,
      );
    },
  },
  {
    month: 'augst',
    // Le lion : une crinière, une queue en houppe.
    draw: (context, cx, cy) =>
      beast(context, cx - 6, cy, OCHRE, (c) => {
        painted(
          c,
          (p) => {
            p.beginPath();
            for (let i = 0; i <= 16; i++) {
              const [a, d] = [(i / 16) * Math.PI * 2, i % 2 ? 18 : 25];
              if (i) p.lineTo(52 + Math.cos(a) * d, -12 + Math.sin(a) * d);
              else p.moveTo(52 + Math.cos(a) * d, -12 + Math.sin(a) * d);
            }
            p.closePath();
          },
          'rgba(170,110,50,0.5)',
          2,
        );
        painted(
          c,
          (p) => {
            p.beginPath();
            p.arc(-62, -24, 6, 0, Math.PI * 2);
          },
          'rgba(170,110,50,0.5)',
          1.6,
        );
      }),
  },
  {
    month: 'septe',
    // La vierge : une personne qui tient une étoile.
    draw: (context, cx, cy) => {
      outline(context, line(cx + 8, cy - 4, cx + 30, cy - 22));
      figure(context, cx - 4, cy - 4, BLUE_ROBE);
      star(context, cx + 36, cy - 28, 12);
    },
  },
  {
    month: 'octe',
    // La balance.
    draw: (context, cx, cy) => {
      outline(context, (c) => {
        c.beginPath();
        c.moveTo(cx, cy + 50);
        c.lineTo(cx, cy - 46);
        c.moveTo(cx - 54, cy - 36);
        c.lineTo(cx + 54, cy - 36);
        c.moveTo(cx - 20, cy + 50);
        c.lineTo(cx + 20, cy + 50);
        for (const side of [-1, 1]) {
          c.moveTo(cx + side * 54, cy - 36);
          c.lineTo(cx + side * 40, cy + 6);
          c.moveTo(cx + side * 54, cy - 36);
          c.lineTo(cx + side * 68, cy + 6);
        }
      });
      for (const side of [-1, 1])
        painted(
          context,
          (c) => {
            c.beginPath();
            c.arc(cx + side * 54, cy + 4, 18, 0, Math.PI);
            c.closePath();
          },
          OCHRE,
          2,
        );
    },
  },
  {
    month: 'nove',
    // Le scorpion : des anneaux, une queue relevée, un dard.
    draw: (context, cx, cy) => {
      outline(context, (c) => {
        c.beginPath();
        for (const side of [-1, 1]) {
          c.moveTo(cx + 34, cy + side * 6);
          c.quadraticCurveTo(cx + 58, cy + side * 22, cx + 62, cy + side * 34);
        }
        c.moveTo(cx - 46, cy - 40);
        c.quadraticCurveTo(cx - 40, cy - 56, cx - 26, cy - 50);
      });
      const rings = [
        [cx + 26, cy, 12],
        [cx + 8, cy + 2, 13],
        [cx - 12, cy + 2, 12],
        [cx - 30, cy - 4, 10],
        [cx - 42, cy - 18, 9],
        [cx - 46, cy - 32, 8],
      ];
      for (const [x, y, r] of rings)
        painted(
          context,
          (c) => {
            c.beginPath();
            c.arc(x, y, r, 0, Math.PI * 2);
          },
          BROWN,
          1.8,
        );
    },
  },
  {
    month: 'dece',
    // Le sagittaire, comme dans le vrai : une arbalète.
    draw: (context, cx, cy) => {
      painted(
        context,
        (c) => {
          c.beginPath();
          c.moveTo(cx - 60, cy + 10);
          c.lineTo(cx + 50, cy - 6);
          c.lineTo(cx + 52, cy + 4);
          c.lineTo(cx - 58, cy + 22);
          c.closePath();
        },
        BROWN,
        2,
      );
      outline(
        context,
        (c) => {
          c.beginPath();
          c.moveTo(cx + 30, cy - 52);
          c.quadraticCurveTo(cx + 62, cy, cx + 38, cy + 50);
        },
        3,
      );
      outline(
        context,
        (c) => {
          c.beginPath();
          c.moveTo(cx + 30, cy - 52);
          c.lineTo(cx - 6, cy + 4);
          c.lineTo(cx + 38, cy + 50);
        },
        1.2,
      );
    },
  },
];
