/** One full-screen triangle, no textures, particles, dependencies or readbacks. */
export const liquidVertex = `
attribute vec2 aPosition;
void main() { gl_Position = vec4(aPosition, 0.0, 1.0); }
`;

export const liquidFragment = `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uEnergy;
uniform vec4 uWaves[6];
uniform vec4 uHand;
uniform vec2 uDrift;
uniform float uPeach;

// Coordinates are in short-edge units: landscape never stretches the material.
vec2 world(vec2 uv) {
  return (uv * 2.0 - 1.0) * uResolution / min(uResolution.x, uResolution.y);
}

void main() {
  vec2 p = world(gl_FragCoord.xy / uResolution);
  float t = uTime * 0.075;
  vec2 q = p + uDrift * 0.035;
  q += 0.17 * vec2(sin(p.y * 1.8 + t), cos(p.x * 1.4 - t * 0.83));

  // Broad, slowly travelling folds provide a real surface even at rest.
  float a = q.x * 1.65 + q.y * 0.7 + t;
  float b = q.y * 1.9 - q.x * 0.65 - t * 0.71;
  float height = sin(a) * 0.11 + cos(b) * 0.08;
  vec2 slope = vec2(cos(a) * 0.1815 + sin(b) * 0.052,
                   cos(a) * 0.077 - sin(b) * 0.152);
  float disturbance = 0.0;

  for (int i = 0; i < 6; i++) {
    vec4 wave = uWaves[i];
    float age = max(0.0, uTime - wave.z);
    if (wave.w < 0.001 || age > 10.0) continue;
    vec2 d = p - world(wave.xy);
    float seed = float(i) * 2.399 + wave.z * 0.27;
    // Warped, asymmetric distance creates seismic folds, never perfect circles.
    d += 0.10 * vec2(sin(d.y * 3.1 + seed), sin(d.x * 2.7 - seed));
    d *= mat2(1.0, 0.14 * sin(seed), 0.12 * cos(seed), 0.88);
    float radius = max(length(d), 0.001);
    // Bound the center gradient: overlapping touch waves must never produce
    // a sharp spike or a bright pinhole on a small mobile framebuffer.
    vec2 direction = d / max(radius, 0.12);
    float angle = atan(d.y, d.x);
    float organic = 0.065 * sin(angle * 3.0 + seed + age * 0.23)
                  + 0.035 * sin(angle * 5.0 - seed);
    float front = radius + organic * smoothstep(0.05, 0.4, radius) - age * 0.43;
    float width = 0.24 + age * 0.065;
    float envelope = exp(-front * front / (width * width));
    float fade = exp(-age * 0.43) * smoothstep(0.0, 0.16, age)
                 * (1.0 - smoothstep(8.0, 10.0, age));
    float phase = front * 13.0 + 0.4 * sin(angle * 2.0 + seed);
    float amplitude = wave.w * uEnergy * 0.14 * fade;
    float fold = sin(phase) * envelope * amplitude;
    float derivative = (13.0 * cos(phase) - 2.0 * front / (width * width)
                       * sin(phase)) * envelope * amplitude;
    // The impact rises and settles beneath the travelling wave packet.
    float mound = exp(-radius * radius / 0.14) * sin(age * 4.2)
                  * exp(-age * 1.5) * wave.w * uEnergy * 0.23;
    height += fold + mound;
    slope += direction * (derivative - mound * radius / 0.07);
    disturbance += abs(fold) + abs(mound);
  }

  vec2 handDelta = p - world(uHand.xy);
  float handRadius = dot(handDelta, handDelta);
  float held = exp(-handRadius / 0.19) * uHand.z * uEnergy * 0.25;
  height += held;
  slope -= handDelta * held * 10.5;
  disturbance += abs(held);
  // Softly bound interference so many touches form folds instead of flashing.
  slope = slope / (1.0 + length(slope) * 0.4);
  vec3 normal = normalize(vec3(-slope, 1.0));
  vec2 refracted = q - slope * 0.42 + vec2(height * 0.32, -height * 0.24);

  // Peach / coral / cream marbling is sampled AFTER displacement.
  float ribbon = sin(refracted.x * 1.8 + refracted.y * 0.8 + t * 0.63
                 + 1.3 * sin(refracted.y * 1.4 - t * 0.8));
  float pool = cos(refracted.y * 1.6 - refracted.x * 0.65 - t * 0.47
               + sin(refracted.x * 1.2 + t) * 0.7);
  vec3 cream = vec3(1.0, 0.965, 0.912);
  vec3 peach = mix(vec3(0.985, 0.835, 0.790), vec3(0.995, 0.802, 0.701), uPeach);
  vec3 coral = vec3(0.955, 0.661, 0.600);
  vec3 rose = vec3(0.932, 0.746, 0.772);
  vec3 color = mix(peach, cream, smoothstep(-0.7, 0.85, ribbon));
  color = mix(color, coral, smoothstep(-0.35, 0.95, pool) * 0.30);
  color = mix(color, rose, smoothstep(0.35, 1.0, sin(refracted.x + refracted.y * 1.9)) * 0.16);

  // Wide reflections and narrow caustic crests reveal the displaced geometry.
  vec3 light = normalize(vec3(-0.45, 0.6, 1.3));
  float diffuse = dot(normal, light);
  float specular = pow(max(dot(reflect(-light, normal), vec3(0.0, 0.0, 1.0)), 0.0), 28.0);
  float fresnel = pow(max(0.0, 1.0 - normal.z), 2.0);
  float caustic = pow(max(0.0, 1.0 - abs(ribbon + height * 2.0) * 5.0), 3.0);
  color *= 0.94 + diffuse * 0.075;
  color += vec3(1.0, 0.96, 0.90) * (specular * 0.13 + fresnel * 0.16);
  color += caustic * (0.018 + min(disturbance, 0.3) * 0.18);
  color -= min(disturbance, 0.25) * vec3(0.10, 0.16, 0.17);
  // Subpixel dither prevents banding without a grain overlay or extra texture.
  // gl_FragCoord may be mediump even in a highp fragment shader. An unbounded
  // pixel dot product overflows 65504 on tall iPads, producing a black diagonal.
  // Keep both the dot product and hash below the mediump range on every viewport.
  vec2 grain = mod(gl_FragCoord.xy, vec2(64.0));
  float dither = fract(sin(dot(grain, vec2(12.9898, 78.233))) * 437.585);
  gl_FragColor = vec4(color + (dither - 0.5) / 255.0, 1.0);
}
`;
