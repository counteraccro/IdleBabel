import {
  MALUS,
  MOUNT_MINUTES,
  NEW,
  PARTS,
  RANK_A,
  RANK_PAGES,
  RANK_S,
  RESTORE_PAGES,
  RESTORE_PIECES,
  SET_PAGES,
  STATE_FACTOR,
  type PieceId,
} from '../../data/curiosities';
import {
  bookState,
  canLock,
  destroyCuriosity,
  freeCartSlot,
  freeLecternSlot,
  hasSPiece,
  lecternClash,
  mainFamily,
  noteAtelier,
  rankCost,
  rankUp,
  toCart,
  toLectern,
  toggleLock,
} from '../../systems/curiosities';
import { bookJob, canRestore, freePresses, mountPiece, restoreBookPiece, restoreMs } from '../../systems/curiosityPresses';
import { curiosityEffects } from '../../systems/curiosityEffects';
import {
  at,
  bonusText,
  bookName,
  decimal,
  familyName,
  malusText,
  minutesText,
  partLong,
  partName,
  partOne,
  partsName,
  rankName,
  setTitle,
  stateName,
} from './atelierText';
import type { Curiosity, GameState } from '../../core/state';

/**
 * La fiche de catalogue d'une curiosité (maquette validée) : une fiche de bibliothèque tapée à la machine, sortie à gauche
 * quand un livre est déplié sur le pupitre. Rang tamponné, état, ce qu'il donne (l'effet de l'état), ses pièces ; une pièce
 * choisie : ce que le tiroir offre de mieux, ou la restaurer (une pièce S d'un livre S) ; puis le livre : lutrin, chariot,
 * cadenas, monter de rang, le détruire (confirmé).
 */

const escape = (text: string): string => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const disabled = (off: boolean): string => (off ? 'disabled' : '');

export interface CardChoice {
  book: Curiosity | null;
  part: PieceId | null;
  confirm: boolean;
}

/** Le texte de la fiche. */
export const cardHtml = (state: GameState, choice: CardChoice, now: number): string => {
  const book = choice.book;
  if (!book) return '';
  const atelier = state.atelier;
  const s = bookState(book);
  const { bonus, malus } = curiosityEffects(book);
  const free = freePresses(state);
  let html = `<button class="close" data-a="close" title="${escape(at('card.close'))}">×</button>`;
  html += `<h3>${escape(bookName(book))}</h3>`;
  html += `<div class="head"><div class="stamp ${book.rank === RANK_S ? 'S' : ''}">${rankName(book.rank)}</div><div>${escape(at('card.rank', { r: rankName(book.rank) }))}<br>${escape(at('card.state', { s: stateName(s) }))} <span class="dim">(×${decimal(STATE_FACTOR[s])})</span>${book.where === 'lectern' ? `<br><span class="good">${escape(at('card.acting'))}</span>` : ''}</div></div>`;
  html += `<div class="sec">${escape(at('card.gives'))}</div>`;
  for (const effect of bonus)
    html += `<div class="good">${escape(bonusText(effect.family, effect.value * effect.factor))} <span class="dim">(${decimal(effect.value)} × ${decimal(effect.factor)})</span></div>`;
  for (const effect of malus) html += `<div class="bad">${escape(malusText(effect.family, effect.value))}</div>`;
  html += `<div class="sec">${escape(at('card.pieces'))}</div><ul class="parts">`;
  for (const part of PARTS) {
    const piece = book.parts[part];
    html += `<li data-part="${part}" class="${choice.part === part ? 'on' : ''}"><span class="dot st${piece.state}"></span>${escape(partName(part))} — ${escape(stateName(piece.state))}${piece.set !== undefined ? ` <span class="s-mark">★ ${escape(setTitle(piece.set))}</span>` : ''}${bookJob(state, book, part) ? ` <span class="dim">${escape(at('card.atPress'))}</span>` : ''}</li>`;
  }
  html += `</ul>`;
  if (choice.part) {
    const part = choice.part;
    const piece = book.parts[part];
    const busy = bookJob(state, book, part);
    html += `<div class="sec">${escape(partLong(part))}</div>`;
    if (busy) html += `<div class="note">${escape(at('card.pressLeft', { d: minutesText((busy.end - now) / 60_000) }))}</div>`;
    else if (piece.set !== undefined && book.rank < RANK_S)
      html += `<div class="note">${escape(at('card.keepS', { title: setTitle(piece.set) }))}</div>`;
    else if (piece.set !== undefined) {
      if (piece.state < NEW)
        html += `<button class="act" data-a="restore" ${disabled(!free || !canRestore(state, part, piece.state))}>${escape(at('card.restore', { from: stateName(piece.state), to: stateName(piece.state + 1), d: minutesText(restoreMs(state, piece.state) / 60_000) }))}</button><div class="note">${escape(at('card.restoreCost', { n: RESTORE_PIECES, parts: partsName(part), p: RESTORE_PAGES[piece.state] }))}${free ? '' : ` ${escape(at('card.pressesBusy'))}`}</div>`;
      else html += `<div class="note">${escape(at('card.new'))}</div>`;
    } else {
      let any = false;
      for (let to = NEW; to > piece.state; to--) {
        const n = atelier.drawers[part][to];
        if (!n) continue;
        any = true;
        html += `<button class="act" data-a="mount" data-to="${to}" ${disabled(!free)}>${escape(at('card.mount', { one: partOne(part), state: stateName(to) }))} <span class="dim">${escape(at('card.inDrawer', { n }))}</span> · ${escape(minutesText(MOUNT_MINUTES[to]))}</button>`;
      }
      html += `<div class="note">${escape(any ? (free ? at('card.mountNote') : at('card.pressesBusy')) : at('card.nothingBetter', { parts: partsName(part) }))}</div>`;
    }
  }
  html += `<div class="sec">${escape(at('card.theBook'))}</div>`;
  if (choice.confirm) {
    html += `<div class="note">${escape(at('card.destroyAsk', { n: RANK_PAGES[book.rank], s: hasSPiece(book) || book.rank === RANK_S ? at('card.destroyS') : '' }))}</div>`;
    html += `<button class="act danger" data-a="destroy-yes">${escape(at('card.destroyYes'))}</button><button class="act" data-a="destroy-no">${escape(at('card.no'))}</button>`;
    return html;
  }
  if (book.where === 'lectern')
    html += `<button class="act" data-a="cart" ${disabled(freeCartSlot(state) < 0)}>${escape(at('card.toCart'))}</button>`;
  else {
    const clash = lecternClash(state, book);
    const place = freeLecternSlot(state);
    html += `<button class="act" data-a="lectern" ${disabled(!!clash || place < 0 || hasSPiece(book))}>${escape(at('card.toLectern'))}</button>`;
    if (hasSPiece(book)) html += `<div class="note">${escape(at('card.waitsS'))}</div>`;
    else if (clash)
      html += `<div class="note">${escape(at('card.clash', { name: bookName(clash), family: familyName(mainFamily(book)) }))}</div>`;
    else if (place < 0) html += `<div class="note">${escape(at('card.lecternFull'))}</div>`;
    if (book.where === 'cart')
      html += `<button class="act" data-a="lock" ${disabled(!canLock(state, book))}>${escape(at(book.locked ? 'card.unlock' : 'card.lock'))}</button>`;
  }
  const cost = rankCost(book);
  if (cost !== undefined) {
    html += `<button class="act" data-a="rank" ${disabled(atelier.reserve < cost)}>${escape(at('card.rankUp', { r: rankName(book.rank + 1), n: cost }))} <span class="dim">(${atelier.reserve})</span></button>`;
    if (book.rank === 3 && book.nextMalus)
      html += `<div class="note">${escape(at('card.atB', { malus: '§' })).replace('§', `<span class="bad">${escape(malusText(book.nextMalus, MALUS[4]))}</span>`)}</div>`;
    if (book.rank === 4 && book.nextSecond)
      html += `<div class="note">${escape(at('card.atA', { family: '§', n: MALUS[RANK_A] })).replace('§', `<span class="good">${escape(familyName(book.nextSecond))}</span>`)}</div>`;
  } else if (book.rank === RANK_A) html += `<div class="note">${escape(at('card.rankA', { n: SET_PAGES }))}</div>`;
  html += `<button class="act danger" data-a="destroy" ${disabled(book.where === 'lectern')}>${escape(at('card.destroy'))}</button>`;
  if (book.where === 'lectern') html += `<div class="note">${escape(at('card.noDestroy'))}</div>`;
  return html;
};

/**
 * Un geste sur la fiche (le `data-a` du bouton) : il change la partie. Renvoie ce que devient le choix (le livre remis, détruit :
 * plus de livre sur le pupitre).
 */
export const cardAction = (state: GameState, choice: CardChoice, action: string, to: number, now: number): CardChoice => {
  const book = choice.book;
  if (!book) return choice;
  const next: CardChoice = { ...choice, confirm: false };
  if (action === 'close') return { book: null, part: null, confirm: false };
  if (action === 'lectern') toLectern(state, book);
  if (action === 'cart') toCart(state, book);
  if (action === 'lock') toggleLock(state, book);
  if (action === 'destroy') next.confirm = true;
  if (action === 'destroy-yes') {
    const rank = book.rank;
    const outcome = destroyCuriosity(state, book, Math.random);
    if (outcome) noteAtelier({ kind: 'destroyed', rank, pages: RANK_PAGES[rank], ...outcome });
    return { book: null, part: null, confirm: false };
  }
  if (action === 'rank') rankUp(state, book, Math.random);
  if (action === 'mount' && choice.part) mountPiece(state, book, choice.part, to, Math.random, now);
  if (action === 'restore' && choice.part) restoreBookPiece(state, book, choice.part, now);
  return next;
};
