/**
 * FRAGMENT SHADER
 * Compute normals from heightmap.
 */

precision highp float;

// Uniforms
uniform float height;
uniform vec2 resolution;
uniform sampler2D heightMap;

// Varying (in) variables from Vertex shader (normal.vert)
varying vec2 vUV;

void main() {

  float dx = 1.0 / resolution.x;
  float dz = 1.0 / resolution.y;

  float n0 = texture2D( heightMap, vUV ).x;
  
  float nU = texture2D( heightMap, vUV + vec2(dx, 0.0) ).x;
  float nV = texture2D( heightMap, vUV + vec2(0.0, dz) ).x;

  //vec3 nX = vec3(dx, nU - n0, 0.0);
  //vec3 nZ = vec3(0.0, nV - n0, dz);
  //gl_FragColor = vec4(normalize(cross(nZ, nX)) * 0.5 + 0.5, 1.0);
  
  // Transform to [0, 1]
  gl_FragColor = vec4( (0.5 * normalize(vec3(n0 - nU, n0 - nV, height)) + 0.5), 1.0 );

}