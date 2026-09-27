/**
 * La feuille qui tourne, dessinée en WebGL, selon le modèle du papier qui s'enroule :
 * un pli oblique avance de la tranche vers le dos ; au-delà du pli, le papier s'enroule autour
 * d'un rouleau invisible puis repasse à l'envers au-dessus. Le coin du haut part en premier.
 *
 * Repère : l'unité est la hauteur de la couverture ; origine au centre, dos du livre en x = 0.
 * Livre en main : la page de droite va de x = 0 à 0,744 et de y = -0,465 à 0,465 (LEAF_GEOMETRY) ;
 * d'autres pages (carnet) donnent leurs propres proportions avec setGeometry. Le canevas déborde
 * de la page (voir .leaf-canvas) pour qu'elle puisse s'élever vers le lecteur.
 */
const VERTEX = `#version 300 es
in vec2 aUV;
uniform float uFold;
uniform float uRadius;
uniform float uAngle;
uniform float PAGE_WIDTH;
uniform float PAGE_HALF_HEIGHT;
uniform vec2 VIEW;
uniform float EYE;
// -1 : mouvement en reflet autour du dos (on revient en arrière, la page de gauche part vers la droite).
uniform float uMirror;
out vec2 vUV;
out vec3 vNormal;

const float PI = 3.14159265;

void main() {
  vec2 rest = vec2(aUV.x * PAGE_WIDTH, PAGE_HALF_HEIGHT - aUV.y * 2.0 * PAGE_HALF_HEIGHT);
  // Pli oblique : son sommet est plus proche du dos, le coin du haut (celui qu'on voit) s'enroule en premier.
  vec2 across = vec2(cos(uAngle), -sin(uAngle));
  float d = dot(rest - vec2(uFold, 0.0), across);
  vec2 onFold = rest - across * d;
  vec3 position;
  vec3 normal;
  if (d <= 0.0) {
    position = vec3(rest, 0.0);
    normal = vec3(0.0, 0.0, 1.0);
  } else if (uRadius <= 0.0001) {
    // Rouleau nul (fin de course) : la partie passée le pli est simplement retournée.
    position = vec3(onFold - across * d, 0.0);
    normal = vec3(0.0, 0.0, -1.0);
  } else if (d < PI * uRadius) {
    float a = d / uRadius;
    position = vec3(onFold + across * (uRadius * sin(a)), uRadius * (1.0 - cos(a)));
    normal = vec3(-across * sin(a), cos(a));
  } else {
    position = vec3(onFold - across * (d - PI * uRadius), 2.0 * uRadius);
    normal = vec3(0.0, 0.0, -1.0);
  }
  // En reflet, l'ordre des sommets s'inverse aussi : recto et verso s'échangent d'eux-mêmes.
  position.x *= uMirror;
  normal.x *= uMirror;
  vNormal = normal;
  vUV = aUV;
  float scale = EYE / (EYE - position.z);
  gl_Position = vec4(position.x * scale / VIEW.x, position.y * scale / VIEW.y, -position.z * 0.2, 1.0);
}`;

const FRAGMENT = `#version 300 es
precision highp float;
in vec2 vUV;
in vec3 vNormal;
uniform float uMirror;
uniform sampler2D uFront;
uniform sampler2D uBack;
out vec4 outColor;

void main() {
  vec3 light = normalize(vec3(-0.35, 0.45, 1.0));
  vec3 normal = normalize(vNormal);
  vec4 texel;
  float facing;
  if (gl_FrontFacing) {
    texel = texture(uFront, vUV);
    facing = dot(normal, light);
  } else {
    texel = texture(uBack, vec2(1.0 - vUV.x, vUV.y));
    facing = dot(-normal, light);
  }
  // En reflet, les faces sont inversées mais pas la lumière : la face vue reste éclairée de face.
  facing *= uMirror;
  // Bords transparents de la texture (papier déchiré) : rien n'est dessiné.
  if (texel.a < 0.5) discard;
  vec3 color = texel.rgb;
  float diffuse = max(facing, 0.0);
  // À plat (normale face au lecteur), la feuille a exactement la teinte des pages fixes ;
  // elle ne s'assombrit qu'en se courbant.
  float shade = min(1.0, 0.55 + 0.45 * diffuse / light.z);
  float sheen = pow(diffuse, 24.0) * 0.12;
  outColor = vec4(color * shade + sheen, 1.0);
}`;

/**
 * Pixels du canevas de la feuille par pixel CSS. Plus fin que l'écran : le canevas est ensuite incliné
 * avec le livre, le navigateur le réduit au lieu de l'étirer et la feuille reste nette. Une page
 * photographiée pour la feuille (voir pageSnapshot.ts) doit avoir la même finesse : plus fine, la carte
 * graphique la réduirait en la floutant, et l'écriture paraîtrait plus grasse que sur la page.
 */
export const leafPixelRatio = (): number => Math.min(window.devicePixelRatio * 1.5, 3);

/** Page de droite, et étendue du canevas autour du dos (voir le repère plus haut). */
export interface LeafGeometry {
  pageWidth: number;
  pageHalfHeight: number;
  view: { x: number; y: number };
  /** Distance de l'œil : plus il est loin, moins la feuille soulevée grossit en venant vers le lecteur. */
  eye: number;
}

/** Les pages du livre en main. */
export const LEAF_GEOMETRY: LeafGeometry = { pageWidth: 0.744, pageHalfHeight: 0.465, view: { x: 0.96, y: 0.8 }, eye: 3 };

/** Géométrie d'une page de proportions largeur / hauteur, avec la même marge de canevas que le livre en main. */
export const leafGeometryFor = (aspect: number): LeafGeometry => {
  const pageWidth = 2 * LEAF_GEOMETRY.pageHalfHeight * aspect;
  return {
    pageWidth,
    pageHalfHeight: LEAF_GEOMETRY.pageHalfHeight,
    view: { x: pageWidth + (LEAF_GEOMETRY.view.x - LEAF_GEOMETRY.pageWidth), y: LEAF_GEOMETRY.view.y },
    // Carnet posé à plat, vu de haut : la page qui se pose ne doit pas sembler grossir puis rétrécir.
    eye: 10,
  };
};

const COLUMNS = 64;
const ROWS = 40;
export interface LeafRenderer {
  /** Recto (page qui part) et verso (future page de gauche). */
  setPages: (front: TexImageSource, back: TexImageSource) => void;
  /** Dessine la feuille à un avancement de 0 (à plat à droite) à 1 (à plat à gauche). */
  draw: (progress: number) => void;
  /** Proportions de la page (par défaut celles du livre en main). */
  setGeometry: (geometry: LeafGeometry) => void;
  /**
   * Retour en arrière : le même mouvement en reflet autour du dos. La feuille part alors de la
   * gauche (verso visible) et se pose à droite (recto visible) quand l'avancement va de 0 à 1.
   */
  setMirrored: (mirrored: boolean) => void;
}

const compile = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader => {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
  return shader;
};

const createGrid = (): { uv: Float32Array; indices: Uint16Array } => {
  const uv: number[] = [];
  for (let row = 0; row <= ROWS; row++) {
    for (let column = 0; column <= COLUMNS; column++) uv.push(column / COLUMNS, row / ROWS);
  }
  const indices: number[] = [];
  const at = (column: number, row: number): number => row * (COLUMNS + 1) + column;
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      indices.push(at(column, row), at(column + 1, row), at(column, row + 1));
      indices.push(at(column + 1, row), at(column + 1, row + 1), at(column, row + 1));
    }
  }
  return { uv: new Float32Array(uv), indices: new Uint16Array(indices) };
};

/**
 * Forme de la feuille selon l'avancement (0 : à plat à droite, 1 : à plat à gauche) :
 * position du pli, rayon du rouleau (grand au milieu, nul aux extrémités) et inclinaison du pli.
 */
export const leafShape = (progress: number, pageWidth = LEAF_GEOMETRY.pageWidth): { fold: number; radius: number; angle: number } => {
  const lift = Math.sin(Math.PI * progress);
  return {
    fold: (pageWidth + 0.1) * (1 - progress),
    radius: 0.17 * lift ** 0.75,
    angle: -0.38 * lift,
  };
};

/** Renvoie null si la feuille ne peut pas être dessinée : le livre fonctionne alors sans animation. */
export const createLeafRenderer = (canvas: HTMLCanvasElement): LeafRenderer | null => {
  try {
    return setUpLeafRenderer(canvas);
  } catch (error) {
    console.error('Feuille animée indisponible, les pages changeront sans animation.', error);
    return null;
  }
};

const setUpLeafRenderer = (canvas: HTMLCanvasElement): LeafRenderer | null => {
  const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: true });
  if (!gl) return null;

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  gl.useProgram(program);

  const grid = createGrid();
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, grid.uv, gl.STATIC_DRAW);
  const attribute = gl.getAttribLocation(program, 'aUV');
  gl.enableVertexAttribArray(attribute);
  gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, grid.indices, gl.STATIC_DRAW);

  const textures = [gl.createTexture(), gl.createTexture()];
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1i(uniform('uFront'), 0);
  gl.uniform1i(uniform('uBack'), 1);
  gl.enable(gl.DEPTH_TEST);
  gl.frontFace(gl.CW);
  let pageWidth = LEAF_GEOMETRY.pageWidth;
  const setGeometry = (geometry: LeafGeometry): void => {
    pageWidth = geometry.pageWidth;
    gl.uniform1f(uniform('PAGE_WIDTH'), geometry.pageWidth);
    gl.uniform1f(uniform('PAGE_HALF_HEIGHT'), geometry.pageHalfHeight);
    gl.uniform2f(uniform('VIEW'), geometry.view.x, geometry.view.y);
    gl.uniform1f(uniform('EYE'), geometry.eye);
  };
  setGeometry(LEAF_GEOMETRY);
  const setMirrored = (mirrored: boolean): void => gl.uniform1f(uniform('uMirror'), mirrored ? -1 : 1);
  setMirrored(false);

  // Feuille vue en biais quand elle se courbe : sans filtrage anisotrope, la texture devient floue.
  const anisotropy = gl.getExtension('EXT_texture_filter_anisotropic');
  const maxAnisotropy = anisotropy ? (gl.getParameter(anisotropy.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number) : 0;

  const upload = (unit: number, source: TexImageSource): void => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    if (anisotropy) gl.texParameterf(gl.TEXTURE_2D, anisotropy.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, maxAnisotropy));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  const resize = (): void => {
    const ratio = leafPixelRatio();
    const width = Math.round(canvas.offsetWidth * ratio);
    const height = Math.round(canvas.offsetHeight * ratio);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  return {
    setPages: (front, back) => {
      resize();
      upload(0, front);
      upload(1, back);
    },
    draw: (progress) => {
      const shape = leafShape(progress, pageWidth);
      gl.uniform1f(uniform('uFold'), shape.fold);
      gl.uniform1f(uniform('uRadius'), shape.radius);
      gl.uniform1f(uniform('uAngle'), shape.angle);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.drawElements(gl.TRIANGLES, grid.indices.length, gl.UNSIGNED_SHORT, 0);
    },
    setGeometry,
    setMirrored,
  };
};
