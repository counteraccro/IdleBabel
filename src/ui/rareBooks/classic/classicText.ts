import { getLocale } from '../../../i18n';

/**
 * Le texte d'un classique du domaine public : ses chapitres, tels que dans l'édition d'origine (titre,
 * numéro, paragraphes ; un paragraphe avec des retours à la ligne est une strophe). Sans `label`, une partie
 * n'a que son titre (les contes d'un recueil). Rangé dans
 * public/texts/<id>.<langue>.json, chargé seulement quand on ouvre le livre (ce sont de gros fichiers).
 */
export interface ClassicChapter {
  label: string;
  title: string;
  paras: string[];
}

export interface ClassicText {
  chapters: ClassicChapter[];
}

/** Les textes en cours de chargement (une fois là, c'est classicArt.ts qui les garde, avec leur mise en page). */
const loading = new Map<string, Promise<ClassicText>>();

/** Le texte du livre `id` dans la langue du jeu (un seul chargement à la fois par livre et par langue). */
export const loadClassicText = (id: string, locale: string = getLocale()): Promise<ClassicText> => {
  const key = `${id}.${locale}`;
  let text = loading.get(key);
  if (!text) {
    text = fetch(`${import.meta.env.BASE_URL}texts/${key}.json`).then((response) => {
      if (!response.ok) throw new Error(`texte introuvable : ${key}`);
      return response.json() as Promise<ClassicText>;
    });
    // Gardé seulement le temps du chargement : sinon chaque texte lu resterait deux fois en mémoire, et
    // celui de l'autre langue pour toujours. Un échec (hors ligne…) sera retenté à la prochaine ouverture.
    const forget = (): void => void loading.delete(key);
    text.then(forget, forget);
    loading.set(key, text);
  }
  return text;
};
