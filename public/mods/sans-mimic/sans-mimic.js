// Sans Mimic : aucune Mimic n'apparaît plus dans la Bibliothèque.
// Le crochet « mimic » est appelé juste avant qu'une Mimic apparaisse : rendre false l'en empêche.
// Une Mimic déjà là reste (attrapez-la : elle rend ce qu'elle a avalé).
IdleBabel.registerMod('sans-mimic', {
  version: '1.0.0',
  init() {
    IdleBabel.registerHook('mimic', () => false);
  },
});
