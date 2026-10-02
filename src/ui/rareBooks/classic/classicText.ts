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

const loaded = new Map<string, Promise<ClassicText>>();

/** Le texte du livre `id` dans la langue du jeu (une seule fois par langue). */
export const loadClassicText = (id: string, locale: string = getLocale()): Promise<ClassicText> => {
  const key = `${id}.${locale}`;
  let text = loaded.get(key);
  if (!text) {
    text = fetch(`${import.meta.env.BASE_URL}texts/${key}.json`).then((response) => {
      if (!response.ok) throw new Error(`texte introuvable : ${key}`);
      return response.json() as Promise<ClassicText>;
    });
    // Un échec (hors ligne…) ne reste pas en cache : on réessaiera à la prochaine ouverture.
    text.catch(() => loaded.delete(key));
    loaded.set(key, text);
  }
  return text;
};
