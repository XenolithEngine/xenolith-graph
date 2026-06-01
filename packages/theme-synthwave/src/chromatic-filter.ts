import { Filter, GlProgram } from 'pixi.js'

// Chromatic aberration filter — RGB channel split for a CRT/VHS feel. Verified against PIXI v8
// guides/components/filters: vertex uses filterVertexPosition + filterTextureCoord helpers built
// from the standard auto-supplied filter uniforms; fragment outputs premultiplied alpha (PIXI v8
// filter render textures are premultiplied — non-premultiplied output washes content to grey).
//
// Hardcoded strength (no uniform block) — simplest possible filter, fewer things to mis-bind.
// If we ever need runtime tuning, switch to a uniform block per PIXI's `resources: { …: { uX } }`
// pattern AFTER verifying the block binds correctly with a red-fill smoke test.

const vertex = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord(void) {
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
}
`

const fragment = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;

void main(void) {
    // Sample R, G, B at small horizontal offsets — classic chromatic-aberration: red leaks left,
    // blue leaks right. Strength is small enough that text stays legible.
    float S = 0.0035;
    float r = texture(uTexture, vTextureCoord + vec2( S, 0.0)).r;
    float g = texture(uTexture, vTextureCoord                ).g;
    float b = texture(uTexture, vTextureCoord - vec2( S, 0.0)).b;
    float a = texture(uTexture, vTextureCoord                ).a;

    // PIXI v8 filter render textures use premultiplied alpha — multiply RGB by A before output,
    // otherwise the canvas composites the wrong intensity and content washes to a muddy grey.
    finalColor = vec4(r * a, g * a, b * a, a);
}
`

export function createChromaticFilter(): Filter {
  return new Filter({
    glProgram: GlProgram.from({ vertex, fragment, name: 'chromatic-aberration' }),
    resources: {},
    // Padding so the offset reads from a slightly larger area than the input rect — without this
    // the RGB shift samples outside the filter texture and the edges go to black.
    padding: 4,
  })
}
