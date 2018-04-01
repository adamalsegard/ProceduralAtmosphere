/**
 * VERTEX SHADER
 * Computes a procedurally generated landscape.
 */

precision highp float;

// Attributes
attribute vec4 tangent;

// Uniforms
uniform sampler2D tNormal;
uniform sampler2D tDisplacement;
uniform float uDisplacementScale;
uniform float uDisplacementBias;
uniform vec2 uRepeatBase;
uniform vec3 lightDir;
uniform vec3 cameraPos;

// Varying (out) to Fragment shader (landscape.frag)
varying vec3 vTangent;
varying vec3 vBinormal;
varying vec3 vNormal;
varying vec2 vUV;
varying vec3 vViewPosition;
varying vec3 vLightDir;

// Shadow + Fog:
//uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHTS ];
//varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHTS ];
//varying float fogDepth;

// Rotation with PI / 2.0 around x-axis to counter the landscape rot added later.
const mat3 rotMatForLandscape = mat3(1, 0, 0, // Column 1
                                    0, 0, 1, // Column 2 
                                    0, -1, 0); // Column 3

void main() {

  vec2 uvBase = uv * uRepeatBase;

  // Apply displacement generated from heightmap.
  vec3 displaceVertex = texture2D( tDisplacement, uvBase ).xyz;
  float displaceFinal = uDisplacementScale * displaceVertex.x + uDisplacementBias;
  vec3 displacedPosition = normal * displaceFinal + position;

  //vec4 worldPosition = modelMatrix * vec4( displacedPosition, 1.0 ); // For shadows
  vec4 mvPosition = modelViewMatrix * vec4( displacedPosition, 1.0 );

  // Calculate varying variables for tangent space.
  vec3 normalTex = texture2D( tNormal, uvBase ).xyz * 2.0 - 1.0;
  vNormal = normalize(normalMatrix * normalTex );
  //vNormal = normalize( normalMatrix * normal );
  vTangent = normalize( normalMatrix * tangent.xyz );
  vBinormal = cross( vNormal, vTangent ) * tangent.w;
  vBinormal = normalize( vBinormal );
  vUV = uv;
  vLightDir = vec3(modelViewMatrix * vec4( rotMatForLandscape * lightDir, 1.0 ) - mvPosition);
  vViewPosition = vec3(modelViewMatrix * vec4( rotMatForLandscape * cameraPos, 1.0 ) - mvPosition);

  gl_Position = projectionMatrix * mvPosition;

  // Shadow + Fog:
  /*for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
    vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * worldPosition;
  }
  fogDepth = -mvPosition.z;*/
}