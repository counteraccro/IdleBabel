import { messages } from '../../../i18n';
import { shelfMarkText, type CoverDesign } from '../../../systems/coverDesign';
import { leatherGrain } from './leatherGrain';
import { marble } from './marble';
import { GOLD, MCQW, MH, MW, SANS, SERIF, hexagon, type Context } from './mockup';
import type { CoverDetails } from '../../../systems/coverDetails';

/** L'ex-libris de la Bibliothèque, collé en haut de la garde : un hexagone et la cote. */
export const exLibris = (context: Context, design: CoverDesign, x: number, y: number): void => {
  const [w, h] = [30 * MCQW, 21 * MCQW];
  const { exLibris: label, library } = messages().covers.binding;
  context.save();
  context.translate(x, y);
  context.rotate(-0.015);
  context.shadowColor = 'rgba(0,0,0,0.3)';
  context.shadowBlur = 0.8 * MCQW;
  context.shadowOffsetY = 0.3 * MCQW;
  context.fillStyle = '#f1e9d4';
  context.fillRect(-w / 2, -h / 2, w, h);
  context.shadowColor = 'transparent';
  context.strokeStyle = '#3a2a18';
  context.lineWidth = 0.3 * MCQW;
  context.strokeRect(-w / 2 + MCQW, -h / 2 + MCQW, w - 2 * MCQW, h - 2 * MCQW);
  context.fillStyle = '#3a2a18';
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.font = `italic ${2.6 * MCQW}px ${SERIF}`;
  context.fillText(label, 0, -h / 2 + 4.6 * MCQW);
  hexagon(context, 0, 0.5 * MCQW, 3.6 * MCQW);
  context.lineWidth = 0.35 * MCQW;
  context.stroke();
  context.font = `${2.2 * MCQW}px ${SERIF}`;
  context.letterSpacing = `${0.3 * MCQW}px`;
  context.fillText(library, 0, h / 2 - 4.4 * MCQW);
  context.font = `${1.9 * MCQW}px ${SERIF}`;
  context.fillText(shelfMarkText(design), 0, h / 2 - 1.9 * MCQW);
  context.restore();
};

/** Le tampon violet de la Bibliothèque, sur la garde blanche d'un livre moderne. */
export const libraryStamp = (context: Context, design: CoverDesign, x: number, y: number): void => {
  context.save();
  context.translate(x, y);
  context.rotate(-0.2);
  context.globalAlpha = 0.6;
  context.strokeStyle = '#4b3a8a';
  context.fillStyle = '#4b3a8a';
  context.lineWidth = 0.5 * MCQW;
  context.beginPath();
  context.arc(0, 0, 9 * MCQW, 0, 2 * Math.PI);
  context.stroke();
  context.lineWidth = 0.25 * MCQW;
  context.beginPath();
  context.arc(0, 0, 7.6 * MCQW, 0, 2 * Math.PI);
  context.stroke();
  hexagon(context, 0, -1.2 * MCQW, 2.6 * MCQW);
  context.lineWidth = 0.4 * MCQW;
  context.stroke();
  context.font = `bold ${1.8 * MCQW}px ${SANS}`;
  context.textAlign = 'center';
  context.letterSpacing = `${0.2 * MCQW}px`;
  context.fillText(messages().covers.binding.library, 0, 3.6 * MCQW);
  context.font = `${1.6 * MCQW}px ${SANS}`;
  context.fillText(shelfMarkText(design), 0, 5.8 * MCQW);
  context.restore();
};

/**
 * La garde d'un livre de cuir (repère de la maquette, sur le cuir déjà peint et usé) : le cuir rempli sur
 * les bords, le papier marbré collé par-dessus, parfois une roulette dorée, et l'ex-libris.
 */
export const marbledEndpaper = (context: Context, design: CoverDesign, details: CoverDetails): void => {
  const margin = 6.5 * MCQW;
  context.save();
  context.shadowColor = 'rgba(0,0,0,0.35)';
  context.shadowBlur = 0.6 * MCQW;
  context.drawImage(
    marble(details.seed, details.marble, details.marbleKind, MW - 2 * margin, MH - 2 * margin),
    margin,
    margin,
    MW - 2 * margin,
    MH - 2 * margin,
  );
  context.restore();
  if (details.roll > 1 && !details.half) {
    context.save();
    context.strokeStyle = GOLD;
    context.globalAlpha = 0.8;
    context.lineWidth = 0.3 * MCQW;
    const at = margin - 2.2 * MCQW;
    context.strokeRect(at, at, MW - 2 * at, MH - 2 * at);
    context.restore();
  }
  exLibris(context, design, MW / 2, MH * 0.22);
};

/** Le grain du cuir des gardes, plus discret que sur les plats. */
export const endpaperGrain = (context: Context, details: CoverDetails): void => leatherGrain(context, MW, MH, details.seed + 4, 0.7);
