/**
 * FRAGMENT SHADER
 * Computes a procedurally generated landscape.
 */

precision highp float;

// Uniforms
uniform vec3 ambient;
uniform vec3 diffuse;
uniform vec3 specular;
uniform float shininess;

uniform vec3 lightDir;
uniform vec3 lightColor;
uniform float lightIntensity;

uniform sampler2D tDiffuse1;
uniform sampler2D tDetail1;
uniform sampler2D tSpecular1;
uniform sampler2D tDiffuse2;
uniform sampler2D tDetail2;
uniform sampler2D tSpecular2;

uniform sampler2D tNormal;
uniform sampler2D tDisplacement;

uniform float uNormalScale;
uniform vec2 uRepeatOverlay;
uniform vec2 uRepeatBase;
uniform vec2 uOffset;

// Varying (in) variables from Vertex shader (landscape.vert)
varying vec3 vTangent;
varying vec3 vBinormal;
varying vec3 vNormal;
varying vec2 vUV;
varying vec3 vViewPosition;

// Fog: (for shadows we need even more)
//uniform vec3 fogColor;
//varying float fogDepth;
//uniform float fogNear;
//uniform float fogFar;

// Define the transpose of a matrix because WebGL is madly outdated...
highp mat3 transpose(in highp mat3 inMatrix) {
  highp vec3 i0 = inMatrix[0];
  highp vec3 i1 = inMatrix[1];
  highp vec3 i2 = inMatrix[2];

  highp mat3 outMatrix = mat3(
    vec3(i0.x, i1.x, i2.x),
    vec3(i0.y, i1.y, i2.y),
    vec3(i0.z, i1.z, i2.z)
    );
  return outMatrix;
}

void main() {

  // Declare accumulating variables.
  vec3 outgoingLight = vec3( 0.0 );	
  vec3 totalDiffuseLight = vec3( 0.0 );
  vec3 totalSpecularLight = vec3( 0.0 );
  vec4 diffuseColor = vec4( diffuse, 1.0 );
  vec3 combinedNormalTex = vec3( 1.0 );
  vec3 combinedSpecTex = vec3( 1.0 );

  // Calculate UV coordinates.
  vec2 uvOverlay = uRepeatOverlay * vUV;
  vec2 uvBase = uRepeatBase * vUV;

  // Sample diffuse, normal and specular textures.
  vec4 colDiffuse1 = texture2D( tDiffuse1, uvOverlay );
  vec4 colDiffuse2 = texture2D( tDiffuse2, uvOverlay );
  
  // Transform to [-1, 1] again
  vec3 normalTex1 = texture2D( tDetail1, uvOverlay ).xyz * 2.0 - 1.0;
  normalTex1.xy *= uNormalScale;
  normalTex1 = normalize( normalTex1 );
  vec3 normalTex2 = texture2D( tDetail2, uvOverlay ).xyz * 2.0 - 1.0;
  normalTex2.xy *= uNormalScale;
  normalTex2 = normalize( normalTex2 );

  vec3 specularTex1 = vec3( 1.0 );
  specularTex1 = texture2D( tSpecular1, uvOverlay ).xyz;
  vec3 specularTex2 = vec3( 1.0 );
  specularTex2 = texture2D( tSpecular2, uvOverlay ).xyz;

  // Mix all textures according to displacement.
  vec4 displaceSample = texture2D( tDisplacement, uvBase );
  diffuseColor *= mix ( colDiffuse1, colDiffuse2, 1.0 - displaceSample );  
  combinedNormalTex *= mix ( normalTex1, normalTex2, 1.0 - displaceSample.xyz );  
  combinedSpecTex *= mix ( specularTex1, specularTex2, 1.0 - displaceSample.xyz );  

  // Transform normals to model space.
  mat3 TBN = mat3( vTangent, vBinormal, vNormal );
  vec3 finalNormal = transpose(TBN) * combinedNormalTex;
  finalNormal = normalize( vNormal ); // TODO: Switch back after tangent's been fixed.
  

  // Blinn-Phong (half-vector) for directional lights.
  vec3 viewPosition = normalize( vViewPosition );
  vec3 normLightDir = lightDir / vec3(lightIntensity);
  vec3 halfVector = normalize( normLightDir + viewPosition );
  float dotNH = max( dot( finalNormal, halfVector ), 0.0 );
  float dotNL = max( dot( finalNormal, normLightDir ), 0.0 );
  float specularWeight = combinedSpecTex.r * max( pow( dotNH, shininess ), 0.0 );
  totalDiffuseLight = diffuse * dotNL;
  totalSpecularLight = specular * specularWeight;
  
  outgoingLight += diffuseColor.xyz * ( ambient + totalDiffuseLight + totalSpecularLight );

  gl_FragColor = vec4( outgoingLight, diffuseColor.a );

  // Fog: 
  //float fogFactor = smoothstep( fogNear, fogFar, fogDepth );
  //gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
}