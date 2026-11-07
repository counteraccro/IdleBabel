import './goldBook.css';
import { getLocale, t } from '../../i18n';
import { formatCount, writeDigits } from '../../core/format';
import { el, type Component } from '../dom';
import { WORD } from '../../data/goldBook';
import { dustFor, endRun, feedRun, readMinutes, readRun, readsLeft } from '../../systems/goldBook';
import { createGoldBookTree } from './goldBookTree';
import {
  advanceRun,
  chooseFavor,
  comboMultiplier,
  comboWindow,
  newRun,
  takeLetter,
  type Run,
  type RunLetter,
} from '../../systems/goldBookRun';
import type { GameState } from '../../core/state';

/**
 * Le Livre d'or ouvert (#livredor), à l'identique de la maquette (.ai/maquette-livre-dor.html) : il prend tout l'écran, le
 * compteur devient un score, la lecture continue derrière. Des lettres montent du livre en se balançant, comme la lettre
 * qui s'échappe ; on les attrape. Une partie quittée en cours est perdue.
 */

/** Une lettre à l'écran : son dessin, et où elle en est. */
interface ShownLetter {
  letter: RunLetter;
  root: HTMLElement;
  glyph: HTMLElement;
  x: number;
  y: number;
}

/** Le plus grand pas de temps d'une image (ms) : un onglet revenu au premier plan ne fait pas un bond. */
const MAX_STEP = 100;

const count = (value: number): string => writeDigits(String(Math.floor(value)));

export const createGoldBookPage = (state: GameState, onBack: () => void): Component => {
  const root = el('main', 'gold-book');
  const back = el('button', 'options-back', `← ${t('goldBook.close')}`);
  back.addEventListener('click', onBack);

  const book = el('div', 'gold-book-book');
  const left = el('div', 'gold-book-page');
  left.append(el('div', 'gold-book-title', t('goldBook.name').toUpperCase()));
  book.append(el('div', 'gold-book-edge'), left, el('div', 'gold-book-page right'));
  const spelled = el('div', 'gold-book-spelled');
  const field = el('div', 'gold-book-field');

  const hud = el('div', 'gold-book-hud');
  const score = el('div', 'gold-book-score', '0');
  const sub = el('div', 'gold-book-sub');
  hud.append(score, sub);
  const lives = el('div', 'gold-book-lives');
  const combo = el('div', 'gold-book-combo');
  const mult = el('div', 'gold-book-mult', '×1');
  combo.append(el('div', 'gold-book-ring'), mult);
  const behind = el('div', 'gold-book-behind');

  /** Une fenêtre par-dessus la partie : ce qu'on y met. */
  const over = (...content: HTMLElement[]): HTMLElement => {
    const box = el('div', 'gold-book-over');
    const inner = el('div', 'gold-book-in');
    inner.append(...content);
    box.append(inner);
    return box;
  };
  const button = (cls: string, text: string, action: () => void): HTMLButtonElement => {
    const b = el('button', cls, text);
    b.addEventListener('click', action);
    return b;
  };
  /** Une carte à choisir : un nom, ce qu'elle fait. */
  const card = (name: string): { root: HTMLButtonElement; what: HTMLElement } => {
    const cardRoot = el('button', 'gold-book-card');
    const what = el('div', 'gold-book-card-what');
    cardRoot.append(el('div', 'gold-book-card-name', name), what);
    return { root: cardRoot, what };
  };

  const introRow = el('div', 'gold-book-row');
  introRow.append(
    button('gold-book-again', t('goldBook.open'), () => start()),
    button('gold-book-again', t('goldBook.tree.button'), () => openTree()),
  );
  const intro = over(el('h2', '', t('goldBook.name')), el('p', 'gold-book-lead', t('goldBook.quote')), introRow);

  const favorTitle = el('h2');
  const cards = el('div', 'gold-book-cards');
  const favor = over(favorTitle, el('p', 'gold-book-lead', t('goldBook.favorLead')), cards);

  const endScore = el('div', 'gold-book-end-score');
  const endRecord = el('div', 'gold-book-rec');
  const read = card(t('goldBook.read'));
  const feed = card(t('goldBook.feed'));
  const endCards = el('div', 'gold-book-cards');
  endCards.append(read.root, feed.root);
  const after = el('div', 'gold-book-row');
  after.append(
    button('gold-book-again', t('goldBook.again'), () => start()),
    button('gold-book-again', t('goldBook.tree.button'), () => openTree()),
  );
  const end = over(el('h2', '', t('goldBook.endTitle')), endScore, endRecord, endCards, after);

  const tree = createGoldBookTree(state);
  const treeOver = over(
    tree.root,
    button('gold-book-again', t('goldBook.again'), () => start()),
  );

  root.append(back, book, spelled, field, hud, lives, combo, behind, intro, favor, end, treeOver);

  let run: Run | null = null;
  let shown: ShownLetter[] = [];
  let frame = 0;
  let last = 0;
  /** Le score de la partie finie, en attendant le choix. */
  let finished = 0;

  /** Une fenêtre à l'écran (aucune : la partie). */
  const show = (box: HTMLElement | null): void => {
    for (const other of [intro, favor, end, treeOver]) other.classList.toggle('on', other === box);
  };
  const openTree = (): void => {
    tree.draw();
    show(treeOver);
  };

  /** Une petite inscription qui monte et s'efface : des points, une erreur. */
  const float = (x: number, y: number, text: string, cls = ''): void => {
    const f = el('div', `gold-book-float ${cls}`, text);
    f.style.left = `${x}px`;
    f.style.top = `${y}px`;
    field.append(f);
    window.setTimeout(() => f.remove(), 900);
  };

  /** La poussière d'or d'une lettre attrapée. */
  const dust = (x: number, y: number): void => {
    for (let i = 0; i < 16; i++) {
      const d = el('div', 'gold-book-dust');
      d.style.left = `${x}px`;
      d.style.top = `${y}px`;
      field.append(d);
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 45;
      d.animate(
        [
          { transform: 'translate(0, 0)', opacity: 1 },
          { transform: `translate(${Math.cos(angle) * speed}px, ${Math.sin(angle) * speed - 25}px)`, opacity: 0 },
        ],
        { duration: 700 + Math.random() * 600, easing: 'cubic-bezier(.2,.7,.3,1)' },
      ).onfinish = () => d.remove();
    }
  };

  const shake = (): void => {
    book.classList.remove('shake');
    void book.offsetWidth;
    book.classList.add('shake');
  };

  /** Elle monte du livre en se balançant (p de 0 à 1, parts de l'écran), comme la lettre qui s'échappe. */
  const move = (item: ShownLetter, p: number): void => {
    const { x0, seed } = item.letter;
    item.x = (x0 + 0.04 * Math.sin(p * 6 + seed) + 0.03 * p * Math.sign(Math.sin(seed))) * field.clientWidth;
    item.y = (0.74 - 0.6 * p) * field.clientHeight;
    item.root.style.transform = `translate(${item.x}px, ${item.y}px)`;
    item.glyph.style.transform = `rotate(${18 * Math.sin(p * 4 + seed)}deg) scale(${1 - 0.35 * p})`;
    item.glyph.style.opacity = String(Math.min(1, p * 8, (1 - p) * 6));
  };

  const drawSpelled = (): void => {
    const spelling = run?.spelling;
    spelled.innerHTML = spelling ? [...WORD].map((char, i) => (i < spelling.i ? `<b>${char}</b>` : char)).join('') : '';
  };
  const drawLives = (): void => {
    if (!run) return;
    lives.innerHTML = Array.from({ length: run.maxLives }, (_, i) => `<i class="${i < run!.lives ? '' : 'lost'}"></i>`).join('');
  };
  const drawHud = (): void => {
    const current = run?.score ?? 0;
    score.textContent = count(current);
    sub.textContent = t('goldBook.letters')
      .replace('{n}', count(run?.count ?? 0))
      .replace('{best}', count(Math.max(state.goldBook.best, current)));
    const multiplier = run ? comboMultiplier(run) : 1;
    mult.textContent = `×${multiplier}`;
    combo.classList.toggle('on', (run?.chain ?? 0) > 0);
    combo.classList.toggle('max', !!run && multiplier >= run.cap);
  };
  const pop = (): void => {
    combo.classList.add('pop');
    window.setTimeout(() => combo.classList.remove('pop'), 120);
  };

  const removeLetter = (item: ShownLetter): void => {
    shown = shown.filter((other) => other !== item);
    item.root.classList.add('gone');
    window.setTimeout(() => item.root.remove(), 260);
  };

  const spawn = (letter: RunLetter): void => {
    const letterRoot = el('div', `gold-book-letter ${letter.kind}`);
    const glyph = el('div', 'gold-book-glyph', letter.char);
    const hit = el('div', 'gold-book-hit');
    letterRoot.append(glyph, hit);
    const item: ShownLetter = { letter, root: letterRoot, glyph, x: 0, y: 0 };
    hit.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      take(item);
    });
    move(item, 0);
    field.append(letterRoot);
    shown.push(item);
  };

  const favors = (choices: readonly string[]): void => {
    if (!run) return;
    favorTitle.textContent = t('goldBook.favorTitle').replace('{n}', count(run.count));
    cards.replaceChildren(
      ...choices.map((id) => {
        const choice = card(t(`goldBook.favors.${id}.name`));
        choice.what.textContent = t(`goldBook.favors.${id}.what`);
        choice.root.addEventListener('click', () => {
          if (!run || !chooseFavor(run, id as Parameters<typeof chooseFavor>[1])) return;
          drawLives();
          drawHud();
          show(null);
        });
        return choice.root;
      }),
    );
    show(favor);
  };

  const take = (item: ShownLetter): void => {
    if (!run) return;
    const result = takeLetter(run, item.letter.id);
    if (!result) return;
    removeLetter(item);
    if (result.ink) {
      float(item.x, item.y, t('goldBook.floats.ink'), 'bad');
      shake();
      drawLives();
    } else {
      dust(item.x, item.y);
      float(item.x, item.y, `+${count(result.gain)}`, item.letter.kind === 'pure' ? 'big' : '');
      if (result.word) {
        float(field.clientWidth / 2, field.clientHeight * 0.6, `${WORD.toUpperCase()} +${count(result.word)}`, 'big');
        window.setTimeout(drawSpelled, 900);
      }
      pop();
    }
    drawSpelled();
    drawHud();
    if (run.over) finish();
    else if (result.favors) favors(result.favors);
  };

  /** La partie avance d'une image : les lettres naissent, montent, s'éteignent. */
  const loop = (now: number): void => {
    frame = requestAnimationFrame(loop);
    // Page quittée : la partie en cours s'arrête là.
    if (!run || !root.isConnected) {
      cancelAnimationFrame(frame);
      run = null;
      return;
    }
    const step = Math.min(MAX_STEP, now - (last || now));
    last = now;
    for (const event of advanceRun(run, step)) {
      if (event.type === 'spawn') spawn(event.letter);
      if (event.type === 'out' || event.type === 'wordOut') {
        const item = shown.find((candidate) => candidate.letter.id === event.letter.id);
        if (item) {
          removeLetter(item);
          float(item.x, item.y, t(`goldBook.floats.${event.type}`), 'bad');
        }
        if (event.type === 'out') {
          shake();
          drawLives();
        }
        drawSpelled();
      }
      if (event.type === 'break') drawHud();
      if (event.type === 'over') return finish();
    }
    for (const item of shown) move(item, Math.min(1, (run.t - item.letter.born) / item.letter.life));
    combo.style.setProperty('--left', String(run.chain ? Math.max(0, 1 - (run.t - run.lastCatch) / comboWindow(run)) : 0));
  };

  const start = (): void => {
    field.replaceChildren();
    shown = [];
    run = newRun(state);
    last = 0;
    drawSpelled();
    drawLives();
    drawHud();
    show(null);
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(loop);
  };

  /** La fin : le score se lit, ou nourrit l'arbre. */
  const finish = (): void => {
    if (!run) return;
    cancelAnimationFrame(frame);
    finished = run.score;
    const { record } = endRun(state, run);
    run = null;
    for (const item of shown) item.root.remove();
    shown = [];
    endScore.textContent = count(finished);
    endRecord.innerHTML =
      record && finished > 0 ? `<b>${t('goldBook.record')}</b>` : t('goldBook.best').replace('{n}', count(state.goldBook.best));
    const reads = readsLeft(state);
    read.what.textContent = reads
      ? t('goldBook.readWhat')
          .replace('{n}', count(readMinutes(state, finished)))
          .replace('{left}', count(reads))
      : t('goldBook.readNone');
    read.root.disabled = !reads || finished <= 0;
    feed.what.textContent = t('goldBook.feedWhat').replace('{n}', count(dustFor(state, finished)));
    feed.root.disabled = false;
    after.style.display = 'none';
    show(end);
  };

  /** Le lire ou nourrir l'arbre (qui s'ouvre alors) : une seule fois par partie. */
  const chosen = (): void => {
    read.root.disabled = true;
    feed.root.disabled = true;
    after.style.display = '';
  };
  read.root.addEventListener('click', () => {
    if (!readRun(state, finished)) return;
    read.what.textContent = t('goldBook.readDone')
      .replace('{n}', count(readMinutes(state, finished)))
      .replace('{left}', count(readsLeft(state)));
    chosen();
  });
  feed.root.addEventListener('click', () => {
    feed.what.textContent = t('goldBook.feedDone').replace('{n}', count(feedRun(state, finished)));
    chosen();
    openTree();
  });

  /** En fond, la lecture continue : les pages, au fil de la partie. */
  const drawBehind = (): void => {
    behind.textContent = t('goldBook.behind').replace('{n}', formatCount(state.pages, getLocale()));
  };

  drawHud();
  drawBehind();
  show(intro);
  return { root, update: drawBehind };
};
