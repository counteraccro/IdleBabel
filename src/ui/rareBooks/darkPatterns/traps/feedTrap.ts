import './feedTrap.css';
import { el } from '../../../dom';
import { button, traps, type Trap } from './trapStage';

/** Articles au départ (de quoi défiler), puis à chaque chargement. */
const FIRST_POSTS = 8;
const MORE_POSTS = 4;
/** Arrivé à tant de pixels du bas, la suite se charge… après ce temps. */
const NEAR_BOTTOM = 140;
const LOADING_MS = 350;

/**
 * Le défilement sans fin : un fil d'articles ; arrivé en bas, d'autres se chargent et le lien « Sortie », sous le
 * chargement, recule (touché, il recule aussitôt). La grande porte : « Lire la suite ». La vraie sortie : « Mettre
 * en pause le chargement », minuscule, en haut, puis descendre jusqu'à « Sortie ».
 */
export const feedTrap: Trap = ({ show, done, later, signal }) => {
  const text = traps().feed;
  let paused = false;
  let loading = false;
  let count = 0;
  const posts = el('div');
  const loader = el('div', 'dp-loading', text.loading);

  const more = (posted: number): void => {
    for (let index = 0; index < posted; index++, count++) {
      const post = el('div', 'dp-post');
      post.append(
        el('b', undefined, text.posts[count % text.posts.length]),
        el('div', 'dp-lines'),
        el('div', 'dp-lines'),
        button('big', text.more, () => done(false, text.read)),
      );
      posts.append(post);
    }
  };

  const pause = button('link', text.pause, () => {
    paused = true;
    pause.textContent = text.paused;
    loader.textContent = text.end;
  });
  const head = el('div', 'dp-feed-head');
  head.append(pause, el('b', undefined, text.title));
  const exit = el('div', 'dp-exit');
  exit.append(button('link', text.exit, () => (paused ? done(true, text.free) : more(MORE_POSTS))));
  const scroll = el('div', 'dp-scroll');
  scroll.addEventListener(
    'scroll',
    () => {
      if (paused || loading || scroll.scrollTop + scroll.clientHeight < scroll.scrollHeight - NEAR_BOTTOM) return;
      loading = true;
      later(() => {
        more(MORE_POSTS);
        loading = false;
      }, LOADING_MS);
    },
    { signal },
  );
  more(FIRST_POSTS);
  scroll.append(posts, loader, exit);
  const feed = el('div', 'dp-feed');
  feed.append(head, scroll);
  show(feed);
};
