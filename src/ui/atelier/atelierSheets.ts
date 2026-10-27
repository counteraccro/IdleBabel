import {
  NEW,
  PARTS,
  PULP_KEEP_CHOICES,
  PULP_MAX_PERCENT,
  PULP_PER_PERCENT,
  RANK_A,
  RESTORE_PAGES,
  RESTORE_PIECES,
  SETS,
  SET_PAGES,
  STATES,
  type PieceId,
} from '../../data/curiosities';
import { canRestore, freePresses, mountSet, notebookJob, restoreMs, restoreNotebookPiece, setReady } from '../../systems/curiosityPresses';
import { pulpFull, pulpPercent, pulpState, setPulpKeep } from '../../systems/curiosityPulp';
import { at, minutesText, partName, partsName, rankName, setTitle, stateName, statesName } from './atelierText';
import type { Curiosity, GameState } from '../../core/state';

/**
 * Les feuilles posées sur la scène (maquette validée) : le carnet des pièces S (les huit livres S, leurs pièces trouvées ;
 * restaurer une pièce, monter un set complet sur le livre de rang A du pupitre), la règle du rebut, le pilon.
 */

const escape = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const disabled = (off: boolean): string => (off ? 'disabled' : '');

/** Le carnet : chaque livre S, ses quatre places ; la pièce choisie (à restaurer) en bas. */
export const notebookHtml = (state: GameState, selected: Curiosity | null, chosen: [number, PieceId] | null, now: number): string => {
  const atelier = state.atelier;
  const free = freePresses(state);
  let html = `<button class="x" data-c="close">×</button><h2>${escape(at('notebook.title'))}</h2>`;
  html += `<div class="set hd"><span></span>${PARTS.map((part) => `<span style="text-align:center">${escape(partName(part))}</span>`).join('')}</div>`;
  SETS.forEach((_, set) => {
    const have = atelier.notebook[set];
    const n = PARTS.filter((part) => have[part]).length;
    html += `<div class="set"><span class="name">${escape(setTitle(set))} <small style="font-weight:400;color:#555">${n}/4</small></span>`;
    for (const part of PARTS) {
      const piece = have[part];
      const busy = notebookJob(state, set, part);
      html += piece
        ? `<span class="slot have ${busy ? 'busy' : ''}" data-c="piece" data-k="${set}" data-p="${part}" title="${escape(at('notebook.restoreTitle'))}">${escape(stateName(piece.state))}${busy ? `<small>${escape(at('notebook.press', { d: minutesText((busy.end - now) / 60_000) }))}</small>` : ''}</span>`
        : `<span class="slot"></span>`;
    }
    html += `</div>`;
    if (n === PARTS.length) {
      const onDesk = selected?.rank === RANK_A && PARTS.every((part) => !notebookJob(state, set, part));
      const ok = onDesk && atelier.reserve >= SET_PAGES && setReady(state, set);
      html += `<div class="line">${escape(at('notebook.complete'))} <button data-c="mount" data-k="${set}" ${disabled(!ok)}>${escape(at('notebook.mountSet', { n: SET_PAGES }))}</button> ${ok ? '' : `<span style="color:#666">(${escape(onDesk ? at('notebook.needPages', { n: SET_PAGES, have: atelier.reserve }) : at('notebook.needA'))})</span>`}</div>`;
    }
  });
  if (chosen) {
    const [set, part] = chosen;
    const piece = atelier.notebook[set][part];
    if (piece) {
      html += `<div class="line">${escape(at('notebook.piece', { title: setTitle(set), part: partName(part), state: stateName(piece.state) }))}`;
      html +=
        piece.state < NEW
          ? `<button data-c="restore" ${disabled(!free || !canRestore(state, part, piece.state))}>${escape(at('notebook.restore', { state: stateName(piece.state + 1), d: minutesText(restoreMs(state, piece.state) / 60_000) }))}</button> ${escape(at('notebook.costs', { cost: at('notebook.cost', { n: RESTORE_PIECES, parts: partsName(part), p: RESTORE_PAGES[piece.state] }) }))}${free ? '' : escape(at('notebook.busy'))}`
          : escape(at('notebook.new'));
      html += `</div>`;
    }
  }
  return html;
};

/** Un geste dans le carnet ; renvoie la pièce choisie ensuite, et si le carnet se referme. */
export const notebookAction = (
  state: GameState,
  target: HTMLElement,
  selected: Curiosity | null,
  chosen: [number, PieceId] | null,
  now: number,
): { chosen: [number, PieceId] | null; close: boolean } => {
  const action = target.dataset.c;
  const set = Number(target.dataset.k);
  if (action === 'close') return { chosen: null, close: true };
  if (action === 'piece') {
    const part = target.dataset.p as PieceId;
    return { chosen: notebookJob(state, set, part) ? chosen : [set, part], close: false };
  }
  if (action === 'restore' && chosen) {
    restoreNotebookPiece(state, chosen[0], chosen[1], now);
    return { chosen: null, close: false };
  }
  if (action === 'mount' && selected) {
    const done = mountSet(state, selected, set, Math.random);
    return { chosen: null, close: done };
  }
  return { chosen, close: false };
};

/** La règle du rebut : au rebut dès l'arrivée, rang ≤ … et état ≤ … ; jamais un livre à pièce S. */
export const scrapHtml = (state: GameState): string => {
  const { rank, state: worst } = state.atelier.scrap;
  const ranks = [0, 1, 2, 3, 4].map((r) => `<option value="${r}" ${rank === r ? 'selected' : ''}>${rankName(r)}</option>`).join('');
  const states = Array.from(
    { length: STATES },
    (_, s) => `<option value="${s}" ${worst === s ? 'selected' : ''}>${escape(stateName(s))}</option>`,
  ).join('');
  return `${escape(at('scrapForm.title'))}<br>${escape(at('scrapForm.rank'))} <select data-f="rank"><option value="-1">${escape(at('scrapForm.none'))}</option>${ranks}</select>
    ${escape(at('scrapForm.state'))} <select data-f="state">${states}</select><br>
    <span class="small">${escape(at('scrapForm.never'))}</span><br><button data-f="ok">${escape(at('scrapForm.ok'))}</button>`;
};

/** Le pilon : à la main, un état à la fois (tous les tiroirs) ; et le stock gardé par tiroir. */
export const pulpHtml = (state: GameState): string => {
  const atelier = state.atelier;
  const counts = Array.from({ length: STATES }, (_, s) => PARTS.reduce((sum, part) => sum + atelier.drawers[part][s], 0));
  const keep = PULP_KEEP_CHOICES.map(
    (n) => `<option value="${n}" ${atelier.keep === n ? 'selected' : ''}>${n < 0 ? escape(at('pulpForm.keepAll')) : n}</option>`,
  ).join('');
  return `<b>${escape(at('pulpForm.title'))}</b> : ${escape(at('pulpForm.gives', { n: pulpPercent(state) }))} <span class="small">${escape(at('pulpForm.limits', { n: PULP_MAX_PERCENT }))}</span><br>
    <span class="small">${escape(at('pulpForm.rules', { points: atelier.pulp, per: PULP_PER_PERCENT }))}</span><br>
    ${counts.map((n, s) => `<button data-s="${s}" ${disabled(pulpFull(state) || !n)}>${escape(at('pulpForm.pulpState', { state: statesName(s), n }))}</button>`).join(' ')}<br>
    ${escape(at('pulpForm.keep'))} <select data-f="keep">${keep}</select>
    <br><span class="small">${escape(at('pulpForm.beyond'))}</span><br><button data-f="ok">${escape(at('pulpForm.ok'))}</button>`;
};

/** Piler un état (à la main). */
export const pulpOne = (state: GameState, pieceState: number): void => void pulpState(state, pieceState);
/** La feuille du pilon, validée : le stock gardé. */
export const pulpKeep = (state: GameState, keep: number): void => setPulpKeep(state, keep);
