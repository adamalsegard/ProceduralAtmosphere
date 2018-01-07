/**
 * @author Adam Alsegård / http://www.adamalsegard.se
 */

// Make sure that we cannot use undeclared variables etc.
('use strict');

/**
 * GET STUFF
 */
var isWebglEnabled = require('detector-webgl');
var THREE = require('three');
var glslify = require('glslify');

var datGUI = require('./static/js/dat.gui.min.js');
var OrbitControls = require('three-orbit-controls')(THREE);

// Check if browser supports WebGL before rendering anything.
if (!isWebglEnabled) {
  alert('WebGL is not supported on this browser! \n Please try another!');
}

/**
 * DECLARE VARIABLES
 */
var camera,
  orbitControl,
  scene,
  renderer,
  sky,
  sunSphere,
  angleIncrease = 0.0005,
  sunDist = 450000;

// Starting settings in GUI
var settingsMenu = {
  turbidity: 10,
  rayleigh: 2,
  mieCoefficient: 0.00002,
  mieScatteringDir: 0.758,
  luminance: 1,
  manualControl: true,
  verticalAngle: 0.0, // Inclination/elevation of the sun
  horizontalAngle: Math.PI*0.5, // Azimuthal angle
  sun: !true,
  angleStep: angleIncrease
};

/* Potential future setting
22.0,           // intensity of the sun
6371e3,         // radius of the planet in meters
6471e3,         // radius of the atmosphere in meters
vec3(5.5e-6, 13.0e-6, 22.4e-6), // Rayleigh scattering coefficient
21e-6,          // Mie scattering coefficient
8e3,            // Rayleigh scale height
1.2e3,          // Mie scale height
0.758           // Mie preferred scattering direction

Time speed-up, paus, slow-down
*/

// Set up listeners
document.addEventListener('DOMContentLoaded', onDocumentLoaded, false);
window.addEventListener('resize', onWindowResize, false);
window.addEventListener('error', onError);

/**
 * INIT FUNCTIONS
 */
function initAtmosphere() {
  // Add Sky
  var skyMat = new THREE.ShaderMaterial({
    vertexShader: glslify('./shaders/sky.vert'),
    fragmentShader: glslify('./shaders/sky.frag'),
    uniforms: {
      luminance: { value: settingsMenu.luminance },
      turbidity: { value: settingsMenu.turbidity },
      rayleigh: { value: settingsMenu.rayleigh },
      mieCoefficient: { value: settingsMenu.mieCoefficient },
      mieScatteringDir: { value: settingsMenu.mieScatteringDir },
      sunPosition: { value: new THREE.Vector3() }
    },
    side: THREE.BackSide
  });
  var skyGeo = new THREE.SphereBufferGeometry(1, 32, 32);
  sky = new THREE.Mesh(skyGeo, skyMat);
  sky.scale.setScalar(sunDist);
  scene.add(sky);

  // Add Sun Helper and hide it
  sunSphere = new THREE.Mesh(
    new THREE.SphereBufferGeometry(4000, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  sunSphere.visible = false;
  scene.add(sunSphere);
}

// Callback function for settings changes
function guiChanged() {
  var uniforms = sky.material.uniforms;
  uniforms.turbidity.value = settingsMenu.turbidity;
  uniforms.rayleigh.value = settingsMenu.rayleigh;
  uniforms.luminance.value = settingsMenu.luminance;
  uniforms.mieCoefficient.value = settingsMenu.mieCoefficient;
  uniforms.mieScatteringDir.value = settingsMenu.mieScatteringDir;

  if(settingsMenu.manualControl){
    var theta = settingsMenu.verticalAngle; // [-pi, pi]
    var phi = settingsMenu.horizontalAngle; // [-pi/2, pi/2]

    sunSphere.position.x = sunDist * Math.cos(phi);
    sunSphere.position.y = sunDist * Math.sin(phi) * Math.sin(theta);
    sunSphere.position.z = sunDist * Math.sin(phi) * Math.cos(theta);
    uniforms.sunPosition.value.copy(sunSphere.position);

    angleIncrease = 0;
  }
  else {
    angleIncrease = settingsMenu.angleStep;
  }
  
  sunSphere.visible = settingsMenu.sun;


  renderer.render(scene, camera);
}

// Create GUI for the settings menu
function initGUI() {
  var gui = new datGUI.GUI({
    autoPlace: false,
    width: 300,
    name: 'Settings'
  });

  gui.addFolder('Scattering params')
  gui.add(settingsMenu, 'turbidity', 1.0, 20.0, 0.1).onChange(guiChanged);
  gui.add(settingsMenu, 'rayleigh', 0.0, 4, 0.001).onChange(guiChanged);
  gui.add(settingsMenu, 'mieCoefficient', 0.0, 0.1, 0.001).onChange(guiChanged);
  gui.add(settingsMenu, 'mieScatteringDir', 0.0, 1, 0.001).onChange(guiChanged);
  gui.add(settingsMenu, 'luminance', 0.0, 2).onChange(guiChanged);
  
  gui.addFolder('Time & Sun placement')
  gui.add(settingsMenu, 'manualControl').onChange(guiChanged);
  gui.add(settingsMenu, 'verticalAngle', -Math.PI, Math.PI, 0.0001).onChange(guiChanged).listen();
  gui.add(settingsMenu, 'horizontalAngle', -0.5*Math.PI, 0.5*Math.PI, 0.0001).onChange(guiChanged);
  gui.add(settingsMenu, 'angleStep').onChange(guiChanged);
  gui.add(settingsMenu, 'sun').onChange(guiChanged);
  
  gui.addFolder('Landscape & cloud generation')

  document.body.appendChild(gui.domElement);
  gui.domElement.style.position = 'fixed';
  gui.domElement.style.left = '2em';
  gui.domElement.style.top = '2em';

  guiChanged();
}

/**
 * MAIN (RENDER) LOOP
 */
function renderLoop() {
  // Increase sun angle by time
  settingsMenu.verticalAngle += angleIncrease;
  var phi = settingsMenu.horizontalAngle += 0.001*angleIncrease
  sunSphere.position.x = sunDist * Math.cos(phi);
  sunSphere.position.y = sunDist * Math.sin(phi) * Math.sin(settingsMenu.verticalAngle);
  sunSphere.position.z = sunDist * Math.sin(phi) * Math.cos(settingsMenu.verticalAngle);
  var uniforms = sky.material.uniforms;
  uniforms.sunPosition.value.copy(sunSphere.position);

  renderer.render(scene, camera);
  requestAnimationFrame(renderLoop);
}

/**
 * MAIN (LOAD) FUNCTION
 */
function onDocumentLoaded() {
  // Set up the Scene
  scene = new THREE.Scene();
  var grid = new THREE.GridHelper(10000, 2, 0xffffff, 0xffffff);
  scene.add(grid);

  // Set up the Camera
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    10,
    2000000
  );
  camera.position.set(0, 10,-100); // Looks at origo -> make sure we see the sun at first

  // Set up the Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Enable shadows.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Set up navigation Controls
  orbitControl = new OrbitControls(camera, renderer.domElement);
  // NOTE: OrbitControl has a problem with its 'mouseup' event (it need to be added at scope level, not document)
  // I fixed this on a local level in three-orbit-controls/index.js but if one downloads this the
  // same problem will rise again!


  // Init all shaders!
  initAtmosphere();

  // Init settings menu
  initGUI();

  // Start render
  requestAnimationFrame(renderLoop);
}

/**
 * CALLBACK FUNCTIONS
 */

// Window resize callback
function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
}

// Error handling
function onError(e, url, line) {
  alert('Renderer encountered an error: \n' + e.message);
}
