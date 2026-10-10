import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders';
import { createPointer } from './pointer';
import { animationNow } from '../ui/animationClock';

export interface SceneOptions {
  image: TexImageSource & { width: number; height: number };
  depth: TexImageSource;
  /** Point de fuite de la pièce (centre de la fenêtre), en coordonnées d'image de 0 à 1. */
  vanishing: { x: number; y: number };
  /** De 0 à 1 : ce qu'il devine derrière la vitre. */
  beyond: () => number;
}

const compile = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader => {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
  return shader;
};

const createTexture = (gl: WebGL2RenderingContext, unit: number, source: TexImageSource): WebGLTexture => {
  const texture = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
};

/** Remplace l'image, sa profondeur et son point de fuite (changer de fond). */
export type SceneSwap = (scene: Pick<SceneOptions, 'image' | 'depth' | 'vanishing'>) => void;

/** Affiche la scène en plein écran derrière l'interface. Renvoie de quoi changer de fond, ou undefined sans WebGL2. */
export const startScene = (canvas: HTMLCanvasElement, options: SceneOptions): SceneSwap | undefined => {
  const gl = canvas.getContext('webgl2');
  if (!gl) return undefined;

  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
  gl.linkProgram(program);
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'aPosition');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniform = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1i(uniform('uImage'), 0);
  gl.uniform1i(uniform('uDepth'), 1);
  let image = options.image;
  let textures: WebGLTexture[] = [];
  const show = (scene: Parameters<SceneSwap>[0]): void => {
    textures.forEach((texture) => gl.deleteTexture(texture));
    textures = [createTexture(gl, 0, scene.image), createTexture(gl, 1, scene.depth)];
    gl.uniform2f(uniform('uVanishing'), scene.vanishing.x, scene.vanishing.y);
    image = scene.image;
  };
  show(options);

  const resize = (): void => {
    const ratio = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    // Recadrage « cover » : l'image remplit l'écran sans être déformée.
    const screenRatio = canvas.width / canvas.height;
    const imageRatio = image.width / image.height;
    const scale = screenRatio > imageRatio ? [1, imageRatio / screenRatio] : [screenRatio / imageRatio, 1];
    const [sx, sy] = scale;
    gl.uniform2f(uniform('uUvScale'), sx, sy);
    gl.uniform2f(uniform('uUvOffset'), (1 - sx) / 2, (1 - sy) / 2);
  };
  resize();
  window.addEventListener('resize', resize);

  const pointer = createPointer();
  // Cherchés une fois : ils changent à chaque image.
  const [uPointer, uBeyond, uTime] = ['uPointer', 'uBeyond', 'uTime'].map(uniform);
  const frame = (frameTime: number): void => {
    const time = animationNow(frameTime);
    pointer.step();
    gl.uniform2f(uPointer, pointer.current.x, pointer.current.y);
    gl.uniform1f(uBeyond, options.beyond());
    gl.uniform1f(uTime, time / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return (scene) => {
    show(scene);
    resize();
  };
};
