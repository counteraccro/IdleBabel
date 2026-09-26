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
 * Brouillard de compréhension : au-delà de uClarity, la brume recouvre tout.
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
uniform float uClarity;
uniform float uTime;
uniform vec3 uFogColor;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
  return v;
}

float glassMask(vec3 color, float nearness) {
  float luma = dot(color, vec3(0.299, 0.587, 0.114));
  return (1.0 - smoothstep(0.03, 0.10, nearness)) * smoothstep(0.35, 0.6, luma);
}

void main() {
  vec2 uv = vec2(vUv.x, 1.0 - vUv.y) * uUvScale + uUvOffset;
  vec3 color = texture(uImage, uv).rgb;
  float nearness = texture(uDepth, uv).r;
  vec2 shifted = uv;

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

  // Obscurité (ou brume) qui ondule lentement : elle avale ce qui est plus loin que la compréhension.
  // La lumière de la fenêtre perce faiblement, comme une promesse.
  float wisps = fbm(shifted * 3.0 + vec2(uTime * 0.015, uTime * 0.006)) - 0.5;
  float distance = 1.0 - nearness;
  float fog = smoothstep(uClarity - 0.08, uClarity + 0.22, distance + wisps * 0.25);
  fog *= 1.0 - glass * 0.12;
  color = mix(color, uFogColor + wisps * 0.03, fog * 0.97);

  // Lumière vivante, grain et vignette.
  color *= 1.0 + 0.025 * sin(uTime * 1.7) * sin(uTime * 2.9);
  color += (hash(vUv * 900.0 + uTime) - 0.5) * 0.025;
  vec2 v = vUv - 0.5;
  color *= 1.0 - dot(v, v) * 0.9;
  outColor = vec4(color, 1.0);
}`;
