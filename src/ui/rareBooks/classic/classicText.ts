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
  /** Une grande partie du livre (« SECONDE PARTIE ») : la numérotation des chapitres repart de un après elle. */
  part?: boolean;
  /**
   * Une histoire racontée dans un chapitre : elle ne s'ouvre pas sur une nouvelle page, son titre est imprimé
   * au fil du texte (style.inlineHeading), et elle est en retrait dans la table.
   */
  inline?: boolean;
  /** Une histoire sans titre imprimé (l'édition ne la nommait que dans sa table) : seulement dans la table. */
  quiet?: boolean;
}

export interface ClassicText {
  chapters: ClassicChapter[];
}

/** Les textes en cours de chargement (une fois là, c'est le livre qui les garde, avec leur mise en page). */
const loading = new Map<string, Promise<unknown>>();

/**
 * Le texte du livre `id` dans la langue du jeu, rangé dans public/texts/<id>.<langue>.json (un classique, le
 * livre-jeu) ; un seul chargement à la fois par livre et par langue.
 */
export const loadBookText = <Text>(id: string, locale: string = getLocale()): Promise<Text> => {
  const key = `${id}.${locale}`;
  let text = loading.get(key) as Promise<Text> | undefined;
  if (!text) {
    text = fetch(`${import.meta.env.BASE_URL}texts/${key}.json`).then((response) => {
      if (!response.ok) throw new Error(`texte introuvable : ${key}`);
      return response.json() as Promise<Text>;
    });
    // Gardé seulement le temps du chargement : sinon chaque texte lu resterait deux fois en mémoire, et
    // celui de l'autre langue pour toujours. Un échec (hors ligne…) sera retenté à la prochaine ouverture.
    const forget = (): void => void loading.delete(key);
    text.then(forget, forget);
    loading.set(key, text);
  }
  return text;
};

/** Le texte d'un classique. */
export const loadClassicText = (id: string, locale?: string): Promise<ClassicText> => loadBookText<ClassicText>(id, locale);
