# Contribuer à Idle Babel

Le jeu, son histoire et sa direction artistique appartiennent à son auteur ([@counteraccro](https://github.com/counteraccro)) :
les propositions de fonctionnalités se font par une *issue*, pour en parler avant. Les **mods**, eux, sont ouverts à tous.

## Mods

Un mod change un morceau du jeu. La documentation complète (l'API, les crochets, les mods sans code, des exemples
commentés) : **https://counteraccro.github.io/IdleBabel/mods/**.

Un mod chargé par son adresse ne demande rien à personne. Pour qu'il entre dans **la liste du jeu** (une case à cocher dans
le cahier d'options, servi par le jeu lui-même), ouvrez une *pull request* :

1. Un dossier `public/mods/<id>/`, où `<id>` est le nom du mod (minuscules, chiffres, tirets), avec :
   - le fichier du mod : `<id>.js`, qui commence par `IdleBabel.registerMod('<id>', …)`, ou `<id>.json` (`"id": "<id>"`) ;
   - un `README.md` court : ce qu'il fait, en français et en anglais ;
   - une capture (`capture.png`) si le mod change ce qu'on voit.
2. Sa ligne dans `public/mods/mods.json` :
   ```json
   {
     "id": "<id>",
     "name": { "fr": "…", "en": "…" },
     "description": { "fr": "Une ligne.", "en": "One line." },
     "author": "votre pseudo",
     "version": "1.0.0",
     "file": "<id>.js",
     "kind": "js"
   }
   ```
3. `npm test` passe : un test vérifie le registre (un nom unique, le fichier présent, les textes en français et en anglais).

### Les règles

- **Pas de réseau** : aucun `fetch`, `XMLHttpRequest`, `WebSocket`, aucun script ni `import()` venu d'ailleurs. Le test
  les cherche, mais c'est un garde-fou : chaque mod est **relu en entier** par l'auteur avant d'entrer dans la liste.
- **Pas de code minifié** : il doit se relire.
- **Pas de vraie personne** nommée ou visée, dans le code comme dans les textes.
- **Français et anglais** pour tout ce que le joueur lit.
- Un mod ne touche pas aux fichiers du jeu (`src/`) : s'il lui manque un crochet, ouvrez une *issue*.

Le mod reste à son auteur : il peut être mis à jour par une nouvelle *pull request*, ou retiré de la liste.

---

# Contributing to Idle Babel

The game, its story and its art direction belong to its author: feature ideas go through an issue first. **Mods** are open
to everyone. Documentation: **https://counteraccro.github.io/IdleBabel/mods/**.

To get a mod into **the in-game list**, open a pull request with a folder `public/mods/<id>/` (the mod file, a short
`README.md` in French and English, a screenshot if it changes what you see) and its line in `public/mods/mods.json`
(name and description in French and English, author, version, file, kind). `npm test` must pass.

Rules: no network (no `fetch`, `XMLHttpRequest`, `WebSocket`, no outside script or `import()`), no minified code, no real
person named or targeted, French and English for anything the player reads, no changes to the game's files (`src/`): if a
hook is missing, open an issue. Every mod is read in full by the author before it enters the list.
