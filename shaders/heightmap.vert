/**
 * VERTEX SHADER
 * Computes a heightmap
 */

precision highp float;

// Uniforms
uniform vec2 scale;
uniform vec2 offset;

// Varying (out) to Fragment shader (heightmap.frag)
varying vec2 vUV;

void main() {

  vUV = uv * scale + offset;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}