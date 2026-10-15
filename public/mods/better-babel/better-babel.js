// BetterBabel : des aides de lecture, comme Cookie Monster pour Cookie Clicker.
// - La ruche : chaque méthode prend la couleur de son rang (vert : la plus rentable, puis jaune, orange, rouge).
// - Un bloc en bas à gauche : la prochaine lettre, la Mimic, le prochain Éther, les intuitions à s'offrir, la relique.
// - Ses options, sur sa page du cahier (le jeu la dessine d'après `options`).
// Tout vient de IdleBabel.game (les vraies formules du jeu, en lecture seule) : rien n'est recopié ici.
(() => {
// Ce que le mod retient : ses options, le bloc replié ou non, et de quoi redessiner tout de suite.
const mod = { opt: {}, closed: undefined, refresh: () => {} };

IdleBabel.registerMod('better-babel', {
  version: '1.1.0',

  // Un choix parmi plusieurs (`choices`), ou une case. `needs` : grisée au cahier quand cette case est décochée.
  options: [
    { id: 'methods', name: { fr: 'Méthodes colorées', en: 'Coloured methods' }, default: 'all',
      choices: [{ id: 'all', name: { fr: 'Toutes', en: 'All' } }, { id: 'best', name: { fr: 'La meilleure', en: 'The best' } },
        { id: 'none', name: { fr: 'Aucune', en: 'None' } }] },
    { id: 'mark', name: { fr: 'Marque', en: 'Mark' }, default: 'dot',
      choices: [{ id: 'dot', name: { fr: 'Pastille', en: 'Dot' } }, { id: 'rim', name: { fr: 'Contour', en: 'Rim' } }] },
    { id: 'palette', name: { fr: 'Couleurs', en: 'Colours' }, default: 'rg',
      choices: [{ id: 'rg', name: { fr: 'Vert → rouge', en: 'Green → red' } }, { id: 'cb', name: { fr: 'Pour daltoniens', en: 'Colour-blind' } }] },
    { id: 'panel', name: { fr: 'Le bloc en bas à gauche', en: 'The bottom-left block' }, default: true,
      hint: { fr: 'La lettre, la Mimic, l’Éther, les intuitions, la relique.', en: 'The letter, the Mimic, Ether, intuitions, the relic.' } },
    { id: 'letter', name: { fr: 'Prochaine lettre', en: 'Next letter' }, default: true, needs: 'panel' },
    { id: 'mimic', name: { fr: 'Mimic', en: 'Mimic' }, default: true, needs: 'panel' },
    { id: 'ether', name: { fr: 'Prochain Éther', en: 'Next Ether' }, default: true, needs: 'panel' },
    { id: 'ints', name: { fr: 'Intuitions', en: 'Intuitions' }, default: true, needs: 'panel' },
    { id: 'relic', name: { fr: 'Changer de relique', en: 'Change relic' }, default: true, needs: 'panel' },
    { id: 'durations', name: { fr: 'Durées', en: 'Durations' }, default: 'precise', needs: 'panel',
      choices: [{ id: 'precise', name: { fr: 'Précises', en: 'Precise' } }, { id: 'round', name: { fr: 'Arrondies', en: 'Rounded' } }] },
  ],

  // Les options, au chargement puis à chaque changement au cahier.
  onOptions(values) {
    mod.opt = values;
    document.documentElement.classList.toggle('better-rim', values.mark === 'rim');
    document.documentElement.classList.toggle('better-cb', values.palette === 'cb');
    mod.refresh();
  },

  // Le bloc replié ou non : gardé dans la sauvegarde. Jamais réglé : replié au téléphone, déplié ailleurs.
  save() {
    return mod.closed === undefined ? '' : String(mod.closed);
  },
  load(text) {
    if (text) mod.closed = text === 'true';
  },

  init() {
    const game = IdleBabel.game;
    const words = {
      fr: { letter: 'Lettre', mimic: 'Mimic', ether: 'Éther', ints: 'Intuitions', every: (d) => `En moyenne toutes les ${d}`,
        soon: (p) => `${p} % d'ici 10 min`, here: 'Elle est là !', locked: 'Pas encore débloquée', gain: (n) => `+${n} au prestige`,
        next: (d) => `Le suivant dans ${d}`, inK: (d) => `dans ~${d}`, others: (n) => `+${n} autres`, lvl: (n) => `niv. ${n}`,
        perS: 'pages/s', day: 'j', decimal: ',', year: 'plus d’un an', relic: 'Relique', none: 'Aucune',
        change: (d) => `Changer dans ${d}`, canChange: 'On peut en changer' },
      en: { letter: 'Letter', mimic: 'Mimic', ether: 'Ether', ints: 'Intuitions', every: (d) => `Every ${d} on average`,
        soon: (p) => `${p}% within 10 min`, here: 'It is here!', locked: 'Not unlocked yet', gain: (n) => `+${n} on prestige`,
        next: (d) => `Next one in ${d}`, inK: (d) => `in ~${d}`, others: (n) => `+${n} more`, lvl: (n) => `lvl ${n}`,
        perS: 'pages/s', day: 'd', decimal: '.', year: 'over a year', relic: 'Relic', none: 'None',
        change: (d) => `Change in ${d}`, canChange: 'You can change it' },
    };
    const say = () => words[IdleBabel.locale] ?? words.en;

    const style = document.createElement('style');
    style.textContent = `
      /* La couleur d'une méthode : une pastille à la pointe haute du sceau, ou le contour (le doré d'« achetable » reste en lueur). */
      .method-seal[data-better-rank]::after { content: ''; position: absolute; left: 50%; top: 5px; margin-left: -5px; width: 10px;
        height: 10px; border-radius: 50%; background: var(--better); box-shadow: 0 0 0 1.5px #150d07, 0 0 6px var(--better); z-index: 3; }
      .better-rim .method-seal[data-better-rank]::after { display: none; }
      .better-rim .method-seal[data-better-rank] .method-rim { background: var(--better) !important; }
      .method-seal[data-better-rank='0'] { --better: #5fd27a; }
      .method-seal[data-better-rank='1'] { --better: #e3cf4f; }
      .method-seal[data-better-rank='2'] { --better: #e8923a; }
      .method-seal[data-better-rank='3'] { --better: #d9534a; }
      /* Pour daltoniens (Okabe-Ito) : bleu, jaune, orange, vermillon. */
      .better-cb .method-seal[data-better-rank='0'] { --better: #56b4e9; }
      .better-cb .method-seal[data-better-rank='1'] { --better: #f0e442; }
      .better-cb .method-seal[data-better-rank='2'] { --better: #e69f00; }
      .better-cb .method-seal[data-better-rank='3'] { --better: #d55e00; }

      /* Le bloc, au-dessus de la version, dans le pied de l'écran. */
      .better-babel { order: -1; width: 300px; max-width: 100%; background: var(--panel); border: 1px solid var(--border); border-radius: 6px;
        backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); box-shadow: var(--shadow); font-size: 12.5px; line-height: 1.45;
        color: var(--ink); text-shadow: none; margin-bottom: 6px; }
      .better-babel[hidden] { display: none; }
      .better-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 10px; cursor: pointer; user-select: none; }
      .better-head b { font-weight: normal; color: var(--accent); letter-spacing: 0.08em; font-size: 12px; }
      .better-sum { color: var(--muted); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .better-chev { color: var(--muted); font-size: 11px; }
      .better-babel.closed .better-body { display: none; }
      .better-babel:not(.closed) .better-sum { display: none; }
      .better-body { padding: 2px 10px 9px; border-top: 1px solid rgba(201, 164, 106, 0.18); }
      .better-row { display: grid; grid-template-columns: 66px 1fr; gap: 6px; padding: 4px 0; }
      .better-row + .better-row { border-top: 1px dotted rgba(201, 164, 106, 0.15); }
      .better-row > span:first-child { color: var(--muted); }
      .better-row small { display: block; color: var(--muted); font-size: 11.5px; }
      .better-num { font-variant-numeric: tabular-nums; }
      .better-here { color: #f3b26b; }
      .better-ints { list-style: none; margin: 2px 0 0; padding: 0; }
      .better-ints li { display: grid; grid-template-columns: 1fr auto; column-gap: 8px; }
      .better-ints li + li { margin-top: 3px; }
      .better-ints li small { grid-column: 1 / -1; }
      .better-ints li > span:last-child { color: var(--accent); white-space: nowrap; }
      .better-ints li.later > span { color: var(--muted); }
      .better-ints em { color: var(--muted); font-style: normal; font-size: 11.5px; }
      @media (max-width: 760px) {
        footer:has(.better-babel) { flex-wrap: wrap; }
        .better-babel { width: 100%; }
      }
    `;
    document.head.append(style);

    // Durées : « 2 h 14 min 05 s », ou arrondies « 2 h 14 ».
    const duration = (seconds) => {
      if (!Number.isFinite(seconds)) return '—';
      const s = Math.max(0, Math.round(seconds));
      const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      const pad = (x) => String(x).padStart(2, '0');
      if (d >= 365) return say().year;
      if (d) return `${d} ${say().day} ${h} h`;
      if (mod.opt.durations === 'round') return h ? `${h} h ${pad(m)}` : m ? `${m} min` : `${sec} s`;
      if (h) return `${h} h ${pad(m)} min ${pad(sec)} s`;
      if (m) return `${m} min ${pad(sec)} s`;
      return `${sec} s`;
    };
    // Une moyenne, sans secondes : « 1 h », « 1,5 h », « 40 min ».
    const roughly = (s) => (s >= 3600 ? `${+(s / 3600).toFixed(1)} h`.replace('.', say().decimal) : `${Math.round(s / 60)} min`);

    // Le rythme de la dernière minute : pages lues depuis toujours (clics, bonus, Mimic compris) et Connaissance gagnée.
    const samples = [];
    const measure = () => {
      const now = Date.now();
      samples.push({ at: now, pages: IdleBabel.state.totalPagesRead, knowledge: IdleBabel.state.lifetimeKnowledge });
      while (samples.length > 2 && now - samples[0].at > 60_000) samples.shift();
    };
    const perSecond = (key) => {
      const first = samples[0], last = samples[samples.length - 1];
      const seconds = (last.at - first.at) / 1000;
      return seconds >= 5 ? (last[key] - first[key]) / seconds : undefined;
    };
    // Mesuré aussi onglet caché (le jeu y avance), une fois par seconde.
    let sinceSample = 1;
    IdleBabel.registerHook('tick', (seconds) => {
      sinceSample += seconds;
      if (sinceSample < 1) return;
      sinceSample = 0;
      measure();
    });

    // La ruche : attente + remboursement d'un exemplaire, max(0, prix − pages) ÷ production + prix ÷ gain ; le plus petit gagne.
    const colourHive = () => {
      const pages = IdleBabel.state.pages;
      const production = game.pagesPerSecond();
      const score = (m) => (m.rate > 0 ? (m.nextCost <= pages ? 0 : production > 0 ? (m.nextCost - pages) / production : Infinity) + m.nextCost / m.rate : Infinity);
      const ranked = game.methods().filter((m) => m.visible).sort((a, b) => score(a) - score(b));
      for (const seal of document.querySelectorAll('.method-seal[data-method]')) {
        const place = ranked.findIndex((m) => m.id === seal.dataset.method);
        const tier = place === 0 ? 0 : 1 + Math.min(2, Math.floor(((place - 1) / Math.max(1, ranked.length - 1)) * 3));
        const shown = place >= 0 && (mod.opt.methods === 'all' || (mod.opt.methods === 'best' && place === 0));
        if (!shown) delete seal.dataset.betterRank;
        else if (seal.dataset.betterRank !== String(tier)) seal.dataset.betterRank = String(tier);
      }
    };

    // Le bloc : posé dans le pied de l'écran du jeu (refait à chaque retour à l'écran).
    const make = (tag, className, text) => Object.assign(document.createElement(tag), { className, textContent: text ?? '' });
    const block = make('div', 'better-babel');
    const head = make('div', 'better-head');
    const sum = make('span', 'better-sum');
    const chev = make('span', 'better-chev');
    const body = make('div', 'better-body');
    head.append(make('b', '', 'BetterBabel'), sum, chev);
    block.append(head, body);
    const isClosed = () => mod.closed ?? window.matchMedia('(max-width: 760px)').matches;
    head.addEventListener('click', () => {
      mod.closed = !isClosed();
      write();
    });

    // Une ligne du bloc : son nom à gauche, ses éléments à droite (du texte, jamais du HTML venu d'ailleurs).
    const row = (name, ...parts) => {
      const line = make('div', 'better-row');
      const right = make('span', '');
      right.append(...parts);
      line.append(make('span', '', name), right);
      return line;
    };
    const small = (text, className = '') => make('small', className, text);

    const intuitionLine = (i, right, className = '') => {
      const li = make('li', className);
      const name = make('span', '', `${i.name} `);
      name.append(make('em', '', say().lvl(i.level + 1)));
      li.append(name, make('span', '', right));
      if (i.method) {
        const method = game.methods().find((m) => m.id === i.method);
        // Chaque niveau double la méthode : il rapporte ce qu'elle lit déjà.
        if (method && method.owned > 0) li.append(small(`+${IdleBabel.format(method.owned * method.rate)} ${say().perS}`));
      }
      return li;
    };

    const write = () => {
      const w = say();
      block.hidden = !mod.opt.panel;
      block.classList.toggle('closed', isClosed());
      chev.textContent = isClosed() ? '▸' : '▾';
      if (block.hidden) return;
      const rows = [];
      const letterIn = game.letterIn();
      const letterText = letterIn === undefined ? '—' : duration(letterIn);
      if (mod.opt.letter) rows.push(row(w.letter, make('span', 'better-num', letterText)));
      if (mod.opt.mimic) {
        const mimic = game.mimic();
        if (mimic.here) rows.push(row(w.mimic, make('span', 'better-here', w.here)));
        else if (!mimic.unlocked) rows.push(row(w.mimic, w.locked));
        else rows.push(row(w.mimic, w.every(roughly(mimic.every)), small(w.soon(Math.round((1 - Math.exp(-600 / mimic.every)) * 100)))));
      }
      const ether = game.ether();
      const pace = perSecond('pages') || game.pagesPerSecond();
      const etherIn = pace > 0 ? (ether.next - ether.total) / pace : Infinity;
      if (mod.opt.ether) rows.push(row(w.ether, w.gain(IdleBabel.format(ether.gain)), small(w.next(duration(etherIn)), 'better-num')));
      if (mod.opt.ints) {
        const knowledge = IdleBabel.state.knowledge;
        const open = game.intuitions().filter((i) => i.visible && i.nextPrice !== undefined).sort((a, b) => a.nextPrice - b.nextPrice);
        const affordable = open.filter((i) => i.nextPrice <= knowledge);
        const later = open.find((i) => i.nextPrice > knowledge);
        const list = make('ul', 'better-ints');
        for (const i of affordable.slice(0, 5)) list.append(intuitionLine(i, IdleBabel.format(i.nextPrice)));
        if (affordable.length > 5) {
          const more = make('li', '');
          more.append(make('em', '', w.others(affordable.length - 5)));
          list.append(more);
        }
        if (later) {
          const gained = perSecond('knowledge');
          list.append(intuitionLine(later, gained > 0 ? w.inK(duration((later.nextPrice - knowledge) / gained)) : IdleBabel.format(later.nextPrice), 'later'));
        }
        if (list.childElementCount > 0) rows.push(row(w.ints, list));
      }
      // La relique : seulement quand il y en a une autre à prendre (deux trouvées au moins).
      const relics = game.relics();
      if (mod.opt.relic && relics.found >= 2) {
        const wait = relics.changeIn > 0 ? small(w.change(duration(relics.changeIn)), 'better-num') : small(w.canChange, 'better-here');
        rows.push(row(w.relic, relics.name ?? w.none, wait));
      }
      body.replaceChildren(...rows);
      sum.textContent = `${w.letter} ${letterText} · ${w.ether} ${duration(etherIn)}`;
    };

    // À l'écran du jeu, une fois par seconde (et aussitôt quand l'écran vient d'être refait).
    let last = 0;
    let hive = null;
    mod.refresh = () => {
      last = 0;
    };
    IdleBabel.registerHook('draw', () => {
      const footer = document.querySelector('#app footer');
      const fresh = document.querySelector('.method-hive') !== hive || (footer && block.parentElement !== footer);
      if (!fresh && Date.now() - last < 1000) return;
      last = Date.now();
      hive = document.querySelector('.method-hive');
      if (footer && block.parentElement !== footer) footer.prepend(block);
      if (samples.length === 0) measure();
      colourHive();
      write();
    });
  },
});
})();
