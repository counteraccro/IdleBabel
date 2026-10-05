// Lance le simulateur avec Node seul (il retire les types) : les imports du jeu n'ont pas d'extension, on ajoute « .ts ».
import { register } from 'node:module';

register('./resolve.mjs', import.meta.url);
