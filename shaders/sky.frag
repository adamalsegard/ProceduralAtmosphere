/**
 * FRAGMENT SHADER
 * Atmospheric scattering
 */

precision highp float;
#define PI 3.1415926535897932384626433832
#define ex 2.7182818284590452353602874713

// Uniform variables
uniform vec3 sunPos;
uniform float sunDistance;
uniform vec3 cameraPos;
// Mie Scattering parameters
uniform float mieCoefficient;
uniform float mieScatteringDir;
// Rayleigh Scattering coefficient
uniform float rayleighScatter;
// # Turbidity (Wikipedia)
// Turbidity is the cloudiness or haziness of a fluid caused by
// large numbers of individual particles that are generally
// invisible to the naked eye, similar to smoke in air.
// Measurement unit for turbidity is the Formazin Turbidity Unit (FTU).
// ISO refers to its units as FNU (Formazin Nephelometric Units).
uniform float turbidity;
// # Luminance (Wikipedia)
// Luminance is a photometric measure of the luminous intensity per unit area of
// light travelling in a given direction. It describes the amount of light that passes through,
// is emitted or reflected from a particular area, and falls within a given solid angle.
// SI unit is candela per square metre (cd/m2)
uniform float luminance;
uniform float sunExposure;

// Varying (in) variables from Vertex shader (sky.vert)
varying vec3 vWorldPos;

/**
 * CONSTANTS
 */
const vec3 upDir = vec3( 0.0, 1.0, 0.0 );

// Rayleigh coefficients
// This function is redundant, as the scatter coefficient has been pre-computed in the constant below.
// Can still be interesting to see though...
/* // Wavelength of used primaries, according to Preetham:
// (http://amd-dev.wpengine.netdna-cdn.com/wordpress/media/2012/10/ATI-LightScattering.pdf)
const vec3 lambda = vec3( 680E-9, 550E-9, 450E-9 );
const float nAir = 1.0003; // Refractive index of Air
const float NAir = 2.545E25; // Number of molecules per unit volume for Air
              // (at 288.15K and 1013mb (15 degrees celsius at sea level)) 
vec3 RayLeighScatterCoefficient(vec3 lambda) {
  return (8.0 * pow(PI, 3.0) * pow(pow(nAir, 2.0) - 1.0, 2.0) * (6.0 + 3.0 * pn)) / (3.0 * NAir * pow(lambda, vec3(4.0)) * (6.0 - 7.0 * pn));
}*/
const vec3 RayleighConst = vec3( 5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5 );

// Mie coefficients
// Same thing here, save the computations
/* // K coefficient for the primaries
const float v = 4.0;
const vec3 K = vec3( 0.686, 0.678, 0.666 );
MieConst = PI * pow( ( 2.0 * PI ) / lambda, vec3( v - 2.0 ) ) * K; */
const vec3 MieConst = vec3( 1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14 );

// Optical depth at zenith for molecules
const float rayleighZenithLength = 8.4E3;
const float mieZenithLength = 1.25E3;

// Used to calculate the solar disc:
// Equals: cos(sunSize*pi/180.0)
const float sunAngularDiameterCos = 0.999956676946448443553574619906976478926;

/**
 * HELPER FUNCTIONS
 */

// Calculate Phase for Rayleigh (simplified equation, as per Preetham)
float rayleighPhase( float cosTheta ) {
	return (3.0 / (16.0*PI)) * ( 1.0 + pow( cosTheta, 2.0 ) );
}

// Calculate Phase for Mie (full equation, as per Preetham)
float aerosolPhase( float cosTheta, float g ) {
	float gg = g*g;
	float denominator = 1.0 / ( (4.0*PI) * pow(1.0 + gg - 2.0*g*cosTheta, 1.5) );
	return pow(1.0 - g, 2.0) * denominator;
}

// Earth horizon cuttoff hack (Stolen)
const float cutoffAngle = 1.6110731556870734; // = PI / 1.95;
const float steepness = 1.5;

// Calculate the intensity of the sun and add a horizon cutoff!
float sunIntensity( float zenithAngleCos ) {
  zenithAngleCos = clamp( zenithAngleCos, -1.0, 1.0 ); // Just to be cautious.
  return sunExposure * max( 0.0, 1.0 - pow( ex, -( ( cutoffAngle - acos( zenithAngleCos ) ) / steepness ) ) );
}

// Calculate the total Mie scattering coefficient depending of the air's turbidity.
vec3 totalMie( float Turb ) {
  float c = ( 0.2 * Turb ) * 10E-18;
  return 0.434 * c * MieConst;
}

// Function to get a tonemapping with a filmic feel, as per Uncharted 2:
// http://filmicworlds.com/blog/filmic-tonemapping-operators/ 
const float A = 0.15;
const float B = 0.50;
const float C = 0.10;
const float D = 0.20;
const float E = 0.02;
const float F = 0.30;

vec3 tonemap( vec3 x ) {
	return ( (x * (A*x + C*B) + D*E) / (x * (A*x + B) + D*F) ) - E/F;
}

/**
 * MAIN FUNCTION
 */
void main() {

  // Normalize light and view directions.
  vec3 sunDir = normalize( sunPos );
  vec3 viewDir = normalize( vWorldPos - cameraPos );

  // Calculate the total exposure from the sun.
  float sunInt = sunIntensity( dot(sunDir, upDir) );

  // Calculate the fading of the sun (so it's more blue at the top!).
  float sunFade = 1.0 - clamp( 1.0 - exp(sunPos.y / sunDistance), 0.0, 1.0 );

  // Rayleigh scattering coefficient.
  float rayleighCoefficient = rayleighScatter - ( 0.0 * ( 1.0 - sunFade ) );


  /**
   * EXTINCTION (absorption + out-scattering)
   */
  
  // Rayleigh (Nitrogen) coefficients.
  vec3 totalRayleighCoeff = RayleighConst * rayleighCoefficient;

  // Mie (aerosol) coefficients.
  vec3 totalMieCoeff = totalMie( turbidity ) * mieCoefficient;


  // Optical length/depth/thickness.
  // (aka average atmospheric density across ray from point A to B multiplied by dist).
  // Weighting factor based on how many air particles there are in the path along the ray.
  // Usually broken up into segments, h is height of sample point. Scaled so 0 is sea level and 1 is top of atmosphere.
  // GPU-gems uses 0.25 = 25% the way up we have our average density. 

  // Use a cutoff angle at 90 to avoid singularity in next formula.
	float zenithAngle = acos( max( 0.0, dot( upDir, viewDir ) ) );
  // Unfortunately a lot of "magic constants" in this one that I can't find explanations for...
  float avgDensityHeight = 0.25;
	float denom = 1.0 / ( cos( zenithAngle ) + avgDensityHeight * pow( 93.885 - ( ( zenithAngle * 180.0 ) / PI ), -1.253 ) );
	float rayOpticalDepth = rayleighZenithLength * denom;
	float mieOpticalDepth = mieZenithLength * denom;

  // Calculate extinction/attenuation factor
	vec3 totExtinction = exp( -(totalRayleighCoeff*rayOpticalDepth + totalMieCoeff*mieOpticalDepth));


  /**
   * IN-SCATTERING
   */
  // Determines how much light is added to the ray through the atmosphere. 
  // Gets scaled by the phase function.

  // Calculate the angle between view direction and light direction.
	float cosTheta = dot( viewDir, sunDir );

  // Calculate the phase functions. (How much light is scattered towards the camera.)
  // For Rayleigh the g constant can be omitted for an approximation.
	float rayPhase = rayleighPhase( cosTheta * 0.5 + 0.5 ); // [0, 1]
	vec3 betaRayTheta = totalRayleighCoeff * rayPhase;

  // For Mie phase the g constant (mieScatteringDir) should be between [-0.75, -0.999] (according to GPU-gems).
	float miePhase = aerosolPhase( cosTheta, mieScatteringDir );
	vec3 betaMieTheta = totalMieCoeff * miePhase;


  /**
   * COMPOSITION
   */

  // Calculate the accumulated light (gather all scattered rays).
  vec3 accumulatedScattering =  (betaRayTheta + betaMieTheta) / (totalRayleighCoeff + totalMieCoeff);
	vec3 inLight = pow( sunInt * accumulatedScattering * (1.0 - totExtinction), vec3(1.5) );
	inLight *= mix( vec3(1.0), pow( sunInt * accumulatedScattering * totExtinction, vec3(0.5) ), 
                  clamp( pow( 1.0 - dot(upDir, sunDir), 5.0 ), 0.0, 1.0 ) );
	
  // Add a disc for the sun.
  vec3 lightSolarDisc = vec3(0.1) * totExtinction;
	float sundisc = smoothstep( sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta );
	lightSolarDisc += ( sunInt * 19000.0 * totExtinction ) * sundisc;

  // Continuing FilmicWorld's example for a tonemap (HDR hack).
	vec3 texColor = (inLight + lightSolarDisc) * 0.04 + vec3(0.0, 0.0003, 0.00075); // Reinhart tonemapping

  float exposureBias = log2( 2.0 / pow(luminance, 4.0) );
	vec3 curr = tonemap( exposureBias * texColor );
  vec3 whiteScale = 1.0 / tonemap(vec3(1000.0)); //Pre-calc: 1.0748724675633854;
	vec3 color = curr * whiteScale;

  // Gamma correction, adjust for monitor gamma of 2.2 and the fading of the sun.
	vec3 retColor = pow( color, vec3( 1.0 / (1.2 + (1.2 * sunFade) ) ) );

  // Return the final color.
	gl_FragColor = vec4( retColor, 1.0 );
}