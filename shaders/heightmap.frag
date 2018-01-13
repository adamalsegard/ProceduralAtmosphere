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

  n += 1.0 * abs( snoise( coord ) );
  n += 0.5 * abs( snoise( coord * 2.0 ) );
  n += 0.25 * abs( snoise( coord * 4.0 ) );
  n += 0.125 * abs( snoise( coord * 8.0 ) );

  return n;
}

void main() {

  vec3 coord = vec3( vUV, -time );
  float n = genSurface( coord );

  gl_FragColor = vec4( vec3( n, n, n ), 1.0 );
}