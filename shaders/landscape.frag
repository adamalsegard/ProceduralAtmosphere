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
uniform sampler2D tDiffuse2;
uniform sampler2D tDetail;
uniform sampler2D tNormal;
uniform sampler2D tSpecular;
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

// Fog:
//uniform vec3 fogColor;
//varying float fogDepth;
//uniform float fogNear;
//uniform float fogFar;


void main() {

  vec3 outgoingLight = vec3( 0.0 );	
  vec4 diffuseColor = vec4( diffuse, 1.0 );
  vec3 specularTex = vec3( 1.0 );

  vec2 uvOverlay = uRepeatOverlay * vUV;
  vec2 uvBase = uRepeatBase * vUV;

  vec3 normalTex = texture2D( tDetail, uvOverlay ).xyz * 2.0 - 1.0;
  normalTex.xy *= uNormalScale;
  normalTex = normalize( normalTex );

  vec4 colDiffuse1 = texture2D( tDiffuse1, uvOverlay );
  vec4 colDiffuse2 = texture2D( tDiffuse2, uvOverlay );

  diffuseColor *= mix ( colDiffuse1, colDiffuse2, 1.0 - texture2D( tDisplacement, uvBase ) );

  specularTex = texture2D( tSpecular, uvOverlay ).xyz;
  

  mat3 tsb = mat3( vTangent, vBinormal, vNormal );
  vec3 finalNormal = tsb * normalTex;

  vec3 normal = normalize( finalNormal );
  vec3 viewPosition = normalize( vViewPosition );

  vec3 totalDiffuseLight = vec3( 0.0 );
  vec3 totalSpecularLight = vec3( 0.0 );


  // Blinn-Phong (half-vector) for directional lights
  vec3 normLightDir =  lightDir / vec3(lightIntensity);
  vec3 halfVector = normalize( normLightDir + viewPosition );
  float dotNH = max( dot( normal, halfVector ), 0.0 );
  float dotNL = max( dot( normal, normLightDir ), 0.0 );
  float specularWeight = specularTex.r * max( pow( dotNH, shininess ), 0.0 );
  totalDiffuseLight = lightColor * dotNL;
  totalSpecularLight = specular * specularWeight * dotNL;
  
  outgoingLight += diffuseColor.xyz * ( ambient + totalDiffuseLight + totalSpecularLight );

  gl_FragColor = vec4( outgoingLight, diffuseColor.a );

  // Fog: 
  //float fogFactor = smoothstep( fogNear, fogFar, fogDepth );
  //gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
}