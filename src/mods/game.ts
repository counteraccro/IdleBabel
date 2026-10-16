import { TOOLS, type ToolId } from '../data/tools';
import { TECHNOLOGIES, type TechnologyId } from '../data/technologies';
import { toolUnlocked } from '../systems/sentences';
import { nextToolCost } from '../systems/tools';
import { pagesPerSecond, toolRate } from '../systems/production';
import { intuitionVisible, levelOf, maxLevel, nextPrice, technology } from '../systems/technologies';
import { letterCountdown } from '../systems/letter';
import { mimicEvery, mimicHere } from '../systems/mimic';
import { mimicUnlocked } from '../systems/etherium';
import { relicFound, relicWait } from '../systems/relics';
import { RELICS } from '../data/relics';
import { nextEtherPages, prestigeGain } from '../systems/prestige';
import { lotteryBlocked } from '../systems/lottery';
import { lotteryEffects } from '../systems/lotteryEffects';
import { goldenHere } from '../systems/goldenMimic';
import { t } from '../i18n';
import type { GameState } from '../core/state';

/** Une méthode de lecture, telle qu'un mod la voit. */
export interface ModMethod {
  id: ToolId;
  name: string;
  owned: number;
  /** Elle est retrouvée : son sceau est dans la ruche. */
  visible: boolean;
  /** Le prix du prochain exemplaire (Économie du geste et bonus en cours compris). */
  nextCost: number;
  /** Les pages par seconde d'un exemplaire de plus. */
  rate: number;
}

/** Une intuition du livre blanc, telle qu'un mod la voit. */
export interface ModIntuition {
  id: TechnologyId;
  name: string;
  level: number;
  /** Infinity : sans fin. */
  maxLevel: number;
  /** Le prix du niveau suivant en Connaissance ; undefined au bout, ou tant qu'elle ne peut pas se comprendre. */
  nextPrice: number | undefined;
  /** Elle a sa page dans le livre blanc. */
  visible: boolean;
  /** La méthode qu'elle double à chaque niveau, sinon null. */
  method: ToolId | null;
}

/**
 * Ce que le jeu calcule, prêté aux mods en lecture seule (IdleBabel.game, .ai/plan-better-babel.md §1) : les vraies
 * formules, pour qu'un mod ne les recopie pas (elles changent à chaque rééquilibrage). Rien ici ne modifie la partie.
 */
export const modGame = (state: GameState) => ({
  methods: (): ModMethod[] =>
    TOOLS.map((tool) => ({
      id: tool.id,
      name: t(`tools.${tool.id}.name`),
      owned: state.tools[tool.id],
      visible: toolUnlocked(state, tool.id),
      nextCost: nextToolCost(state, tool.id),
      rate: toolRate(state, tool.id),
    })),
  pagesPerSecond: (): number => pagesPerSecond(state),
  intuitions: (): ModIntuition[] =>
    TECHNOLOGIES.map(({ id }) => {
      const method = technology(id).tool ?? null;
      return {
        id,
        // Celle d'une méthode porte le nom de la méthode (comme sa page du livre blanc).
        name: method ? t(`tools.${method}.name`) : t(`whiteBook.intuitions.${id}.name`),
        level: levelOf(state, id),
        maxLevel: maxLevel(id),
        nextPrice: nextPrice(state, id),
        visible: intuitionVisible(state, id),
        method,
      };
    }),
  /** Secondes avant la prochaine lettre ; undefined tant qu'elle n'est pas tirée. Le compte ne descend qu'à l'écran du jeu. */
  letterIn: (): number | undefined => letterCountdown(),
  /** La Mimic : débloquée, là en ce moment, et toutes les combien de secondes en moyenne (elle n'a pas d'heure). */
  mimic: () => ({ unlocked: mimicUnlocked(state), here: mimicHere(state), every: mimicEvery(state) }),
  /** L'Éther : gain du prestige maintenant, pages lues depuis toujours, et pages qu'il faut pour un Éther de plus. */
  ether: () => ({ gain: prestigeGain(state), total: state.totalPagesRead, next: nextEtherPages(state) }),
  /**
   * Les reliques : celle qui agit (son id et son nom, null : aucune), combien sont trouvées, et les secondes avant de
   * pouvoir en changer (0 : on peut ; le délai compte en temps réel, absences comprises).
   */
  relics: () => ({
    active: state.relics.active,
    name: state.relics.active ? t(`ui.relics.names.${state.relics.active}`) : null,
    found: RELICS.filter(({ id }) => relicFound(state, id)).length,
    changeIn: relicWait(state) / 1000,
  }),
  /**
   * La Loterie : les jetons, ceux déjà joués, la machine bloquée (tous les bonus en cours), les bonus et malus en cours
   * (leur id, la méthode visée, les secondes qui leur restent), et les secondes qui restent à la Mimic dorée (0 : absente).
   */
  lottery: () => {
    const now = Date.now();
    return {
      tokens: state.lottery.tokens,
      draws: state.lottery.draws,
      blocked: lotteryBlocked(state, now),
      effects: lotteryEffects(state, now).map((effect) => ({
        id: effect.id,
        method: effect.method ?? null,
        left: (effect.end - now) / 1000,
      })),
      golden: goldenHere(state, now) ? (state.lottery.golden!.until - now) / 1000 : 0,
    };
  },
});

export type ModGame = ReturnType<typeof modGame>;
