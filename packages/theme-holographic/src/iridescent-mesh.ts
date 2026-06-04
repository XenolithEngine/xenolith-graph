import { Geometry, Mesh, Shader } from 'pixi.js'

// Real GLSL iridescent ring — PIXI v8 Mesh pipeline (mat3 2D transforms, individual uniforms
// inside a named UniformGroup). Mirrors the proven pattern in `@xenolithengine/theme-liquid-glass` —
// what works there works here.
//
// Renders a rounded-rectangle ring (SDF) whose hue rotates around the perimeter (atan2). A
// `uHueOffset` uniform is poked from outside per-frame, which drives the parallax animation —
// as the user pans the camera, the rainbow rotates around each node's border.

const vertex = /* glsl */`
in vec2 aPosition;
out vec2 vLocal;

uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

void main(void) {
    vLocal = aPosition;
    mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
    gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
}
`

const fragment = /* glsl */`
in vec2 vLocal;

uniform vec2  uSize;
uniform float uStrokeW;
uniform float uRadius;
uniform float uHueOffset;

// Signed distance to a rounded rect centred at uSize/2.
float sdRoundRect(vec2 p) {
    vec2 b = uSize * 0.5;
    vec2 q = abs(p - b) - (b - uRadius);
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - uRadius;
}

// HSV → RGB.
vec3 hsv(float h, float s, float v) {
    vec3 k = mod(vec3(5.0, 3.0, 1.0) + h * 6.0, 6.0);
    return v - v * s * clamp(min(k, 4.0 - k), 0.0, 1.0);
}

void main(void) {
    float d = sdRoundRect(vLocal);

    // Anti-aliased band: 1.0 just inside the outer edge, falling off to 0 by uStrokeW px in.
    float w = 1.0; // AA half-width in pixels
    float outer = 1.0 - smoothstep(-w, w, d);                // 1 inside the shape, 0 outside
    float inner = 1.0 - smoothstep(-w, w, d + uStrokeW);     // 1 past the inner edge, 0 within
    float band = outer * (1.0 - inner);

    if (band <= 0.001) discard;

    // Perimeter angle → hue. Centre coords for atan to read consistently around the rect.
    vec2 centred = vLocal - uSize * 0.5;
    float angle = atan(centred.y, centred.x);
    float hue = fract(angle / (2.0 * 3.1415926) + uHueOffset);
    vec3 col = hsv(hue, 1.0, 1.0);

    // White inner sheen (1 px just inside the rainbow) for a glass-edge highlight.
    float sheen = (1.0 - smoothstep(0.0, 1.5, abs(d + uStrokeW * 0.85))) * 0.55;
    vec3 finalCol = col + vec3(sheen);

    // PIXI v8 mesh blending — premultiplied alpha.
    finalColor = vec4(finalCol * band, band);
}
`

export interface IridescentMeshHandle {
  mesh: Mesh<Geometry, Shader>
  /** Per-frame uniform poke — drives the parallax animation. */
  setHueOffset: (hue: number) => void
  destroy: () => void
}

export function createIridescentMesh(w: number, h: number, radius: number, strokeW = 3): IridescentMeshHandle {
  const geometry = new Geometry({
    attributes: { aPosition: [0, 0, w, 0, w, h, 0, h] },
    indexBuffer: [0, 1, 2, 0, 2, 3],
  })

  const uniforms = {
    uSize:      { value: new Float32Array([w, h]), type: 'vec2<f32>' as const },
    uStrokeW:   { value: strokeW, type: 'f32' as const },
    uRadius:    { value: radius,  type: 'f32' as const },
    uHueOffset: { value: 0,       type: 'f32' as const },
  }

  const shader = Shader.from({
    gl: { vertex, fragment },
    resources: { iridescentUniforms: uniforms },
  })

  const mesh = new Mesh<Geometry, Shader>({ geometry, shader })
  mesh.label = `iridescent-${w}x${h}`
  // Decorative — must never be a hover/click target. Without this, the mesh's full quad becomes
  // a hit target alongside the body Graphics, and the editor's per-object pointer-over/out fires
  // as the cursor crosses the body↔mesh boundary inside the same node — the user sees a
  // pulsing hover state ("flicker every second").
  mesh.eventMode = 'none'

  return {
    mesh,
    setHueOffset(hue) { uniforms.uHueOffset.value = hue },
    destroy() {
      shader.destroy()
      geometry.destroy()
    },
  }
}
