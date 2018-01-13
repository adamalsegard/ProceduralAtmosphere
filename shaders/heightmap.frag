/**
 * FRAGMENT SHADER
 * Computes a heightmap
 */

precision highp float;
#pragma glslify: snoise = require(./noise/steguSimplex3D.glsl)

// Uniforms
uniform float time;

// Varying (in) variables from Vertex shader (heightmap.vert)
varying vec2 vUV;

float genSurface( vec3 coord ) {

  float n = 0.0;

  n += 0.7 * (snoise(coord));
  n += 0.4 * abs(snoise(coord * 3.0));
  n += 0.3 * abs(snoise(coord * 5.0));
  n += 0.2 * abs(snoise(coord * 10.0));

  return n;
}

void main() {

  vec3 coord = vec3( vUV, -time );
  float n = genSurface( coord );

  gl_FragColor = vec4( vec3( n, n, n ), 1.0 );
}