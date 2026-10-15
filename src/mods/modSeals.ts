import type { SealDef } from '../data/seals';
import type { GameState } from '../core/state';
import type { Locale } from '../i18n';

/** Un texte de mod : le même dans toutes les langues, ou un par langue ({ fr, en }). */
export type ModText = string | Partial<Record<Locale, string>>;

/** Ce qu'un mod donne pour un sceau à lui (IdleBabel.addSeal, ou la liste `seals` d'un mod .json). */
export interface ModSealInput {
  id: string;
  name: ModText;
  text: ModText;
  reached: (state: GameState) => boolean;
}

/** Le texte dans la langue voulue : sinon l'anglais, sinon le premier donné. */
export const modText = (text: ModText, locale: Locale): string =>
  typeof text === 'string' ? text : (text[locale] ?? text.en ?? Object.values(text)[0] ?? '');

const isText = (text: unknown): text is ModText =>
  typeof text === 'string' || (!!text && typeof text === 'object' && Object.values(text).every((value) => typeof value === 'string'));

/**
 * Les sceaux des mods (plan des mods, §4) : sur une planche « Mods » à la fin du livre étrange, qui n'existe qu'avec
 * eux. Ils ne comptent ni dans l'avancement du livre ni dans le bonus de trouvailles (+1 % par sceau).
 */
const seals: SealDef[] = [];

export const modSeals = (): readonly SealDef[] => seals;

/** L'identifiant du sceau dans la partie : préfixé du nom du mod (deux mods peuvent avoir un sceau « million »). */
export const modSealId = (mod: string, id: string): string => `mod:${mod}:${id}`;

/** Ajoute le sceau d'un mod ; refusé (false) s'il est mal formé ou déjà là. */
export const addModSeal = (mod: string, input: ModSealInput): boolean => {
  if (!input || typeof input.id !== 'string' || !input.id || !isText(input.name) || !isText(input.text)) return false;
  if (typeof input.reached !== 'function') return false;
  const id = modSealId(mod, input.id);
  if (seals.some((seal) => seal.id === id)) return false;
  const reached = input.reached;
  seals.push({
    id,
    plate: 'mods',
    text: id,
    mod: { name: input.name, text: input.text },
    reached: (state) => {
      try {
        return reached(state) === true;
      } catch {
        return false;
      }
    },
  });
  return true;
};

/** Tests : plus aucun sceau de mod. */
export const clearModSeals = (): void => {
  seals.length = 0;
};
