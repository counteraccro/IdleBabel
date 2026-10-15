// Sans Mimic : aucune Mimic n'apparaît plus dans la Bibliothèque.
// Le crochet « mimic » est appelé juste avant qu'une Mimic apparaisse : rendre false l'en empêche.
// Une Mimic déjà là reste (attrapez-la : elle rend ce qu'elle a avalé).
IdleBabel.registerMod('sans-mimic', {
  init() {
    IdleBabel.registerHook('mimic', () => false);
  },
});
