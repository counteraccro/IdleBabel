import { SAVE_VERSION, createInitialState, type GameState } from './state';
import type { Locale } from '../i18n';
import { renameRareBooks } from './renamedRareBooks';
import { dropRemovedMethods } from './removedMethods';
import { refundEtheriumTrees } from './etheriumTrees';
import { refundClosedStars } from './closedStars';
import { refundCurtain } from './removedCurtain';
import { keepJackpotTome } from './tomeSources';
import { keepStarsLitSeal } from './starsLitSeal';
import { PAGES_PER_CLICK } from '../systems/click';
import { countSavedFinds } from './countedFinds';
import type { Find } from '../data/knowledge';
import { collectModData } from '../mods/registry';

const SAVE_KEY = 'idle-babel-save';

/** Une sauvegarde (JSON) lue en partie, ou null si elle n'en est pas une (ou d'une version que le jeu ne lit plus). */
const readSave = (raw: string, defaultLocale: Locale): GameState | null => {
  // Les trouvailles d'avant le 08/10, gardées une à une : comptées, puis plus jamais réécrites (core/countedFinds.ts).
  const { finds, ...saved } = JSON.parse(raw) as GameState & { finds?: Partial<Find>[] };
  if (saved.version === SAVE_VERSION) {
    const initial = createInitialState(defaultLocale);
    // Le sceau du tome 2 devenu celui du gros lot (core/tomeSources.ts) ; « Tout le ciel » sous son id fixe (core/starsLitSeal.ts).
    return keepStarsLitSeal(
      keepJackpotTome(
        refundClosedStars(
          refundEtheriumTrees(
            // Le Rideau, supprimé le 18/10 (core/removedCurtain.ts) : avant que ses étoiles inconnues ne soient oubliées.
            refundCurtain(
              dropRemovedMethods(
                renameRareBooks({
                  ...initial,
                  ...saved,
                  settings: { ...initial.settings, ...saved.settings },
                  stats: { ...initial.stats, ...saved.stats },
                  tools: { ...initial.tools, ...saved.tools },
                  methodPages: { ...saved.methodPages },
                  technologies: { ...saved.technologies },
                  // Parties d'avant la Réminiscence : le meilleur niveau, c'est celui d'aujourd'hui.
                  technologiesBest: { ...saved.technologies, ...saved.technologiesBest },
                  reminiscence: { ...initial.reminiscence, ...saved.reminiscence },
                  gear: { ...initial.gear, ...saved.gear },
                  wake: { ...initial.wake, ...saved.wake },
                  mimic: { ...initial.mimic, ...saved.mimic },
                  relics: { ...initial.relics, ...saved.relics, found: { ...saved.relics?.found } },
                  lottery: { ...initial.lottery, ...saved.lottery, effects: [...(saved.lottery?.effects ?? [])] },
                  atelier: {
                    ...initial.atelier,
                    ...saved.atelier,
                    drawers: { ...initial.atelier.drawers, ...saved.atelier?.drawers },
                    scrap: { ...initial.atelier.scrap, ...saved.atelier?.scrap },
                  },
                  puzzles: { ...initial.puzzles, ...saved.puzzles, grids: { ...saved.puzzles?.grids } },
                  tasks: {
                    ...initial.tasks,
                    ...saved.tasks,
                    bonus: { ...initial.tasks.bonus, ...saved.tasks?.bonus },
                    counters: { ...initial.tasks.counters, ...saved.tasks?.counters },
                    mods: { ...saved.tasks?.mods },
                  },
                  // Les nœuds des anciens arbres, ou les étoiles : core/etheriumTrees.ts ; les étoiles fermées : core/closedStars.ts.
                  etherium: saved.etherium ?? [],
                  findCounts: countSavedFinds(saved.findCounts, finds),
                  totalPagesRead: saved.totalPagesRead ?? saved.pages,
                  // Une partie d'avant le 14/10 a pu garder des décimales de Connaissance : arrondies au supérieur.
                  knowledge: Math.ceil(saved.knowledge ?? 0),
                  cycleKnowledge: Math.ceil(saved.cycleKnowledge ?? 0),
                  lifetimeKnowledge: Math.ceil(saved.lifetimeKnowledge ?? 0),
                  // Une partie d'avant ces compteurs part de ce qu'elle sait : les pages de ses méthodes, ses clics.
                  pagesByMethods:
                    saved.pagesByMethods ?? Object.values(saved.methodPages ?? {}).reduce((sum, read) => sum + (read ?? 0), 0),
                  pagesByHand: saved.pagesByHand ?? (saved.stats?.clicks ?? 0) * PAGES_PER_CLICK,
                  // Une partie d'avant les graines garde sa Bibliothèque.
                  seed: saved.seed ?? 0,
                }),
              ),
            ),
          ),
          // Une sauvegarde d'avant le 08/10 : son Âge Quantique est fermé (core/closedStars.ts).
          saved.findCounts === undefined,
        ),
      ),
    );
  }
  return null;
};

export const loadGame = (defaultLocale: Locale): GameState => {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const saved = raw ? readSave(raw, defaultLocale) : null;
    if (saved) return saved;
  } catch {
    // sauvegarde illisible ou stockage bloqué : nouvelle partie
  }
  return createInitialState(defaultLocale);
};

/** Après un import : plus rien n'est sauvegardé (ni la sauvegarde régulière, ni en quittant), la page se recharge. */
let savesLocked = false;

export const saveGame = (state: GameState): void => {
  if (savesLocked) return;
  collectModData(state);
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // stockage indisponible (navigation privée) : le jeu continue sans sauvegarde
  }
};

export const deleteSave = (): void => {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    // rien à faire
  }
};

/** La fin d'une sauvegarde exportée : une chaîne copiée à moitié se voit. */
const EXPORT_END = '!END!';

/**
 * La partie en une chaîne de caractères, à copier ailleurs (demande de l'auteur, 14/10) : le JSON de la
 * sauvegarde, en base64, suivi de !END! (comme Cookie Clicker).
 */
export const exportSave = (state: GameState): string => {
  collectModData(state);
  const bytes = new TextEncoder().encode(JSON.stringify(state));
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary) + EXPORT_END;
};

/** Le JSON d'une chaîne exportée (espaces, retours à la ligne ou encodage d'URL en trop, tolérés), ou null. */
const decodeExport = (text: string): string | null => {
  let code = text.replace(/\s+/g, '');
  if (code.includes('%')) code = decodeURIComponent(code);
  if (!code.endsWith(EXPORT_END)) return null;
  const binary = atob(code.slice(0, -EXPORT_END.length));
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
};

/**
 * Remplace la partie par celle d'une chaîne exportée : false si elle est illisible (rien n'a changé). Sinon,
 * elle est enregistrée et plus rien d'autre ne l'est : il reste à recharger la page.
 */
export const importSave = (text: string, defaultLocale: Locale): boolean => {
  try {
    const raw = decodeExport(text);
    if (!raw || !readSave(raw, defaultLocale)) return false;
    localStorage.setItem(SAVE_KEY, raw);
    savesLocked = true;
    return true;
  } catch {
    return false;
  }
};
