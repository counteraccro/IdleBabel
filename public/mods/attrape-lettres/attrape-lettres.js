// Attrape-lettres : chaque lettre qui s'échappe du livre est attrapée toute seule, comme d'un clic.
// Le crochet « letter » reçoit la lettre qui vient de paraître ; sa fonction catch() l'attrape.
// Les lettres du mot BABEL aussi (id « word ») : le mot s'écrit en entier.
IdleBabel.registerMod('attrape-lettres', {
  init() {
    IdleBabel.registerHook('letter', (letter) => {
      // Une seconde pour la voir monter, puis elle est prise.
      setTimeout(() => letter.catch(), 1000);
    });
  },
});
