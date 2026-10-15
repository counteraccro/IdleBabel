// Liseuse : le livre ouvert remplacé par une liseuse à encre électronique (livres ordinaires seulement : un livre
// rare et le Grand Livre restent en 3D). Une feuille à la fois, ses deux pages à la suite ; toucher la moitié droite
// de l'écran tourne la feuille, la moitié gauche ne fait rien (on ne revient pas en arrière). Les trouvailles sont
// soulignées. Le texte change d'un coup, sans passer au noir comme une vraie liseuse (trop dur pour les yeux).
//
// IdleBabel.replaceHeldBook reçoit le livre en main (book) et rend la vue à poser à sa place :
//   book.index, book.page (la feuille ouverte montre book.page et book.page + 1), book.pages (410), book.title,
//   book.text(page) -> { before, find, after }, book.turn() (tourne une feuille, comme un clic sur le livre).
// Le jeu appelle update() à chaque feuille tournée, à la main ou seule : on réécrit l'écran.
IdleBabel.registerMod('liseuse', {
  init() {
    const words = {
      fr: { page: (a, b) => (b ? `Pages ${a}–${b} sur 410` : `Page ${a} sur 410`) },
      en: { page: (a, b) => (b ? `Pages ${a}–${b} of 410` : `Page ${a} of 410`) },
    };
    const style = document.createElement('style');
    style.textContent = `
      .liseuse { --h: min(70vh, 720px, 125vw); height: var(--h); aspect-ratio: 0.72; position: relative; margin-bottom: 7vh;
        border-radius: calc(var(--h) * 0.045); padding: calc(var(--h) * 0.055) calc(var(--h) * 0.045) calc(var(--h) * 0.085);
        background: linear-gradient(160deg, #3a3a3d, #252527 45%, #1c1c1e);
        box-shadow: 0 calc(var(--h) * 0.03) calc(var(--h) * 0.08) rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 -2px 3px rgba(0, 0, 0, 0.5);
        user-select: none; -webkit-user-select: none; transform: rotate(-2deg); }
      .liseuse::after { content: ''; position: absolute; left: 50%; bottom: calc(var(--h) * 0.035); width: calc(var(--h) * 0.06);
        height: calc(var(--h) * 0.006); transform: translateX(-50%); border-radius: 9px; background: rgba(255, 255, 255, 0.08); }
      .liseuse-screen { position: relative; width: 100%; height: 100%; overflow: hidden; border-radius: 2px; background-color: #dcdcd4;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.35), inset 0 2px 6px rgba(0, 0, 0, 0.25);
        color: #1e1e1e; font-family: Georgia, 'Times New Roman', serif; }
      .liseuse-next { position: absolute; top: 0; right: 0; bottom: 0; width: 50%; cursor: pointer; }
      .liseuse-top { position: absolute; top: 3.2%; left: 7%; right: 7%; text-align: center; font-size: calc(var(--h) * 0.022); color: #555;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
      .liseuse-text { position: absolute; top: 9%; left: 8%; right: 8%; bottom: 11%; overflow: hidden; line-height: 1.5;
        text-align: justify; word-break: break-all; }
      .liseuse-text p { margin: 0; text-indent: 1.4em; }
      .liseuse-text p + p { margin-top: 0.6em; }
      .liseuse-text u { text-decoration: underline; text-decoration-thickness: 0.12em; text-underline-offset: 0.18em; font-weight: bold; word-break: normal; }
      .liseuse-title { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 0 12%;
        text-align: center; font-size: calc(var(--h) * 0.045); line-height: 1.3; }
      .liseuse-bar { position: absolute; left: 7%; right: 7%; bottom: 7.4%; height: calc(var(--h) * 0.004); background: #b9b9b1; }
      .liseuse-bar i { position: absolute; left: 0; top: 0; bottom: 0; background: #333; }
      .liseuse-bottom { position: absolute; left: 7%; right: 7%; bottom: 3.6%; display: flex; justify-content: space-between;
        font-size: calc(var(--h) * 0.02); color: #555; font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; }
    `;
    document.head.append(style);

    IdleBabel.replaceHeldBook((book) => {
      const make = (tag, className) => Object.assign(document.createElement(tag), { className });
      const root = make('div', 'liseuse');
      const screen = make('div', 'liseuse-screen');
      const top = make('div', 'liseuse-top');
      const text = make('div', 'liseuse-text');
      const title = make('div', 'liseuse-title');
      const bar = make('div', 'liseuse-bar');
      const progress = make('i', '');
      const bottom = make('div', 'liseuse-bottom');
      const label = make('span', '');
      const percent = make('span', '');
      const next = make('div', 'liseuse-next');
      bar.append(progress);
      bottom.append(label, percent);
      screen.append(top, text, title, bar, bottom, next);
      root.append(screen);
      // La moitié droite tourne la feuille ; la gauche ne fait rien.
      next.addEventListener('click', () => book.turn());

      // Une page : son charabia, et sa trouvaille soulignée (écrite en texte, jamais en HTML).
      const paragraph = (page) => {
        const { before, find, after } = book.text(page);
        const p = document.createElement('p');
        p.append(before);
        if (find) p.append(' ', Object.assign(document.createElement('u'), { textContent: find }), ' ');
        p.append(after);
        return p;
      };
      // Deux pages de 700 signes : la police rapetisse jusqu'à ce qu'elles tiennent dans l'écran.
      const fit = () => {
        let size = root.clientHeight * 0.023;
        text.style.fontSize = `${size}px`;
        for (let i = 0; i < 16 && text.scrollHeight > text.clientHeight && size > 8; i++) {
          size *= 0.94;
          text.style.fontSize = `${size}px`;
        }
      };

      const update = () => {
        const page = book.page;
        const say = words[IdleBabel.locale] ?? words.en;
        // Le livre vient d'arriver : sa page de titre (le titre au milieu, pas en haut).
        const opening = page < 2;
        top.textContent = opening ? '' : book.title;
        title.textContent = opening ? book.title : '';
        title.style.display = opening ? '' : 'none';
        text.replaceChildren(...(opening ? [] : [paragraph(page), paragraph(page + 1)]));
        const shown = opening ? 1 : page + 1;
        label.textContent = opening ? say.page(1) : say.page(page, page + 1);
        percent.textContent = `${Math.round((shown / book.pages) * 100)} %`;
        progress.style.width = `${(shown / book.pages) * 100}%`;
        if (!opening) fit();
      };
      update();
      // La vue n'a sa taille qu'une fois posée dans la page, et elle suit celle de la fenêtre : la police s'y ajuste.
      new ResizeObserver(() => book.page >= 2 && fit()).observe(root);
      return { root, update };
    });
  },
});
