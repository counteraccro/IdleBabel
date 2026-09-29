import * as THREE from 'three';

/** Le livre penche un peu de côté, comme tenu d'une main plus haute que l'autre (book.css). */
const ROLL = THREE.MathUtils.degToRad(-1.5);
/** Balancement des mains qui tiennent le livre : durée d'un cycle, comme le livre 2D (book.css). */
const SWAY_S = 7;
/** Livre refermé sur son dos : le chercheur le tourne pour le reposer, on voit la tranche des pages (radians). */
const TURN = -0.9;
/** Livre refermé : il se redresse un peu vers le lecteur. */
const LIFT = 0.25;
/** Livre reposé : il descend de tant sous la vue (unités de scène). */
const DROP = 1.6;

export interface HeldPoseState {
  /** Livre neuf fermé (1), posé sur sa moitié droite : recentré. 0 : ouvert. */
  closed: number;
  /** Livre terminé, refermé sur son dos (1), posé sur sa moitié gauche : recentré et tourné. */
  shut: number;
  /** Livre reposé, hors de la vue (1), ou entre les mains (0). */
  drop: number;
}

/**
 * Place les mains (le groupe qui porte le livre) : balancement léger, et gestes du chercheur quand il
 * referme un livre, le repose et en prend un autre.
 */
export const createHeldPose = (hands: THREE.Group, width: number) => {
  const state: HeldPoseState = { closed: 0, shut: 0, drop: 0 };
  let clock = 0;
  return {
    set: (change: Partial<HeldPoseState>): void => {
      Object.assign(state, change);
    },
    /** Avance le balancement de `dt` secondes (0 : figé) et place les mains. */
    update: (dt: number): void => {
      clock += dt;
      const phase = (2 * Math.PI * clock) / SWAY_S;
      const deg = THREE.MathUtils.degToRad;
      const { closed, shut, drop } = state;
      // Un livre fermé ne couvre que la moitié de la place : on le ramène au milieu.
      hands.position.set((width / 2) * (shut - closed), 0.006 * Math.sin(phase + 0.3) - DROP * drop, 0);
      hands.rotation.set(
        deg(0.9 * Math.sin(phase) + 0.4 * Math.sin(2 * phase)) - LIFT * shut - 0.4 * drop,
        deg(0.5 * Math.sin(phase + 1.3)) - TURN * shut,
        ROLL + deg(0.7 * Math.sin(phase + 0.6)),
      );
    },
  };
};
