/**
 * VERTEX SHADER
 * Atmospheric scattering
 */

precision highp float;

// Varying (out) to Fragment shader (sky.frag)
varying vec3 vWorldPos;

void main() {

  vWorldPos = (modelMatrix * vec4( position, 1.0 )).xyz;

  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}