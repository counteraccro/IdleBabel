import * as THREE from 'three';

/** Durée du vol, de la pile jusqu'à la page du livre. */
const FLIGHT_MS = 950;
/** Au-delà, le départ noté est oublié (la page s'est ouverte autrement : lore, adresse tapée…). */
const STALE_MS = 1500;

/** Un objectif : sa focale et le point de l'écran en face duquel il regarde (pixels de la fenêtre). */
interface Lens {
  focal: number;
  x: number;
  y: number;
}

/**
 * Le livre tel qu'on le voyait dans la pile au moment du clic : où il était par rapport à la caméra de la
 * pile, et l'objectif de celle-ci (sa focale, et le milieu du petit canvas de la pile). La page du livre le
 * fait partir de là.
 */
export interface FlightStart {
  /** Le livre dans le repère de la caméra de la pile. */
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  lens: Lens;
  at: number;
}

/** L'objectif d'une caméra qui remplit `rect` (pixels de la fenêtre). */
const lensOf = (camera: THREE.PerspectiveCamera, rect: { left: number; top: number; width: number; height: number }): Lens => ({
  focal: rect.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))),
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

let pending: FlightStart | null = null;
/** Le vol en cours : où en est le livre (0 : dans la pile, 1 : posé dans la page), et s'il y retourne. */
let current: { amount: number; home: boolean } | null = null;

/** Où en est le livre qui vole (null : aucun vol). */
export const flightAmount = (): number | null => current?.amount ?? null;

/** Un livre retourne à la pile : il n'y est pas encore, sa place reste vide même si le jeu est revenu. */
export const flyingHome = (): boolean => current?.home ?? false;

/** La pile note le livre cliqué, juste avant d'ouvrir sa page. */
export const launchFlight = (root: THREE.Object3D, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement): void => {
  root.updateWorldMatrix(true, false);
  camera.updateMatrixWorld();
  const seen = camera.matrixWorldInverse.clone().multiply(root.matrixWorld);
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  seen.decompose(position, rotation, new THREE.Vector3());
  pending = { position, rotation, lens: lensOf(camera, canvas.getBoundingClientRect()), at: performance.now() };
};

/** La page du livre reprend le départ noté (une fois), s'il vient d'être noté. */
export const takeFlight = (): FlightStart | null => {
  const start = pending;
  pending = null;
  return start && performance.now() - start.at < STALE_MS ? start : null;
};

export interface Flight {
  /** Avance le vol ; false une fois arrivé (posé dans la page, ou revenu sur la pile). */
  step: (now: number) => boolean;
  /** Où en est le livre : 0 dans la pile, 1 posé dans la page. */
  readonly amount: number;
}

/**
 * Le livre part de la pile et glisse vers le lecteur en grandissant, jusqu'à sa place dans la page (le livre
 * à l'origine de la scène). Au départ, on le voit exactement comme la caméra de la pile le voyait : même
 * place par rapport à elle, même objectif (focale courte, regard centré sur la pile) ; à l'arrivée, comme la
 * caméra de la page le voit. Entre les deux, sa place et l'objectif passent de l'un à l'autre. Pendant le
 * vol, le canvas couvre toute la fenêtre (le livre part de l'en-tête, hors du cadre `frame` de la page).
 * `home` : le vol à l'envers, le livre retourne dans la pile (retour au jeu) ; la caméra garde son angle.
 */
export const createFlight = (start: FlightStart, root: THREE.Object3D, camera: THREE.PerspectiveCamera, frame: DOMRect, home = false): Flight => {
  camera.updateMatrixWorld();
  const rest = lensOf(camera, frame);
  // Le livre posé (à l'origine), vu de la caméra de la page.
  const restPosition = new THREE.Vector3();
  const restRotation = new THREE.Quaternion();
  camera.matrixWorldInverse.decompose(restPosition, restRotation, new THREE.Vector3());
  const seen = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  let amount = home ? 1 : 0;
  const place = (value: number): void => {
    amount = value;
    current = { amount: value, home };
    // Le livre, de sa place devant la caméra de la pile à sa place devant celle de la page.
    position.lerpVectors(start.position, restPosition, value);
    rotation.slerpQuaternions(start.rotation, restRotation, value);
    seen.compose(position, rotation, one).premultiply(camera.matrixWorld);
    seen.decompose(root.position, root.quaternion, root.scale);
    // L'objectif : la focale grandit d'un rapport constant (le livre grossit régulièrement), le regard glisse
    // du milieu de la pile au milieu de la page.
    const focal = start.lens.focal * (rest.focal / start.lens.focal) ** value;
    const x = start.lens.x + (rest.x - start.lens.x) * value;
    const y = start.lens.y + (rest.y - start.lens.y) * value;
    const near = camera.near / focal;
    camera.projectionMatrix.makePerspective(
      -x * near,
      (window.innerWidth - x) * near,
      y * near,
      -(window.innerHeight - y) * near,
      camera.near,
      camera.far,
    );
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  };
  place(amount);
  let began: number | null = null;
  /** Première image : le livre est dessiné une fois à son départ (shaders, textures envoyées à la carte). */
  let drawn = false;
  return {
    step: (now) => {
      if (!drawn) {
        drawn = true;
        place(amount);
        return true;
      }
      // Le temps du vol ne court qu'une fois ce premier dessin fait : sa lenteur ne mange pas le départ.
      began ??= now;
      const t = Math.min(1, (now - began) / FLIGHT_MS);
      // Il part vite et se pose en douceur ; au retour, il part doucement et ralentit aussi en se reposant
      // sur la pile (sans quoi il s'y arrête net, à pleine vitesse).
      place(home ? 1 - (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2) : 1 - (1 - t) ** 3);
      if (t < 1) return true;
      current = null;
      if (!home) {
        root.position.set(0, 0, 0);
        root.quaternion.identity();
        camera.updateProjectionMatrix();
      }
      return false;
    },
    get amount() {
      return amount;
    },
  };
};
