import { FRAGMENT_SHADER, VERTEX_SHADER } from './shaders';
import { createPointer } from './pointer';

export interface SceneOptions {
  image: TexImageSource & { width: number; height: number };
  depth: TexImageSource;
  /** Point de fuite de la pièce (centre de la fenêtre), en coordonnées d'image de 0 à 1. */
  vanishing: { x: number; y: number };
  /** De 0 à 1 : jusqu'où le chercheur voit à travers la brume. */
  clarity: () => number;
  /** De 0 à 1 : ce qu'il devine derrière la vitre. */
  beyond: () => number;
  /** Couleur de ce qu'il ne comprend pas encore : obscurité (Âge Manuel) ou brume (Âges suivants). */
  fogColor: [number, number, number];
}


const compile = (gl: WebGL2RenderingContext, type: number, source: string): WebGLShader => {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader');
  return shader;
};

const createTexture = (gl: WebGL2RenderingContext, unit: number, source: TexImageSource): void => {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
};

/** Affiche la scène en plein écran derrière l'interface. Renvoie false si WebGL2 est indisponible. */
export const startScene = (canvas: HTMLCanvasElement, options: SceneOptions): boolean => {
  const gl = canvas.getContext('webgl2');
  if (!gl) return false;

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

  createTexture(gl, 0, options.image);
  createTexture(gl, 1, options.depth);
  const uniform = (name: string) => gl.getUniformLocation(program, name);
  gl.uniform1i(uniform('uImage'), 0);
  gl.uniform1i(uniform('uDepth'), 1);
  gl.uniform2f(uniform('uVanishing'), options.vanishing.x, options.vanishing.y);
  gl.uniform3fv(uniform('uFogColor'), options.fogColor);

  const resize = (): void => {
    const ratio = Math.min(window.devicePixelRatio, 2);
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    gl.viewport(0, 0, canvas.width, canvas.height);
    // Recadrage « cover » : l'image remplit l'écran sans être déformée.
    const screenRatio = canvas.width / canvas.height;
    const imageRatio = options.image.width / options.image.height;
    const scale = screenRatio > imageRatio ? [1, imageRatio / screenRatio] : [screenRatio / imageRatio, 1];
    const [sx, sy] = scale;
    gl.uniform2f(uniform('uUvScale'), sx, sy);
    gl.uniform2f(uniform('uUvOffset'), (1 - sx) / 2, (1 - sy) / 2);
  };
  resize();
  window.addEventListener('resize', resize);

  const pointer = createPointer();
  const frame = (time: number): void => {
    pointer.step();
    gl.uniform2f(uniform('uPointer'), pointer.current.x, pointer.current.y);
    gl.uniform1f(uniform('uClarity'), options.clarity());
    gl.uniform1f(uniform('uBeyond'), options.beyond());
    gl.uniform1f(uniform('uTime'), time / 1000);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return true;
};
