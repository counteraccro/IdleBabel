export const VERTEX_SHADER = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

/**
 * La pièce est immobile ; seul le faux dehors derrière la vitre a de la profondeur (parallaxe lente).
 * Aux Âges suivants, on y devine la Bibliothèque qui se répète (uBeyond).
 * Carte de profondeur : 1 = proche, 0 = lointain.
 */
export const FRAGMENT_SHADER = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;

uniform sampler2D uImage;
uniform sampler2D uDepth;
uniform vec2 uUvScale;
uniform vec2 uUvOffset;
uniform vec2 uPointer;
uniform vec2 uVanishing;
uniform float uBeyond;
uniform float uTime;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float glassMask(vec3 color, float nearness) {
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  return (1.0 - smoothstep(0.03, 0.10, nearness)) * smoothstep(0.35, 0.6, luma);
}

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y) * uUvScale + uUvOffset;
  vec3 color = texture(uImage, uv).rgb;
  float nearness = texture(uDepth, uv).r;

  // Le faux dehors : seules les vitres (claires et les plus lointaines) ont de la profondeur,
  // les remplages et la pièce restent immobiles.
  float glass = glassMask(color, nearness);
  vec2 drift = uPointer * 0.006 + vec2(sin(uTime * 0.07), cos(uTime * 0.05)) * 0.003;
  vec3 outside = texture(uImage, uv + drift).rgb;
  float outsideGlass = glassMask(outside, texture(uDepth, uv + drift).r);
  color = mix(color, outside, glass * outsideGlass);

  // Âges suivants : il commence à deviner que la Bibliothèque se répète derrière la vitre.
  vec3 repeated = texture(uImage, uVanishing + (uv - uVanishing) * 3.2 + drift * 2.0).rgb;
  color = mix(color, mix(color, repeated * 1.35 + color * 0.35, 0.65), glass * uBeyond);

  // Lumière vivante, grain et vignette.
  color *= 1.0 + 0.025 * sin(uTime * 1.7) * sin(uTime * 2.9);
  color += (hash(vUv * 900.0 + uTime) - 0.5) * 0.025;
  vec2 v = vUv - 0.5;
  color *= 1.0 - dot(v, v) * 0.9;
  // Haut de l'écran assombri : le compteur et les livres rares s'y lisent mieux.
  color *= 1.0 - 0.55 * smoothstep(0.7, 1.0, vUv.y);
  outColor = vec4(color, 1.0);
}`;
